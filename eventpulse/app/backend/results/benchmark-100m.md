# EventPulse — 100M Query Benchmark

## Dataset
- Verified total rows: 100,000,000
- Rows added during scale-up: 50,000,000
- Bulk insertion duration: 675.69 seconds
- Average insertion throughput: 73,999 rows/second
- Database size: approximately 20 GB
- Events table total size: approximately 20 GB
- Index size: 7,596 MB
- PostgreSQL statistics refreshed with `ANALYZE events`

## Indexes
- Primary key: `id`
- Composite index: `(user_id, id)`
- Timestamp index: `(created_at DESC)`

## Benchmark method
- Warm-up runs per query: 2
- Measured runs per query: 7
- Timings: Node.js-to-PostgreSQL query round trips
- Summary metric: median

## Results

| Query | Average (ms) | Median (ms) | Minimum (ms) | Maximum (ms) |
|---|---:|---:|---:|---:|
| Events by user | 1.488 | 1.541 | 0.991 | 1.932 |
| Recent events | 1.764 | 1.318 | 0.668 | 5.118 |

## Comparison Across Dataset Sizes

| Query | 1M median (ms) | 20M median (ms) | 50M median (ms) | 100M median (ms) |
|---|---:|---:|---:|---:|
| Events by user | 1.803 | 1.636 | 1.406 | 1.541 |
| Recent events | 1.277 | 1.337 | 0.560 | 1.318 |

## Interpretation

Both indexed queries remained in the low-millisecond range at 100M rows.

Compared with the 1M baseline, observed median latency was approximately 14.5% lower for events by user and 3.2% higher for recent events. The results do not establish that increasing dataset size improves or worsens query performance.

The recent-events benchmark included a 5.118 ms outlier. Cache state, system load, and run-to-run variation can influence results. Only seven measured runs were collected per query, so additional controlled repetitions would improve confidence.

These measurements include Node.js-to-PostgreSQL round-trip overhead and are not isolated measurements of PostgreSQL execution time.
