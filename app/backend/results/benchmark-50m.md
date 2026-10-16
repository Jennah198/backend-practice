# EventPulse — 50M Query Benchmark

## Dataset
- Verified total rows: 50,000,000
- Database size: 10,137 MB
- Events table total size: 10,130 MB
- Index size: 3,831 MB
- PostgreSQL statistics refreshed with `ANALYZE events`

## Indexes
- Primary key: `id`
- Composite index: `(user_id, id)`
- Timestamp index: `(created_at DESC)`

## Benchmark method
- Warm-up runs per query: 2
- Measured runs per query: 7
- Timings: Node.js-to-PostgreSQL round trips
- Summary metric: median

## Results

| Query | Average (ms) | Median (ms) | Minimum (ms) | Maximum (ms) |
|---|---:|---:|---:|---:|
| Events by user | 1.464 | 1.406 | 0.944 | 2.270 |
| Recent events | 0.570 | 0.560 | 0.505 | 0.672 |

## Comparison Across Dataset Sizes

| Query | 1M median (ms) | 20M median (ms) | 50M median (ms) |
|---|---:|---:|---:|
| Events by user | 1.803 | 1.636 | 1.406 |
| Recent events | 1.277 | 1.337 | 0.560 |

## Interpretation
Both indexed queries remained in the low-millisecond range at 50M rows.

Compared with the 1M baseline, observed median latency was 22.0% lower for events by user and 56.1% lower for recent events. These results do not establish that a larger dataset improves query performance. Cache state, background load, and run-to-run variation may influence the measurements.

Repeat the benchmark under controlled conditions before drawing stronger conclusions. Application-level timings include communication and result-handling overhead, not only PostgreSQL execution time.
