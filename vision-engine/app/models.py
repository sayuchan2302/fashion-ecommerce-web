from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class VisionCatalogItem(BaseModel):
    backend_product_id: UUID
    product_slug: str | None = None
    store_id: UUID
    store_slug: str | None = None
    category_slug: str | None = None
    image_url: str
    image_index: int = 0
    is_primary: bool = False
    available_stock: int = 0
    source_updated_at: datetime | None = None


class VisionCatalogPage(BaseModel):
    items: list[VisionCatalogItem] = Field(default_factory=list)
    total_products: int = Field(default=0, alias="totalProducts")
    page: int = 0
    size: int = 0
    total_pages: int = Field(default=0, alias="totalPages")
    generated_at: datetime | None = Field(default=None, alias="generatedAt")


class SearchCandidate(BaseModel):
    backend_product_id: UUID
    score: float
    matched_image_url: str
    matched_image_index: int
    is_primary: bool


class SearchResponse(BaseModel):
    candidates: list[SearchCandidate]
    total_candidates: int
    index_version: str | None = None
    inferred_category: str | None = None
    inferred_category_score: float | None = None
    category_filter_applied: str | None = None


class IndexInfoResponse(BaseModel):
    ready: bool
    model_name: str
    model_pretrained: str
    embedding_dimension: int
    active_image_count: int
    active_product_count: int
    index_version: str | None = None


class SearchMetricsResponse(BaseModel):
    total_requests: int
    accepted_requests: int
    low_confidence_requests: int
    empty_requests: int
    invalid_content_type_requests: int
    empty_payload_requests: int
    oversized_payload_requests: int
    decode_error_requests: int
    threshold_filtered_candidates: int
    total_grouped_candidates: int
    total_returned_candidates: int
    average_top_score: float | None = None
    average_grouped_candidates: float
    average_returned_candidates: float
    average_search_latency_ms: float
    average_encode_latency_ms: float
    average_db_query_latency_ms: float
    search_latency_p50_ms: float
    search_latency_p95_ms: float
    search_latency_p99_ms: float
    encode_latency_p50_ms: float
    encode_latency_p95_ms: float
    encode_latency_p99_ms: float
    db_query_latency_p50_ms: float
    db_query_latency_p95_ms: float
    db_query_latency_p99_ms: float
    last_status: str | None = None
    last_empty_reason: str | None = None
    last_top_score: float | None = None
    last_score_floor: float | None = None
    last_search_latency_ms: float | None = None
    last_encode_latency_ms: float | None = None
    last_db_query_latency_ms: float | None = None
    last_search_at: datetime | None = None
    empty_reason_counts: dict[str, int] = Field(default_factory=dict)


class SyncCatalogResponse(BaseModel):
    synced_rows: int
    failed_rows: int
    deactivated_rows: int
    images_processed: int
    embeddings_inserted: int
    embeddings_updated: int
    skipped_unchanged: int
    failed_images: int
    inactive_stale_rows: int
    failed_image_reason_counts: dict[str, int] = Field(default_factory=dict)
    sync_token: str
    index_version: str
    failures: list[dict[str, Any]] = Field(default_factory=list)
