from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
from typing import Any

from .config import settings
from .models import SearchCandidate


@dataclass(frozen=True, slots=True)
class RankedSearchCandidate:
    candidate: SearchCandidate
    ranking_score: float


def normalize_slug(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    return normalized or None


def build_product_ranking_score(
    row: dict[str, Any],
    *,
    category_slug: str | None,
    apply_soft_category_boost: bool,
    auto_category_slug: str | None = None,
    auto_category_soft_boost: float = 0.0,
) -> float:
    ranking_score = float(row["score"]) * settings.image_search_product_best_image_weight

    if bool(row["is_primary"]):
        ranking_score += settings.image_search_product_primary_image_boost

    if int(row.get("available_stock") or 0) > 0:
        ranking_score += settings.image_search_product_in_stock_boost

    row_category_slug = normalize_slug(str(row.get("category_slug") or ""))
    if apply_soft_category_boost:
        if row_category_slug and row_category_slug == category_slug:
            ranking_score += settings.image_search_product_category_match_boost

    if auto_category_slug and auto_category_soft_boost > 0 and row_category_slug == auto_category_slug:
        ranking_score += auto_category_soft_boost

    return ranking_score


def is_better_ranked_candidate(left: RankedSearchCandidate, right: RankedSearchCandidate) -> bool:
    if left.ranking_score != right.ranking_score:
        return left.ranking_score > right.ranking_score
    if left.candidate.score != right.candidate.score:
        return left.candidate.score > right.candidate.score
    if left.candidate.is_primary != right.candidate.is_primary:
        return left.candidate.is_primary
    if left.candidate.matched_image_index != right.candidate.matched_image_index:
        return left.candidate.matched_image_index < right.candidate.matched_image_index
    return str(left.candidate.backend_product_id) < str(right.candidate.backend_product_id)


def group_search_candidates(
    rows: list[dict[str, Any]],
    *,
    category_slug: str | None = None,
    apply_soft_category_boost: bool = False,
    auto_category_slug: str | None = None,
    auto_category_soft_boost: float = 0.0,
) -> list[RankedSearchCandidate]:
    normalized_category_slug = normalize_slug(category_slug)
    normalized_auto_category_slug = normalize_slug(auto_category_slug)
    grouped: OrderedDict[str, RankedSearchCandidate] = OrderedDict()
    for row in rows:
        ranking_score = build_product_ranking_score(
            row,
            category_slug=normalized_category_slug,
            apply_soft_category_boost=apply_soft_category_boost,
            auto_category_slug=normalized_auto_category_slug,
            auto_category_soft_boost=auto_category_soft_boost,
        )
        candidate = SearchCandidate(
            backend_product_id=row["backend_product_id"],
            score=float(row["score"]),
            matched_image_url=row["image_url"],
            matched_image_index=int(row["image_index"] or 0),
            is_primary=bool(row["is_primary"]),
        )
        ranked_candidate = RankedSearchCandidate(candidate=candidate, ranking_score=ranking_score)
        key = str(row["backend_product_id"])
        existing = grouped.get(key)
        if existing is None or is_better_ranked_candidate(ranked_candidate, existing):
            grouped[key] = ranked_candidate
    return list(grouped.values())


def apply_candidate_thresholds(
    candidates: list[RankedSearchCandidate],
) -> tuple[list[SearchCandidate], float | None, float | None, str, str | None, int]:
    if not candidates:
        return [], None, None, "empty", "no_similar_images", 0

    top_score = max(item.candidate.score for item in candidates)
    score_floor = min(
        top_score,
        max(
            settings.image_search_absolute_score_floor,
            top_score * settings.image_search_relative_score_floor,
        ),
    )
    threshold_filtered_count = len(candidates)

    if top_score < settings.image_search_min_confidence_score:
        return [], top_score, score_floor, "low_confidence", "top_score_below_min_confidence", threshold_filtered_count

    filtered = [item for item in candidates if item.candidate.score >= score_floor]
    threshold_filtered_count = max(0, len(candidates) - len(filtered))
    if not filtered:
        return [], top_score, score_floor, "empty", "all_candidates_below_score_floor", threshold_filtered_count

    ranked = sorted(
        filtered,
        key=lambda item: (
            -item.ranking_score,
            -item.candidate.score,
            not item.candidate.is_primary,
            item.candidate.matched_image_index,
            str(item.candidate.backend_product_id),
        ),
    )
    return [item.candidate for item in ranked], top_score, score_floor, "accepted", None, threshold_filtered_count


def format_score(value: float | None) -> str:
    if value is None:
        return "-"
    return f"{value:.4f}"


_normalize_slug = normalize_slug
_build_product_ranking_score = build_product_ranking_score
_is_better_ranked_candidate = is_better_ranked_candidate
