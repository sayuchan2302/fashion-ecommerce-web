from __future__ import annotations

from collections import OrderedDict
from threading import Lock
from time import perf_counter
from typing import Any

from .config import settings
from .db import get_connection
from .ranking import normalize_slug


class SearchRepository:
    def __init__(self) -> None:
        self._index_info_lock = Lock()
        self._cached_index_info = {
            "active_image_count": 0,
            "active_product_count": 0,
            "index_version": "empty",
        }

    def load_index_info(self, *, force_refresh: bool = False) -> dict[str, int | str | None]:
        if not force_refresh:
            with self._index_info_lock:
                return dict(self._cached_index_info)

        sql = """
            SELECT
                COUNT(*) FILTER (WHERE is_active = true) AS active_image_count,
                COUNT(DISTINCT backend_product_id) FILTER (WHERE is_active = true) AS active_product_count,
                (
                    SELECT sync_token
                    FROM vision.product_image_embeddings
                    WHERE is_active = true
                    ORDER BY updated_at DESC
                    LIMIT 1
                ) AS index_version
            FROM vision.product_image_embeddings
        """
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                row = cur.fetchone()

        info = {
            "active_image_count": int(row[0] or 0),
            "active_product_count": int(row[1] or 0),
            "index_version": row[2] or "empty",
        }
        with self._index_info_lock:
            self._cached_index_info = dict(info)
        return info

    def refresh_index_info(self) -> dict[str, int | str | None]:
        return self.load_index_info(force_refresh=True)

    def should_apply_soft_category_boost(self, category_slug: str | None) -> bool:
        return normalize_slug(category_slug) is not None and settings.image_search_category_filter_mode.lower() == "soft"

    def query_similar_images_with_views(
        self,
        *,
        vectors: list[Any],
        view_names: list[str],
        limit: int,
        category_slug: str | None,
        store_slug: str | None,
        force_hard_category_filter: bool = False,
    ) -> tuple[list[dict[str, Any]], float]:
        if not vectors:
            return [], 0.0

        ann_limit = min(max(limit * settings.search_candidate_multiplier, limit), settings.search_candidate_cap)
        weights = self._resolve_query_view_weights(view_names)
        query_category_slug = self._resolve_query_category_slug(category_slug, force_hard_category_filter)
        merged: OrderedDict[tuple[str, str, int, bool], dict[str, Any]] = OrderedDict()
        db_query_latency_ms = 0.0

        for vector, view_name in zip(vectors, view_names, strict=True):
            query_started_at = perf_counter()
            rows = self.query_similar_images(vector, ann_limit, query_category_slug, store_slug)
            db_query_latency_ms += (perf_counter() - query_started_at) * 1000
            weight = weights.get(view_name, 0.0)
            self._merge_view_rows(merged, rows, weight)

        scored_rows = [self._build_scored_row(entry) for entry in merged.values()]
        scored_rows.sort(
            key=lambda item: (
                -float(item["score"]),
                not bool(item["is_primary"]),
                int(item["image_index"]),
                str(item["backend_product_id"]),
            ),
        )
        return scored_rows[:ann_limit], db_query_latency_ms

    def query_similar_images(
        self,
        vector: Any,
        ann_limit: int,
        category_slug: str | None,
        store_slug: str | None,
    ) -> list[dict[str, Any]]:
        filters = ["is_active = true"]
        params: list[Any] = []

        if category_slug:
            filters.append("category_slug = %s")
            params.append(category_slug)
        if store_slug:
            filters.append("store_slug = %s")
            params.append(store_slug)

        where_sql = " AND ".join(filters)
        sql = f"""
            SELECT
                backend_product_id,
                image_url,
                image_index,
                is_primary,
                category_slug,
                available_stock,
                1 - (embedding <=> %s) AS score
            FROM vision.product_image_embeddings
            WHERE {where_sql}
            ORDER BY embedding <=> %s
            LIMIT %s
        """

        with get_connection() as conn:
            with conn.cursor() as cur:
                if settings.search_hnsw_ef_search > 0:
                    cur.execute(
                        "SELECT set_config('hnsw.ef_search', %s, true)",
                        (str(settings.search_hnsw_ef_search),),
                    )
                cur.execute(sql, [vector, *params, vector, ann_limit])
                rows = cur.fetchall()

        return [
            {
                "backend_product_id": row[0],
                "image_url": row[1],
                "image_index": row[2],
                "is_primary": row[3],
                "category_slug": row[4],
                "available_stock": row[5],
                "score": row[6],
            }
            for row in rows
        ]

    def _resolve_query_view_weights(self, view_names: list[str]) -> dict[str, float]:
        if not view_names:
            return {}

        base_weights = {
            "foreground": settings.image_search_foreground_view_weight,
            "center": settings.image_search_center_view_weight,
            "original": settings.image_search_original_view_weight,
        }
        active_total = sum(base_weights.get(name, 0.0) for name in view_names)
        if active_total <= 0:
            uniform = 1.0 / len(view_names)
            return {name: uniform for name in view_names}
        return {name: base_weights.get(name, 0.0) / active_total for name in view_names}

    def _resolve_query_category_slug(self, category_slug: str | None, force_hard_category_filter: bool) -> str | None:
        if force_hard_category_filter:
            return category_slug
        if self.should_apply_soft_category_boost(category_slug):
            return None
        return category_slug

    def _merge_view_rows(
        self,
        merged: OrderedDict[tuple[str, str, int, bool], dict[str, Any]],
        rows: list[dict[str, Any]],
        weight: float,
    ) -> None:
        for row in rows:
            key = (
                str(row["backend_product_id"]),
                str(row["image_url"]),
                int(row["image_index"] or 0),
                bool(row["is_primary"]),
            )
            entry = merged.get(key)
            if entry is None:
                entry = {
                    "backend_product_id": row["backend_product_id"],
                    "image_url": row["image_url"],
                    "image_index": int(row["image_index"] or 0),
                    "is_primary": bool(row["is_primary"]),
                    "category_slug": row.get("category_slug"),
                    "available_stock": int(row.get("available_stock") or 0),
                    "weighted_score": 0.0,
                    "best_score": 0.0,
                }
                merged[key] = entry

            score = float(row["score"])
            entry["weighted_score"] += score * weight
            if score > entry["best_score"]:
                entry["best_score"] = score

    def _build_scored_row(self, entry: dict[str, Any]) -> dict[str, Any]:
        blended_score = entry["weighted_score"] + settings.image_search_best_view_bonus * entry["best_score"]
        return {
            "backend_product_id": entry["backend_product_id"],
            "image_url": entry["image_url"],
            "image_index": entry["image_index"],
            "is_primary": entry["is_primary"],
            "category_slug": entry["category_slug"],
            "available_stock": entry["available_stock"],
            "score": blended_score,
        }
