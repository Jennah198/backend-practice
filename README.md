# EventPulse — The 100M Row Reality Check

**How does PostgreSQL behave as an event-log database grows from 1 million to 100 million records?**

EventPulse is a database performance engineering project exploring bulk data insertion, SQL query optimization, indexing, and storage overhead using PostgreSQL and Node.js.

The project generates a large event dataset, benchmarks different insertion strategies, measures query latency at multiple scales, and investigates PostgreSQL execution plans to understand how database design affects performance.

> **Current milestone:** 100 million records successfully generated, indexed query benchmarks completed, and index storage analyzed.

## Table of Contents

- [EventPulse — The 100M Row Reality Check](#eventpulse--the-100m-row-reality-check)
  - [Table of Contents](#table-of-contents)
  - [Project Objectives](#project-objectives)
  - [Technology Stack](#technology-stack)
  - [Architecture](#architecture)
  - [Database Schema](#database-schema)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [1. Clone the repository](#1-clone-the-repository)
    - [2. Install dependencies](#2-install-dependencies)
    - [3. Configure environment variables](#3-configure-environment-variables)
    - [4. Start PostgreSQL](#4-start-postgresql)
    - [5. Start the API](#5-start-the-api)
  - [API Endpoints](#api-endpoints)
  - [Insertion Strategies](#insertion-strategies)
    - [1. Sequential INSERT](#1-sequential-insert)
    - [2. Batch INSERT](#2-batch-insert)
    - [3. PostgreSQL COPY](#3-postgresql-copy)
    - [Insertion benchmark results](#insertion-benchmark-results)
  - [Dataset Scaling](#dataset-scaling)
    - [Verified milestones](#verified-milestones)
  - [Query Performance](#query-performance)
    - [Query 1 — Events by user](#query-1--events-by-user)
    - [Query 2 — Recent events](#query-2--recent-events)
    - [Benchmark results](#benchmark-results)
  - [Indexing Experiments](#indexing-experiments)
    - [User lookup index](#user-lookup-index)
    - [Timestamp index](#timestamp-index)
    - [Execution plans at 100M](#execution-plans-at-100m)
  - [Storage Analysis](#storage-analysis)
  - [Benchmark Methodology](#benchmark-methodology)
  - [Key Findings](#key-findings)
  - [Project Structure](#project-structure)
  - [Limitations and Future Work](#limitations-and-future-work)
  - [Conclusion](#conclusion)

## Project Objectives

EventPulse was built to investigate several practical database engineering questions:

1. How much faster can batch insertion and PostgreSQL `COPY` be compared with sequential inserts?
2. How does query latency behave as a dataset grows from 1M to 100M records?
3. How do database indexes improve specific query patterns?
4. How can PostgreSQL execution plans explain query performance?
5. How much storage do indexes consume at large data volumes?
6. What trade-offs exist between read performance, storage consumption, and write overhead?

The objective is not simply to generate 100 million rows, but to understand the engineering decisions that influence database performance.

## Technology Stack

| Technology | Purpose |
|---|---|
| Node.js | Backend runtime and benchmark scripts |
| Express.js | HTTP API |
| PostgreSQL 16 | Relational database |
| Docker | Isolated PostgreSQL environment |
| `pg` | Node.js PostgreSQL client and connection pooling |
| `pg-copy-streams` | Streaming bulk insertion with PostgreSQL `COPY` |
| `dotenv` | Environment-based configuration |
| `nodemon` | Development server reloading |
| `node:test` | Automated testing |
| Supertest | HTTP endpoint testing |
| Git and GitHub | Version control and project hosting |

## Architecture

The application follows a simple backend-to-database architecture:

```text
Client
  |
  v
Express API
  |
  v
Routes and Controllers
  |
  v
Services
  |
  v
PostgreSQL Connection Pool
  |
  v
PostgreSQL Database
  |
  +-- events table
  +-- primary key index
  +-- user lookup index
  +-- timestamp index
```

The backend separates request handling from database operations. Dedicated scripts and benchmarks handle data generation and performance measurement.

## Database Schema

The primary table is `events`.

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT | Unique event identifier and primary key |
| `user_id` | BIGINT | User associated with the event |
| `event_name` | VARCHAR(255) | Name of the recorded action |
| `created_at` | TIMESTAMPTZ | Event timestamp |
| `country` | VARCHAR(100) | Optional country attribute |
| `metadata` | JSONB | Optional structured event metadata |

Example event:

```json
{
  "user_id": 500,
  "event_name": "page_view",
  "country": "Ethiopia",
  "metadata": {
    "device": "mobile"
  }
}
```

The `JSONB` column provides flexibility for additional event attributes without requiring a new table column for every possible property.

## Getting Started

### Prerequisites

- Node.js and npm
- Docker
- Git
- Basic familiarity with SQL and the terminal

### 1. Clone the repository

```bash
git clone https://github.com/Jennah198/eventpulse-100m.git
cd eventpulse-100m/app/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file inside `app/backend`:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eventpulse
DB_USER=eventpulse
DB_PASSWORD=your_local_password
```

Use your actual local database credentials. Do not commit `.env` or expose database passwords.

### 4. Start PostgreSQL

If you are creating a new development environment, an example container setup is:

```bash
docker run --name eventpulse-postgres \
  -e POSTGRES_DB=eventpulse \
  -e POSTGRES_USER=eventpulse \
  -e POSTGRES_PASSWORD=your_local_password \
  -p 5432:5432 \
  -d postgres:16
```

This creates a new, empty development database. If you already have the EventPulse container and dataset, **do not run this command**; use your existing container.

Ensure the `events` table and required indexes have been created before running the backend or benchmark scripts. The repository's schema setup or SQL migration should be used if available.

### 5. Start the API

```bash
npm run dev
```

The development server runs on port `3000`.

Check the database health endpoint:

```bash
curl http://localhost:3000/health
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check database connectivity |
| GET | `/api/events` | Retrieve paginated events |
| POST | `/api/events` | Create an event |

Example paginated request:

```bash
curl "http://localhost:3000/api/events?limit=50&offset=0"
```

Example event creation:

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 500,
    "event_name": "page_view",
    "country": "Ethiopia",
    "metadata": {
      "device": "mobile"
    }
  }'
```

The API validates incoming data and uses parameterized database queries.

## Insertion Strategies

EventPulse compares three methods for inserting records.

### 1. Sequential INSERT

Each record is inserted through a separate database query.

```sql
INSERT INTO events (user_id, event_name)
VALUES ($1, $2);
```

This is straightforward but incurs repeated query and communication overhead.

### 2. Batch INSERT

Multiple records are inserted through one SQL statement.

```sql
INSERT INTO events (user_id, event_name)
VALUES
  (101, 'login'),
  (102, 'page_view'),
  (103, 'purchase');
```

Batching reduces the number of separate database requests.

### 3. PostgreSQL COPY

`COPY FROM STDIN` streams large amounts of data into PostgreSQL.

```sql
COPY events
  (user_id, event_name, created_at, country, metadata)
FROM STDIN WITH (FORMAT csv);
```

EventPulse uses `pg-copy-streams` to connect a Node.js readable stream to PostgreSQL's bulk-loading interface.

### Insertion benchmark results

The following measurements compare the insertion of 1,000 records over three measured runs per strategy.

| Strategy | Average duration | Approx. throughput |
|---|---:|---:|
| Sequential INSERT | 2,373.48 ms | 421 rows/sec |
| Batch INSERT | 58.44 ms | 17,112 rows/sec |
| COPY | 62.61 ms | 15,972 rows/sec |

In this experiment, batch INSERT was approximately **40.61× faster** than sequential insertion, while COPY was approximately **37.91× faster**.

These results apply to the tested 1,000-row workload. They do not establish that batch INSERT will outperform COPY for larger datasets.

## Dataset Scaling

The scale generator accepts a target total row count and inserts the difference between the current count and the target.

Example:

```bash
node scripts/generateEventsScale.js 1000000
```

The command targets one million total records rather than blindly adding another million to the existing dataset.

### Verified milestones

| Target dataset | Rows added during scale-up | Insertion duration | Approx. throughput |
|---|---:|---:|---:|
| 5,000 | 3,796 | 0.08 sec | 46,619 rows/sec |
| 1M | 995,000 | 12.23 sec | 81,340 rows/sec |
| 20M | 19,000,000 | 310.32 sec | 61,227 rows/sec |
| 50M | 30,000,000 | Not recorded | Not recorded |
| 100M | 50,000,000 | 675.69 sec | 73,999 rows/sec |

The 100M milestone was verified by querying PostgreSQL for the final row count.

Bulk insertion throughput varies with dataset size, index maintenance, storage performance, caching, and other system conditions.

## Query Performance

Two queries were benchmarked at four dataset sizes.

### Query 1 — Events by user

```sql
SELECT id, user_id, event_name, created_at
FROM events
WHERE user_id = $1
ORDER BY id
LIMIT 50;
```

This query retrieves up to 50 events for a particular user.

### Query 2 — Recent events

```sql
SELECT id, user_id, event_name, created_at
FROM events
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 50;
```

This query retrieves the 50 most recent qualifying events.

### Benchmark results

Median latency measured by the Node.js benchmark:

| Dataset size | Events by user | Recent events |
|---|---:|---:|
| 1M | 1.803 ms | 1.277 ms |
| 20M | 1.636 ms | 1.337 ms |
| 50M | 1.406 ms | 0.560 ms |
| 100M | 1.541 ms | 1.318 ms |

Each benchmark used two warm-up runs followed by seven measured runs per query.

**Interpretation:** Both indexed queries remained in the low-millisecond range as the dataset grew to 100 million records.

The measurements do not prove that larger datasets make queries faster. Cache state, system load, query planning, and run-to-run variation can influence latency. These are application-level round-trip measurements, not isolated PostgreSQL execution times.

## Indexing Experiments

We used PostgreSQL's `EXPLAIN (ANALYZE, BUFFERS)` to inspect query execution plans.

### User lookup index

```sql
CREATE INDEX idx_events_user_id_id
ON events (user_id, id);
```

This composite index supports filtering by user and retrieving matching records in ID order.

At the 1M-row baseline, the measured execution time changed from 162.881 ms before indexing to 1.235 ms after indexing.

### Timestamp index

```sql
CREATE INDEX idx_events_created_at
ON events (created_at DESC);
```

This index supports retrieving events in descending timestamp order.

At the 1M-row baseline, the measured execution time changed from 179.450 ms before indexing to 0.119 ms afterward.

These are individual before-and-after execution-plan measurements, not repeated benchmark medians.

### Execution plans at 100M

| Query | Index used | Rows returned | Execution time |
|---|---|---:|---:|
| Events by user | `idx_events_user_id_id` | 50 | 0.469 ms |
| Recent events | `idx_events_created_at` | 50 | 0.094 ms |

Both plans used the intended indexes and reported no shared-buffer reads during execution.

The recent-events query benefits from the timestamp index's ordering and the `LIMIT 50` clause. Since the generated timestamps are predominantly recent, the date predicate itself is not highly selective.

## Storage Analysis

At 100 million records, PostgreSQL reported the following index sizes:

| Index | Size | Share of index storage |
|---|---:|---:|
| `idx_events_user_id_id` | 4,838 MiB | 63.7% |
| `events_pkey` | 2,142 MiB | 28.2% |
| `idx_events_created_at` | 616 MiB | 8.1% |
| **Total** | **7,596 MiB** | **100%** |

The table and index storage measurements were:

| Metric | Result |
|---|---:|
| Table heap | Approximately 12 GB |
| Index storage | 7,596 MiB |
| Total relation size | Approximately 20 GB |
| Index share of total relation size | 37.62% |

Indexes improve data retrieval for specific access patterns, but they also consume disk space and require maintenance when data changes.

The index storage figures are measured values. The exact write-throughput cost of maintaining these indexes has not yet been quantified through a controlled indexed-versus-unindexed insertion benchmark.

## Benchmark Methodology

EventPulse uses several complementary measurements:

- **Elapsed time:** Measures the duration of an operation.
- **Throughput:** Number of records processed per second.
- **Median latency:** Summarizes typical timings while reducing sensitivity to outliers.
- **Execution plans:** Show PostgreSQL's chosen strategy and observed database execution metrics.
- **Buffer statistics:** Show access to PostgreSQL shared buffers.
- **Storage functions:** Measure table, index, and total relation size.

After large data loads, we refreshed PostgreSQL planner statistics using:

```sql
ANALYZE events;
```

The benchmark environment is a local Docker-based PostgreSQL setup. Results should not be interpreted as production performance guarantees.

## Key Findings

1. **Insertion strategy matters.** Sequential inserts were much slower than batch INSERT and COPY in our 1,000-row benchmark.
2. **Indexes can transform query performance.** The tested user lookup and recent-events queries became dramatically faster after suitable indexes were introduced.
3. **Small indexed result sets can remain efficient at large scale.** Both benchmark queries remained in the low-millisecond range at 100M records.
4. **Indexes have a measurable storage cost.** They accounted for 37.62% of the events relation's total storage.
5. **Query execution plans provide evidence.** `EXPLAIN (ANALYZE, BUFFERS)` helped verify index usage and understand execution behavior.
6. **Benchmarks require careful interpretation.** Small sample sizes, caching, and system load can affect observed performance.

## Project Structure

The main backend layout is:

```text
app/backend/
├── src/
│   ├── server.js
│   ├── db.js
│   ├── routes/
│   ├── controllers/
│   └── services/
├── scripts/
│   ├── generateEvents.js
│   ├── generateEventsBatch.js
│   ├── generateEventsCopy.js
│   └── generateEventsScale.js
├── benchmarks/
│   ├── insertBenchmark.js
│   ├── compareInsertStrategies.js
│   └── queryBenchmark.js
├── tests/
├── results/
├── .env
└── package.json
```

Exact contents may evolve as the project develops.

## Limitations and Future Work

The current experiments focus on two indexed queries and bulk insertion performance in a local environment.

The following investigations remain planned:

- Compare offset pagination with keyset pagination at 100M rows.
- Measure index write overhead using isolated benchmark tables.
- Benchmark analytical queries and aggregations.
- Repeat query measurements under more controlled conditions.
- Investigate concurrent workloads and cold-cache behavior.
- Build a performance dashboard.
- Consolidate the findings into a final technical report.

## Conclusion

EventPulse began as an experiment to generate 100 million PostgreSQL records. It evolved into a practical investigation of database performance, insertion strategies, query optimization, execution plans, and storage trade-offs.

The central lesson is that database performance depends on more than row count. Application behavior, query design, index structure, data distribution, caching, and measurement methodology all matter.

**The goal of EventPulse is not merely to store 100 million records, but to understand how and why a database behaves as its workload grows.**

---

**Author:** [Nezira Worku Ali](https://github.com/Jennah198)

**Repository:** [github.com/Jennah198/eventpulse-100m](https://github.com/Jennah198/eventpulse-100m)