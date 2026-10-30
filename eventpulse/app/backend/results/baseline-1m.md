### EventPulse Progress Note — 1M Query Benchmark Baseline

**Dataset:** 1,000,000 events  
**Indexes:** Primary key on `id`, composite index on `(user_id, id)`, and index on `created_at DESC`.

**Benchmark method**
- 2 warm-up runs per query
- 7 measured runs per query
- Node.js `performance.now()` to measure query round-trip latency
- Average, median, minimum, and maximum recorded

**Results**

| Query | Average | Median | Minimum | Maximum |
|---|---:|---:|---:|---:|
| Events by user | 1.869 ms | 1.803 ms | 1.514 ms | 2.421 ms |
| Recent events | 1.301 ms | 1.277 ms | 1.077 ms | 1.599 ms |

**Key learning:** Indexes can reduce the database work required for common lookups, but application-level latency also includes communication and query-result handling. Benchmark methodology matters when comparing results.

**Next:** Preserve these baseline results, improve the benchmark to save measurements in a reusable format, and scale the dataset toward 20 million events.