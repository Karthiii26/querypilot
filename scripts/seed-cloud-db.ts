import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function seedCloudDb() {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Error: SUPABASE_DB_URL is not defined in .env');
    process.exit(1);
  }

  console.log('Connecting to Cloud PostgreSQL Database...');
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('Connected successfully!');

    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    const seedPath = path.join(process.cwd(), 'database', 'seed.sql');

    console.log(`Executing schema DDL from ${schemaPath}...`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('Schema DDL executed successfully!');

    console.log(`Executing seed data from ${seedPath}...`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await client.query(seedSql);
    console.log('Seed data inserted successfully!');

    // Verify table counts
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\nCloud Database Tables:');
    for (const row of tableRes.rows) {
      const countRes = await client.query(`SELECT COUNT(*) FROM "${row.table_name}";`);
      console.log(` - ${row.table_name}: ${countRes.rows[0].count} rows`);
    }

    client.release();
    await pool.end();
    console.log('\nCloud DB deployment & seeding complete!');
  } catch (err: any) {
    console.error('Error seeding cloud database:', err.message || err);
    await pool.end();
    process.exit(1);
  }
}

seedCloudDb();
