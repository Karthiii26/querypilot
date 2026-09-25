import { GoogleGenAI } from '@google/genai';
import { QueryIntentCategory } from './types.js';

export interface IntentRoutingResult {
  intent: QueryIntentCategory;
  confidence: number;
  reasoning: string;
  conversationalResponse?: string;
  clarificationPrompt?: string;
  clarificationOptions?: string[];
}

function withTimeout<T>(promise: Promise<T>, ms: number = 6000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Intent classification timed out after ${ms}ms`)), ms)
    )
  ]);
}

/**
 * Robust heuristic/rule-based intent classifier.
 */
function classifyHeuristic(question: string, schemaSummary: string = ''): IntentRoutingResult | null {
  const q = question.trim();
  if (!q) {
    return {
      intent: 'CONVERSATIONAL',
      confidence: 1.0,
      reasoning: 'Empty prompt.',
      conversationalResponse: 'Hello! I am QueryPilot, your AI database assistant. How can I help you explore your data today?'
    };
  }

  const lower = q.toLowerCase();
  const cleaned = lower.replace(/[^a-z0-9\s]/g, '').trim();

  // 1. Flexible Conversational Regex & Greetings (matches hello, hellooo, helloooooooooooo, hi, hiii, hey, etc.)
  const isGreetingPattern = /^(h+e+l+o+|h+i+|h+e+y+|h+o+w+d+y+|greetings+|sup|whatsup|w+h+a+t+s+u+p+|good morning|good evening|good afternoon)/i.test(cleaned);
  const isGratitudePattern = /^(t+h+a+n+k+|thx|cheers)/i.test(cleaned);
  const isChitChatPattern = /^(how are you|hows it going|who are you|what can you do|what can u do|can you help me|help me|bye|goodbye)/i.test(cleaned);

  if (isGreetingPattern || isGratitudePattern || isChitChatPattern) {
    return {
      intent: 'CONVERSATIONAL',
      confidence: 1.0,
      reasoning: 'Matches conversational greeting or chit-chat pattern.',
      conversationalResponse: getConversationalReply(cleaned)
    };
  }

  // 2. Capability / Meta questions check (CONVERSATIONAL)
  if (
    lower.startsWith('what can you do') ||
    lower.startsWith('what can i ask') ||
    lower.includes('questions i can ask') ||
    lower.includes('sample questions') ||
    lower.startsWith('how does querypilot') ||
    lower.startsWith('explain how querypilot') ||
    lower.startsWith('who are you') ||
    lower === 'can you help me' ||
    lower === 'can you help me?' ||
    lower.includes('what can you do with my database')
  ) {
    return {
      intent: 'CONVERSATIONAL',
      confidence: 0.95,
      reasoning: 'User is asking about system capability or requesting sample questions.',
      conversationalResponse: getConversationalReply(cleaned)
    };
  }

  // 3. Pure vague count check (CLARIFICATION)
  if (cleaned === 'how many' || cleaned === 'count' || cleaned === 'how much') {
    const tableOptions = schemaSummary
      ? schemaSummary.split('\n').map(line => line.split(' ')[0]).filter(Boolean).slice(0, 3).map(t => `How many ${t} are there?`)
      : [];
    return {
      intent: 'CLARIFICATION',
      confidence: 0.9,
      reasoning: 'The question "How many?" is ambiguous without a target entity or context.',
      clarificationPrompt: 'Please specify what you would like to count:',
      clarificationOptions: tableOptions.length > 0 ? tableOptions : [
        'How many records are in our tables?',
        'What is the count of rows by category?'
      ]
    };
  }

  // 4. Database analytical query indicators check
  const dbDataQueryPatterns = [
    /how many\s+[a-z]+/i,
    /which\s+[a-z]+/i,
    /show\s+[a-z]+/i,
    /find\s+[a-z]+/i,
    /compare\s+[a-z]+/i,
    /list\s+[a-z]+/i,
    /tell me about the\s+[a-z]+/i,
    /are there any\s+[a-z]+/i,
    /what is the (average|total|count|sum|max|min|fee|price|cost)/i,
    /select\s+/i,
    /count\s+of\s+/i,
    /filter\s+/i,
    /where\s+/i,
    /order by/i,
    /group by/i
  ];

  for (const pattern of dbDataQueryPatterns) {
    if (pattern.test(q)) {
      return {
        intent: 'DATABASE_QUERY',
        confidence: 0.95,
        reasoning: 'Direct request for database entity data or aggregate metric.'
      };
    }
  }

  // 5. Schema Term Matching: check if question mentions any active database table or column name
  if (schemaSummary) {
    const words = cleaned.split(/\s+/);
    const schemaLower = schemaSummary.toLowerCase();
    const hasSchemaWord = words.some(w => w.length > 3 && schemaLower.includes(w));
    if (hasSchemaWord) {
      return {
        intent: 'DATABASE_QUERY',
        confidence: 0.85,
        reasoning: 'Matches table or column names present in the database schema.'
      };
    }
  }

  // 6. Default Fallback: If a question contains NO database verbs or schema words (e.g. "helloooooooooooo", "testing 123"), classify as CONVERSATIONAL!
  return {
    intent: 'CONVERSATIONAL',
    confidence: 0.9,
    reasoning: 'Query contains no database query indicators or schema terms.',
    conversationalResponse: getConversationalReply(cleaned)
  };
}

function getConversationalReply(queryText: string): string {
  if (/^(h+e+l+o+|h+i+|h+e+y+)/i.test(queryText)) {
    return "Hello! I'm QueryPilot, your AI database assistant. How can I help you explore your data today?";
  }
  if (queryText.includes('how are you')) {
    return "I'm doing great, thank you! Ready to answer any questions about your connected database.";
  }
  if (queryText.includes('thanks') || queryText.includes('thank')) {
    return "You're welcome! Let me know if you need any more insights from your database.";
  }
  if (queryText.includes('who are you')) {
    return "I am QueryPilot, an AI-powered database analytics assistant. I translate your natural language questions into safe, read-only SQL queries and visualize the results.";
  }
  if (queryText.includes('what can you do with my database') || queryText.includes('what can you do')) {
    return "I can help you analyze and query your PostgreSQL database! You can ask me to count records, summarize metrics, filter data, compare periods, and show tables. For example, try asking:\n• 'How many total records are there in our tables?'\n• 'Show recent entries from the database.'\n• 'Group records by status and count each.'";
  }
  if (queryText.includes('questions i can ask') || queryText.includes('sample questions')) {
    return "Here are some questions you can ask about your database:\n• How many total records are there?\n• What are the top 10 items by value?\n• Show entries created in the last 30 days\n• What is the distribution of records by status?";
  }
  if (queryText.includes('explain how querypilot')) {
    return "QueryPilot uses dynamic intent routing, dynamic schema discovery, read-only SQL generation, AST safety validation, and automated result analysis to safely query your Supabase cloud database.";
  }
  return "Hello! I am QueryPilot, your AI database assistant. Ask me questions about your connected database tables!";
}

export class QueryIntentRouter {
  private ai?: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
    }
  }

  async classifyIntent(question: string, schemaSummary?: string): Promise<IntentRoutingResult> {
    // 1. Run heuristic rule check first
    const heuristicResult = classifyHeuristic(question, schemaSummary);
    if (heuristicResult && heuristicResult.confidence >= 0.9) {
      console.log(`[IntentRouter] Heuristic matched intent "${heuristicResult.intent}" for query: "${question}"`);
      return heuristicResult;
    }

    // 2. LLM classification if Gemini key is available
    if (this.ai) {
      try {
        const prompt = `You are the Query Intent Router for QueryPilot, an AI database analytics system.
Your job is to classify whether a user's natural language request requires executing a database query (DATABASE_QUERY), is conversational/meta (CONVERSATIONAL), or is ambiguous and requires clarification (CLARIFICATION).

Schema Summary (available database tables):
${schemaSummary || 'No schema summary provided'}

User Request: "${question}"

CLASSIFICATION CATEGORIES:
1. "DATABASE_QUERY": The user wants actual data, counts, records, metrics, or comparisons from database tables.
Examples:
- "How many patients are there?" -> DATABASE_QUERY
- "Which doctor has the most appointments?" -> DATABASE_QUERY
- "Show completed appointments." -> DATABASE_QUERY
- "What is the average consultation fee?" -> DATABASE_QUERY
- "Which department has the most patients?" -> DATABASE_QUERY
- "Compare appointment counts by department." -> DATABASE_QUERY
- "Find patients older than 60." -> DATABASE_QUERY
- "Tell me about the patients" -> DATABASE_QUERY
- "Are there any patients with diabetes?" -> DATABASE_QUERY

2. "CONVERSATIONAL": Greetings, chit-chat, nonsense strings, questions about QueryPilot capabilities, app help, or requests for sample questions.
Examples:
- "Hello" / "helloooooooooooo" / "Hi" / "How are you?" / "Thanks" -> CONVERSATIONAL
- "Who are you?" -> CONVERSATIONAL
- "What can you do?" -> CONVERSATIONAL
- "Explain how QueryPilot works." -> CONVERSATIONAL
- "What can you do with my database?" -> CONVERSATIONAL
- "Give me some questions I can ask about my database" -> CONVERSATIONAL
- "Can you help me?" -> CONVERSATIONAL

3. "CLARIFICATION": The request is an incomplete or highly ambiguous database query.
Examples:
- "How many?" -> CLARIFICATION

Respond ONLY with valid JSON matching this schema:
{
  "intent": "DATABASE_QUERY" | "CONVERSATIONAL" | "CLARIFICATION",
  "confidence": 0.95,
  "reasoning": "1-sentence explanation of classification",
  "conversationalResponse": "string (REQUIRED if intent is CONVERSATIONAL: a helpful natural response)",
  "clarificationPrompt": "string (REQUIRED if intent is CLARIFICATION)",
  "clarificationOptions": ["option 1", "option 2"] (REQUIRED if intent is CLARIFICATION)
}`;

        const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const response = await withTimeout(
          this.ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: { responseMimeType: 'application/json' }
          }),
          5000
        );

        const text = response.text || '{}';
        const parsed: IntentRoutingResult = JSON.parse(text);
        if (parsed.intent) {
          console.log(`[IntentRouter] Gemini classified intent "${parsed.intent}" (${parsed.confidence}) for query: "${question}"`);
          return parsed;
        }
      } catch (err) {
        const errMsg = (err as any)?.status === 429 || String(err).includes('429')
          ? `[429 Quota Exceeded] Gemini API limit reached for model '${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}'.`
          : err;
        console.warn('[IntentRouter] LLM classification fallback to heuristic classification:', errMsg);
      }
    }

    // 3. Fallback heuristic if LLM is unavailable or failed
    if (heuristicResult) return heuristicResult;

    return {
      intent: 'CONVERSATIONAL',
      confidence: 0.9,
      reasoning: 'Non-database message classified as conversational.',
      conversationalResponse: getConversationalReply(question.toLowerCase())
    };
  }
}

export const intentRouter = new QueryIntentRouter();
