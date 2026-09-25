import { GoogleGenAI } from '@google/genai';
import { DatabaseSchemaInfo, TableSchema } from './types.js';

interface IndexedTableDoc {
  tableName: string;
  documentText: string;
  embedding?: number[];
  termFrequencies: Map<string, number>;
  magnitude: number;
}

export class SchemaRetrievalService {
  private indexedDocs: Map<string, IndexedTableDoc> = new Map();
  private isIndexed: boolean = false;
  private aiClient: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
  }

  /**
   * Builds the schema index whenever a database is connected or refreshed.
   */
  async indexSchema(schema: DatabaseSchemaInfo): Promise<void> {
    console.log(`[SchemaRetrievalService] Building schema vector index for ${schema.tables.length} tables...`);
    this.indexedDocs.clear();

    for (const table of schema.tables) {
      const docText = this.createTableDocText(table);
      const tf = this.computeTermFrequency(docText);
      const magnitude = this.computeMagnitude(tf);

      this.indexedDocs.set(table.table, {
        tableName: table.table,
        documentText: docText,
        termFrequencies: tf,
        magnitude
      });
    }

    this.isIndexed = true;
    console.log('[SchemaRetrievalService] Schema index ready.');
  }

  private createTableDocText(table: TableSchema): string {
    const colList = table.columns.map(c => `${c.name} (${c.type})`).join(', ');
    const pkList = table.primaryKeys.join(', ') || 'none';
    const fkList = table.foreignKeys
      .map(fk => `${fk.column} references ${fk.referencesTable}.${fk.referencesColumn}`)
      .join('; ') || 'none';

    // Extract semantic domain synonyms based on column names
    const synonyms: string[] = [];
    const allText = `${table.table} ${colList}`.toLowerCase();
    if (allText.includes('price') || allText.includes('amount') || allText.includes('total') || allText.includes('subtotal')) {
      synonyms.push('revenue', 'sales', 'money', 'spending', 'spent', 'cost', 'earnings', 'financials');
    }
    if (allText.includes('customer') || allText.includes('user') || allText.includes('client') || allText.includes('tier')) {
      synonyms.push('buyers', 'shopper', 'patron', 'membership', 'tier', 'demographic');
    }
    if (allText.includes('order') || allText.includes('purchase')) {
      synonyms.push('transactions', 'sales', 'cart', 'checkout', 'volume');
    }
    if (allText.includes('product') || allText.includes('item') || allText.includes('stock')) {
      synonyms.push('inventory', 'goods', 'merchandise', 'catalog');
    }
    if (allText.includes('rating') || allText.includes('review') || allText.includes('comment')) {
      synonyms.push('feedback', 'satisfaction', 'stars', 'score', 'complaints', 'testimonials');
    }
    if (allText.includes('shipment') || allText.includes('delivery') || allText.includes('tracking')) {
      synonyms.push('logistics', 'carrier', 'transit', 'fulfillment', 'dispatch');
    }
    if (allText.includes('payment') || allText.includes('method') || allText.includes('settled')) {
      synonyms.push('billing', 'credit card', 'paypal', 'apple pay', 'wire');
    }

    return `Table: ${table.table}.
Columns: ${colList}.
Primary Keys: ${pkList}.
Foreign Keys: ${fkList}.
Concepts and Synonyms: ${synonyms.join(', ')}.`;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1 && !STOP_WORDS.has(t));
  }

  private computeTermFrequency(text: string): Map<string, number> {
    const tokens = this.tokenize(text);
    const tf = new Map<string, number>();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) || 0) + 1);
    }
    return tf;
  }

  private computeMagnitude(tf: Map<string, number>): number {
    let sumSq = 0;
    for (const count of tf.values()) {
      sumSq += count * count;
    }
    return Math.sqrt(sumSq) || 1;
  }

  /**
   * Retrieves relevant tables and their foreign-key relationship bridge tables for a user question.
   */
  async retrieveRelevantSchema(
    question: string,
    allSchema: DatabaseSchemaInfo,
    topK: number = 4
  ): Promise<{ relevantTables: TableSchema[]; retrievedTableNames: string[]; promptContext: string }> {
    if (!this.isIndexed || this.indexedDocs.size === 0) {
      await this.indexSchema(allSchema);
    }

    const queryTf = this.computeTermFrequency(question);
    const queryMag = this.computeMagnitude(queryTf);

    const scores: { tableName: string; score: number }[] = [];

    for (const [tableName, doc] of this.indexedDocs.entries()) {
      let dotProduct = 0;
      for (const [term, qCount] of queryTf.entries()) {
        const docCount = doc.termFrequencies.get(term);
        if (docCount) {
          // Weight exact table name or column matches higher
          const weight = tableName.toLowerCase().includes(term) ? 2.5 : 1.0;
          dotProduct += qCount * docCount * weight;
        }
      }

      const cosine = dotProduct / (queryMag * doc.magnitude);
      scores.push({ tableName, score: cosine });
    }

    // Sort descending by relevance score
    scores.sort((a, b) => b.score - a.score);

    const selectedSet = new Set<string>();

    // Take topK directly, or at least the tables that have score > 0
    for (const item of scores) {
      if (selectedSet.size < topK && (item.score > 0 || selectedSet.size < 2)) {
        selectedSet.add(item.tableName);
      }
    }

    // Graph closure: add intermediate join bridge tables (e.g. if orders and products are picked, include order_items)
    const tableMap = new Map<string, TableSchema>(allSchema.tables.map(t => [t.table, t]));
    for (const t of allSchema.tables) {
      // If table t bridges two selected tables via FK, add it to ensure joinability
      if (!selectedSet.has(t.table) && t.foreignKeys.length >= 2) {
        const refs = t.foreignKeys.map(fk => fk.referencesTable);
        const refCount = refs.filter(r => selectedSet.has(r)).length;
        if (refCount >= 2) {
          selectedSet.add(t.table);
        }
      }
    }

    // Also include foreign key targets of selected tables so joins are valid
    for (const selectedName of Array.from(selectedSet)) {
      const table = tableMap.get(selectedName);
      if (table) {
        for (const fk of table.foreignKeys) {
          if (tableMap.has(fk.referencesTable)) {
            selectedSet.add(fk.referencesTable);
          }
        }
      }
    }

    const relevantTables = Array.from(selectedSet)
      .map(name => tableMap.get(name))
      .filter((t): t is TableSchema => Boolean(t));

    const retrievedTableNames = relevantTables.map(t => t.table);

    // Format concise prompt schema context
    const promptContext = this.formatSchemaForPrompt(relevantTables);

    return {
      relevantTables,
      retrievedTableNames,
      promptContext
    };
  }

  private formatSchemaForPrompt(tables: TableSchema[]): string {
    const lines: string[] = ['### RELATIONAL SCHEMA (PostgreSQL Dialect):\n'];

    for (const table of tables) {
      lines.push(`TABLE "${table.table}" (`);
      for (const col of table.columns) {
        const pk = col.isPrimaryKey ? ' [PRIMARY KEY]' : '';
        const nullability = col.isNullable ? '' : ' NOT NULL';
        lines.push(`  "${col.name}" ${col.type}${pk}${nullability},`);
      }
      if (table.foreignKeys.length > 0) {
        lines.push('  -- Foreign Keys:');
        for (const fk of table.foreignKeys) {
          lines.push(`  FOREIGN KEY ("${fk.column}") REFERENCES "${fk.referencesTable}"("${fk.referencesColumn}"),`);
        }
      }
      lines.push(');');

      // Explicit PK warning: prevents the LLM from defaulting to the "id" convention
      const pkCols = table.columns.filter(c => c.isPrimaryKey).map(c => `"${c.name}"`);
      if (pkCols.length > 0) {
        lines.push(`-- !! PRIMARY KEY of "${table.table}" is ${pkCols.join(', ')} — NOT "id". Use exact column names only.`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'of', 'for', 'with', 'to',
  'is', 'are', 'was', 'were', 'which', 'what', 'who', 'how', 'many', 'much',
  'show', 'list', 'get', 'give', 'me', 'find', 'all', 'our', 'from', 'by'
]);

export const retrievalService = new SchemaRetrievalService();

