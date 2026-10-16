# EventPulse — 20M Query Benchmark

## Dataset
- Verified total rows: 20,000,000
- Inserted during scale-up: 19,000,000
- Bulk insertion duration: 310.32 seconds
- Average insertion throughput: 61,227 rows/second
- PostgreSQL statistics refreshed with `ANALYZE events`

## Indexes
- Primary key: `id`
- Composite index: `(user_id, id)`
- Timestamp index: `(created_at DESC)`

## Benchmark method
- Warm-up runs per query: 2
- Measured runs per query: 7
- Timings: Node.js-to-PostgreSQL query round trips
- Summary metric for scale comparison: median

## Results

| Query | Average (ms) | Median (ms) | Minimum (ms) | Maximum (ms) |
|---|---:|---:|---:|---:|
| Events by user | 1.806 | 1.636 | 1.356 | 2.410 |
| Recent events | 1.465 | 1.337 | 1.247 | 1.908 |

## Comparison with 1M rows

| Query | 1M median (ms) | 20M median (ms) | Change |
|---|---:|---:|---:|
| Events by user | 1.803 | 1.636 | 9.3% faster |
| Recent events | 1.277 | 1.337 | 4.7% slower |

## Interpretation
The indexed queries remained in a similar latency range as the dataset grew from 1M to 20M rows. The small observed differences should not be treated as definitive performance improvements or regressions: cache state, system load, and run-to-run variation can affect timings.

The measurements include application-to-database round-trip overhead, not just PostgreSQL execution time.
