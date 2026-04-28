from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
from io import BytesIO
from typing import Any

import numpy as np
from PIL import Image

from .config import settings
from .db import get_connection
from .models import SearchCandidate
from .openclip_service import OpenClipService


class SearchValidationError(Exception):
    def __init__(self, status_code: int, detail: str, metrics_status: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.metrics_status = metrics_status


@dataclass(slots=True)
class SearchExecutionResult:
    candidates: list[SearchCandidate]
    grouped_candidate_count: int
    top_score: float | None
    score_floor: float | None
    status: str
    index_version: str


@dataclass(frozen=True, slots=True)
class QueryView:
    name: str
    image: Image.Image


def validate_image_upload(content_type: str | None, payload: bytes) -> None:
    if not (content_type or "").lower().startswith("image/"):
        raise SearchValidationError(400, "Uploaded file must be an image", "invalid_content_type")
    if not payload:
        raise SearchValidationError(400, "Image file is required", "empty_payload")
    if len(payload) > settings.max_upload_size_bytes:
        raise SearchValidationError(413, "Image file is too large", "oversized_payload")


def decode_search_image(payload: bytes) -> Image.Image:
    try:
        return Image.open(BytesIO(payload)).convert("RGB")
    except Exception as exc:  # noqa: BLE001
        raise SearchValidationError(400, "Unable to decode image", "decode_error") from exc


def group_search_candidates(rows: list[dict[str, Any]]) -> list[SearchCandidate]:
    grouped: OrderedDict[str, SearchCandidate] = OrderedDict()
    for row in rows:
        key = str(row["backend_product_id"])
        candidate = SearchCandidate(
            backend_product_id=row["backend_product_id"],
            score=float(row["score"]),
            matched_image_url=row["image_url"],
            matched_image_index=int(row["image_index"] or 0),
            is_primary=bool(row["is_primary"]),
        )
        existing = grouped.get(key)
        if existing is None:
            grouped[key] = candidate
            continue
        if candidate.score > existing.score:
            grouped[key] = candidate
            continue
        if candidate.score == existing.score:
            if candidate.is_primary and not existing.is_primary:
                grouped[key] = candidate
            elif candidate.is_primary == existing.is_primary and candidate.matched_image_index < existing.matched_image_index:
                grouped[key] = candidate
    return list(grouped.values())


def apply_candidate_thresholds(
    candidates: list[SearchCandidate],
) -> tuple[list[SearchCandidate], float | None, float | None, str]:
    if not candidates:
        return [], None, None, "empty"

    ranked = sorted(
        candidates,
        key=lambda item: (-item.score, not item.is_primary, item.matched_image_index),
    )
    top_score = ranked[0].score
    score_floor = max(
        settings.image_search_absolute_score_floor,
        top_score * settings.image_search_relative_score_floor,
    )
    if top_score < settings.image_search_min_confidence_score:
        return [], top_score, score_floor, "low_confidence"

    filtered = [candidate for candidate in ranked if candidate.score >= score_floor]
    return filtered, top_score, score_floor, "accepted"


def format_score(value: float | None) -> str:
    if value is None:
        return "-"
    return f"{value:.4f}"


def extract_foreground_crop(image: Image.Image) -> Image.Image | None:
    rgb = image.convert("RGB")
    rows = np.asarray(rgb, dtype=np.int16)
    if rows.ndim != 3 or rows.shape[2] != 3:
        return None

    height, width, _ = rows.shape
    if height < 16 or width < 16:
        return None

    border = np.concatenate(
        (
            rows[0, :, :],
            rows[-1, :, :],
            rows[:, 0, :],
            rows[:, -1, :],
        ),
        axis=0,
    )
    bg_color = np.median(border, axis=0)
    diff = np.max(np.abs(rows - bg_color), axis=2)
    mask = diff >= 18
    if not np.any(mask):
        return None

    ys, xs = np.where(mask)
    y_min, y_max = int(ys.min()), int(ys.max())
    x_min, x_max = int(xs.min()), int(xs.max())
    box_width = x_max - x_min + 1
    box_height = y_max - y_min + 1
    area_ratio = (box_width * box_height) / float(max(1, width * height))
    if area_ratio < 0.03 or area_ratio > 0.98:
        return None

    padding = max(2, int(min(width, height) * 0.05))
    x0 = max(0, x_min - padding)
    y0 = max(0, y_min - padding)
    x1 = min(width, x_max + padding + 1)
    y1 = min(height, y_max + padding + 1)
    if x1 - x0 < 8 or y1 - y0 < 8:
        return None

    return rgb.crop((x0, y0, x1, y1))


def center_crop(image: Image.Image, ratio: float = 0.82) -> Image.Image | None:
    rgb = image.convert("RGB")
    width, height = rgb.size
    if width < 16 or height < 16:
        return None

    crop_width = max(8, int(width * ratio))
    crop_height = max(8, int(height * ratio))
    if crop_width >= width and crop_height >= height:
        return None

    left = max(0, (width - crop_width) // 2)
    top = max(0, (height - crop_height) // 2)
    right = min(width, left + crop_width)
    bottom = min(height, top + crop_height)
    if right - left < 8 or bottom - top < 8:
        return None
    return rgb.crop((left, top, right, bottom))


def build_query_views(image: Image.Image) -> list[QueryView]:
    original = image.convert("RGB")
    views: list[QueryView] = [QueryView(name="original", image=original)]

    foreground = extract_foreground_crop(original)
    if foreground is not None:
        views.insert(0, QueryView(name="foreground", image=foreground))

    cropped = center_crop(original)
    if cropped is not None:
        views.append(QueryView(name="center", image=cropped))

    return views


class ImageSearchService:
    def __init__(self, clip_service: OpenClipService) -> None:
        self.clip_service = clip_service

    def search_bytes(
        self,
        *,
        content_type: str | None,
        payload: bytes,
        limit: int,
        category_slug: str | None,
        store_slug: str | None,
    ) -> SearchExecutionResult:
        validate_image_upload(content_type, payload)
        image = decode_search_image(payload)
        query_views = build_query_views(image)
        vectors = self.clip_service.encode_images([view.image for view in query_views])
        rows = self._query_similar_images_with_views(
            vectors=vectors,
            view_names=[view.name for view in query_views],
            limit=limit,
            category_slug=category_slug,
            store_slug=store_slug,
        )
        grouped_candidates = group_search_candidates(rows)
        candidates, top_score, score_floor, status = apply_candidate_thresholds(grouped_candidates)
        index_info = self.load_index_info()
        return SearchExecutionResult(
            candidates=candidates[:limit],
            grouped_candidate_count=len(grouped_candidates),
            top_score=top_score,
            score_floor=score_floor,
            status=status,
            index_version=str(index_info["index_version"]),
        )

    def load_index_info(self) -> dict[str, int | str | None]:
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

        return {
            "active_image_count": int(row[0] or 0),
            "active_product_count": int(row[1] or 0),
            "index_version": row[2] or "empty",
        }

    def _resolve_query_view_weights(self, view_names: list[str]) -> dict[str, float]:
        if not view_names:
            return {}

        if "foreground" in view_names:
            base_weights = {
                "foreground": 0.6,
                "center": 0.25,
                "original": 0.15,
            }
        else:
            base_weights = {
                "center": 0.35,
                "original": 0.65,
            }

        active_total = sum(base_weights.get(name, 0.0) for name in view_names)
        if active_total <= 0:
            uniform = 1.0 / len(view_names)
            return {name: uniform for name in view_names}
        return {name: base_weights.get(name, 0.0) / active_total for name in view_names}

    def _query_similar_images_with_views(
        self,
        *,
        vectors: list[Any],
        view_names: list[str],
        limit: int,
        category_slug: str | None,
        store_slug: str | None,
    ) -> list[dict[str, Any]]:
        if not vectors:
            return []

        ann_limit = min(max(limit * settings.search_candidate_multiplier, limit), settings.search_candidate_cap)
        weights = self._resolve_query_view_weights(view_names)
        merged: OrderedDict[tuple[str, str, int, bool], dict[str, Any]] = OrderedDict()

        for vector, view_name in zip(vectors, view_names, strict=True):
            rows = self._query_similar_images(vector, ann_limit, category_slug, store_slug)
            weight = weights.get(view_name, 0.0)
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
                        "weighted_score": 0.0,
                        "best_score": 0.0,
                    }
                    merged[key] = entry

                score = float(row["score"])
                entry["weighted_score"] += score * weight
                if score > entry["best_score"]:
                    entry["best_score"] = score

        scored_rows: list[dict[str, Any]] = []
        for entry in merged.values():
            blended_score = entry["weighted_score"] + 0.08 * entry["best_score"]
            scored_rows.append(
                {
                    "backend_product_id": entry["backend_product_id"],
                    "image_url": entry["image_url"],
                    "image_index": entry["image_index"],
                    "is_primary": entry["is_primary"],
                    "score": blended_score,
                }
            )

        scored_rows.sort(
            key=lambda item: (-float(item["score"]), not bool(item["is_primary"]), int(item["image_index"])),
        )
        return scored_rows[:ann_limit]

    def _query_similar_images(
        self,
        vector,
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
                1 - (embedding <=> %s) AS score
            FROM vision.product_image_embeddings
            WHERE {where_sql}
            ORDER BY embedding <=> %s
            LIMIT %s
        """

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, [vector, *params, vector, ann_limit])
                rows = cur.fetchall()

        return [
            {
                "backend_product_id": row[0],
                "image_url": row[1],
                "image_index": row[2],
                "is_primary": row[3],
                "score": row[4],
            }
            for row in rows
        ]
