# QueryPilot — Natural Language Database Analytics & BI Platform

> **Ask your database anything in plain English.**  
> QueryPilot is an enterprise-grade, privacy-first Text-to-SQL analytics system. It connects directly to PostgreSQL (including Supabase Cloud PostgreSQL), dynamically discovers relational schemas, constructs verified SQL queries using Gemini models, rigorously validates safety with AST analysis, and returns interactive data tables with natural language insights.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Features](#features)
4. [Quickstart (Local Development)](#quickstart-local-development)
5. [Database Deployment & Cloud Seeding](#database-deployment--cloud-seeding)
6. [Production Deployment](#production-deployment)
7. [Self-Correction & Safety Guardrails](#self-correction--safety-guardrails)
8. [Automated Benchmark Suite](#automated-benchmark-suite)

---

## Project Overview

QueryPilot bridges the gap between non-technical stakeholders and complex relational databases:

- **Cloud & Local PostgreSQL**: Supports Supabase Cloud PostgreSQL out of the box as well as local or external PostgreSQL databases.
- **Zero Hardcoded Schemas**: Automatically queries `information_schema` to inspect tables, columns, data types, primary keys, foreign keys, and live row counts at runtime.
- **Enterprise Read-Only Safety**: Parses generated SQL into Abstract Syntax Trees (AST) to block mutations (`DELETE`, `UPDATE`, `DROP`, `INSERT`, `ALTER`, etc.) before any query reaches the engine.
- **Self-Correction Engine**: If a generated query encounters a syntax or column error, QueryPilot feeds the database error message back into Gemini to fix the SQL automatically.
- **Modern Responsive Web UI**: Interactive visualization, SQL formatter, schema graphs, multi-user authentication, and export tools.

---

## Architecture Overview

```
 ┌─────────────────────────────────────────────────────────────┐
 │                      QueryPilot Web UI                      │
 │    Clean End-User Analytics • Interactive Data & Charts    │
 └──────────────────────────────┬──────────────────────────────┘
                                │ HTTP / REST API
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                     QueryPilot Server                       │
 │  ┌───────────────────────┐       ┌────────────────────────┐ │
 │  │ Dynamic Schema Engine │◄─────►│    SQL AST Validator   │ │
 │  │ (information_schema)  │       │  (Strict Read-Only)    │ │
 │  └───────────────────────┘       └────────────────────────┘ │
 │  ┌───────────────────────┐       ┌────────────────────────┐ │
 │  │    Gemini LLM RAG     │◄─────►│ Self-Correction Engine │ │
 │  │ (Natural Language RAG)│       │ (Retry on DB Error)    │ │
 │  └───────────────────────┘       └────────────────────────┘ │
 └──────────────────────────────┬──────────────────────────────┘
                                │ PostgreSQL Pool / SSL
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │               Supabase Cloud PostgreSQL DB                  │
 │  Admin & Auth DB • Primary Query Database                   │
 │  Tables: customers, orders, order_items, products,         │
 │          categories, payments, shipments, reviews           │
 └─────────────────────────────────────────────────────────────┘
```

---

## Quickstart (Local Development)

### 1. Configure Environment

Copy `.env.example` to `.env` and fill in your Gemini API key and Supabase DB connection URLs:

```env
# LLM Configuration
GEMINI_API_KEY=your_gemini_api_key_here
LLM_PROVIDER=gemini

# Supabase Admin & Query Databases
SUPABASE_ADMIN_DB_URL=postgresql://user:password@host:6543/postgres
SUPABASE_DB_URL=postgresql://user:password@host:6543/postgres

# Server Security
AUTH_SECRET=your_random_secret_string
```

### 2. Install Dependencies & Seed Database

```bash
# Install packages
npm install

# Seed Cloud Database with schema and sample data
npm run db:seed
```

### 3. Start Development Server

```bash
npm run dev
```

Open your browser at `http://localhost:3000`.

---

## Database Deployment & Cloud Seeding

QueryPilot includes an automated cloud seeding tool (`scripts/seed-cloud-db.ts`).

To initialize or reset your Cloud Supabase / PostgreSQL database:

```bash
npm run db:seed
```

This script will automatically:
1. Connect to your Cloud PostgreSQL instance.
2. Execute `database/schema.sql` to create all 8 core tables (`categories`, `customers`, `products`, `orders`, `order_items`, `payments`, `shipments`, `reviews`).
3. Execute `database/seed.sql` to insert full demonstration dataset.
4. Output row counts for each database table to verify deployment success.

---

## Production Deployment

### Option A: Docker Deployment (Recommended)

Build and run the production container:

```bash
# Build Docker image
docker build -t querypilot .

# Run Docker container
docker run -d -p 3000:3000 --env-file .env querypilot
```

### Option B: Node.js Production Build

```bash
# Build client and server bundles
npm run build

# Start production server
npm start
```

### Option C: Cloud Hosting (Render / Railway / Fly.io)

A `render.yaml` blueprint is included for 1-click deployment on Render:
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment Variables required: `GEMINI_API_KEY`, `SUPABASE_ADMIN_DB_URL`, `SUPABASE_DB_URL`, `AUTH_SECRET`.

---

## Self-Correction & Safety Guardrails

### Read-Only AST Enforcement
Every SQL query generated by the LLM is parsed into an Abstract Syntax Tree (AST). The validator enforces:
- Only read-only queries (`SELECT`, `WITH ... SELECT`) are permitted.
- DML statements (`INSERT`, `UPDATE`, `DELETE`, `MERGE`) are strictly blocked.
- DDL statements (`DROP`, `ALTER`, `CREATE`, `TRUNCATE`) are strictly blocked.
- Execution happens inside a `BEGIN READ ONLY` transaction with statement timeout safeguards.

### Automatic Self-Correction
If a query encounters a SQL error (such as an ambiguous column or invalid type cast):
1. QueryPilot intercepts the PostgreSQL error code and message.
2. It sends the question, invalid SQL, and error message back to Gemini.
3. The LLM produces a corrected query which is re-validated and executed automatically.

---

## License

MIT License.
