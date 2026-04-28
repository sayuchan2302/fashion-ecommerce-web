# Vision Engine

`vision-engine` is the OpenCLIP + `pgvector` retrieval service for marketplace image search.

## Responsibilities

- Export-free runtime search over `backend_product_id`
- Batch sync public product images from Spring Boot
- Store embeddings in Postgres schema `vision`
- Return ranked product candidates only

## Runtime prerequisites

1. Spring Boot backend is running on `http://localhost:8080`
2. Postgres is running and already contains the marketplace catalog
3. The Postgres server has the `pgvector` extension installed and the DB user can run:
   - `CREATE EXTENSION IF NOT EXISTS vector;`
4. Backend and `vision-engine` share the same internal secret
5. Local runtime should use **Python 3.11** for `torch` / `open_clip_torch`

## Environment

Copy:

```powershell
# Docker-oriented env
Copy-Item vision-engine/.env.example vision-engine/.env
```

Then adjust at least:

- `MARKETPLACE_BASE_URL`
- `VISION_DATABASE_URL`
- `VISION_INTERNAL_SECRET`
- `OPENCLIP_MODEL_NAME`
- `OPENCLIP_PRETRAINED`

Optional relevance tuning:

- `IMAGE_SEARCH_MIN_CONFIDENCE_SCORE`
- `IMAGE_SEARCH_RELATIVE_SCORE_FLOOR`
- `IMAGE_SEARCH_ABSOLUTE_SCORE_FLOOR`
- `IMAGE_SEARCH_FOREGROUND_VIEW_WEIGHT`
- `IMAGE_SEARCH_CENTER_VIEW_WEIGHT`
- `IMAGE_SEARCH_ORIGINAL_VIEW_WEIGHT`
- `IMAGE_SEARCH_BEST_VIEW_BONUS`
- `IMAGE_SEARCH_PRODUCT_PRIMARY_IMAGE_BOOST`
- `IMAGE_SEARCH_PRODUCT_CATEGORY_MATCH_BOOST`
- `IMAGE_SEARCH_PRODUCT_IN_STOCK_BOOST`
- `IMAGE_SEARCH_CATEGORY_FILTER_MODE`
- `IMAGE_SEARCH_AUTO_CATEGORY_ENABLED`
- `IMAGE_SEARCH_AUTO_CATEGORY_HARD_THRESHOLD`
- `IMAGE_SEARCH_AUTO_CATEGORY_SOFT_THRESHOLD`
- `IMAGE_SEARCH_AUTO_CATEGORY_SOFT_BOOST`
- `SEARCH_HNSW_EF_SEARCH`
- `DB_POOL_MIN_SIZE`
- `DB_POOL_MAX_SIZE`
- `MAX_UPLOAD_SIZE_BYTES`
- `MAX_CATALOG_IMAGE_DOWNLOAD_BYTES`
- `MAX_IMAGE_PIXELS`
- `METRICS_WINDOW_SIZE`

For local Windows development without Docker, use:

```powershell
Copy-Item vision-engine/.env.local.example vision-engine/.env
```

## Optional auto category classification

Image search can optionally infer a fashion category from the uploaded image using OpenCLIP image-text similarity. This helps queries where color or background dominates visual similarity, such as white socks matching white pants or shirts.

The feature is disabled by default:

```powershell
IMAGE_SEARCH_AUTO_CATEGORY_ENABLED=false
```

When enabled and the request does not include `category_slug`, `vision-engine` compares the query image embedding with cached category prompt embeddings:

- score >= `IMAGE_SEARCH_AUTO_CATEGORY_HARD_THRESHOLD`: apply the inferred category as a hard filter
- score >= `IMAGE_SEARCH_AUTO_CATEGORY_SOFT_THRESHOLD`: keep global search and add `IMAGE_SEARCH_AUTO_CATEGORY_SOFT_BOOST` to matching categories
- score below soft threshold: keep the existing global search behavior

Prompt keys in `app/category_classifier.py` must match indexed `category_slug` values from `vision.product_image_embeddings`. The current catalog uses slugs such as `tat`, `kinh-mat`, `tui-xach`, `non-mu`, `men-ao-thun`, `women-ao-thun`, `men-quan-jeans`, `women-quan-jeans`, and `women-vay-lien`; do not use generic keys that are not indexed.

Manual socks check:

1. Set `IMAGE_SEARCH_AUTO_CATEGORY_ENABLED=true`
2. Restart `vision-engine`
3. Run a full catalog sync
4. POST a socks image directly to `/v1/search/image` without `category_slug`
5. Expect `inferred_category=tat`; if the score reaches the hard threshold, expect `category_filter_applied=hard`

## Start with Docker

From repo root:

```powershell
docker compose -f docker-compose.vision.yml up --build
```

This compose file runs only `vision-engine`. It expects backend and Postgres to already be available on the host.

## Start locally on Windows

Install dependencies into a local virtual environment:

```powershell
./vision-engine/scripts/install-local.ps1
```

If your machine has multiple Python versions, the script defaults to `py -3.11`.
You can override that if needed.

Run the service:

```powershell
./vision-engine/scripts/run-local.ps1
```

Run with auto-reload during development:

```powershell
./vision-engine/scripts/run-local.ps1 -Reload
```

## Sync catalog

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8001/v1/admin/sync-catalog `
  -Method Post `
  -Headers @{ "X-Vision-Internal-Secret" = "change-me-vision-secret" }
```

## Metrics

Use the internal metrics endpoint to inspect request quality and volume:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8001/v1/metrics `
  -Headers @{ "X-Vision-Internal-Secret" = "change-me-vision-secret" }
```

The metrics payload includes:

- request counters by status
- threshold-filtered candidate count
- average and last search / encode / DB-query latency
- rolling-window search / encode / DB-query latency p50, p95, p99
- last empty-result reason and cumulative empty-reason counts

## Index notes

- Normal search always filters `is_active = true`, so `product_image_embeddings_active_embedding_hnsw_idx` is the preferred ANN index.
- The full-table HNSW index is kept for compatibility and manual diagnostics; the bootstrap step does not drop indexes automatically.
- To inspect planner behavior on a live database, run `EXPLAIN ANALYZE` on the same query shape used by `/v1/search/image` with `WHERE is_active = true`.

## Smoke test

The smoke script:

- checks backend and `vision-engine` health
- triggers catalog sync
- fetches one real catalog image row
- downloads that image
- calls the public image-search endpoint
- verifies the top result against the expected `backend_product_id`

Run:

```powershell
./vision-engine/scripts/smoke-image-search.ps1 -VisionSecret "change-me-vision-secret"
```

## Benchmark

The benchmark script validates three behaviors through the public API:

- exact catalog image returns the expected product at top-1
- center-cropped image still keeps the expected product in top-k
- no-match synthetic image returns zero products
- category filter does not return products outside the requested category
- corrupted image returns a 4xx error through the backend gateway
- oversized image returns a 4xx error through the backend gateway

Run:

```powershell
./vision-engine/scripts/benchmark-image-search.ps1 -VisionSecret "change-me-vision-secret"
```

Each successful run updates [BENCHMARK_REPORT.md](/d:/Project/vision-engine/BENCHMARK_REPORT.md).
