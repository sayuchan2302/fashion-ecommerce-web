from __future__ import annotations

from pathlib import Path
import sys
import unittest
from uuid import uuid4


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.ranking import apply_candidate_thresholds, group_search_candidates  # noqa: E402


class RankingTests(unittest.TestCase):
    def test_group_search_candidates_prefers_higher_ranking_score(self) -> None:
        product_id = uuid4()
        rows = [
            {
                "backend_product_id": product_id,
                "image_url": "https://example.com/a.jpg",
                "image_index": 2,
                "is_primary": False,
                "category_slug": "men",
                "available_stock": 0,
                "score": 0.82,
            },
            {
                "backend_product_id": product_id,
                "image_url": "https://example.com/b.jpg",
                "image_index": 1,
                "is_primary": True,
                "category_slug": "men",
                "available_stock": 3,
                "score": 0.81,
            },
        ]

        grouped = group_search_candidates(rows)

        self.assertEqual(len(grouped), 1)
        self.assertEqual(grouped[0].candidate.matched_image_url, "https://example.com/b.jpg")
        self.assertTrue(grouped[0].candidate.is_primary)

    def test_group_search_candidates_applies_soft_category_boost(self) -> None:
        product_a = uuid4()
        product_b = uuid4()
        rows = [
            {
                "backend_product_id": product_a,
                "image_url": "https://example.com/a.jpg",
                "image_index": 0,
                "is_primary": False,
                "category_slug": "women",
                "available_stock": 0,
                "score": 0.82,
            },
            {
                "backend_product_id": product_b,
                "image_url": "https://example.com/b.jpg",
                "image_index": 0,
                "is_primary": True,
                "category_slug": "men",
                "available_stock": 5,
                "score": 0.78,
            },
        ]

        grouped = group_search_candidates(
            rows,
            category_slug="men",
            apply_soft_category_boost=True,
        )
        candidates, _, _, status, _, _ = apply_candidate_thresholds(grouped)

        self.assertEqual(status, "accepted")
        self.assertEqual(candidates[0].backend_product_id, product_b)

    def test_group_search_candidates_applies_auto_category_soft_boost(self) -> None:
        product_a = uuid4()
        product_b = uuid4()
        rows = [
            {
                "backend_product_id": product_a,
                "image_url": "https://example.com/a.jpg",
                "image_index": 0,
                "is_primary": False,
                "category_slug": "women-quan-tay",
                "available_stock": 0,
                "score": 0.82,
            },
            {
                "backend_product_id": product_b,
                "image_url": "https://example.com/b.jpg",
                "image_index": 0,
                "is_primary": False,
                "category_slug": "tat",
                "available_stock": 0,
                "score": 0.78,
            },
        ]

        grouped = group_search_candidates(
            rows,
            auto_category_slug="tat",
            auto_category_soft_boost=0.12,
        )
        candidates, _, _, status, _, _ = apply_candidate_thresholds(grouped)

        self.assertEqual(status, "accepted")
        self.assertEqual(candidates[0].backend_product_id, product_b)

    def test_apply_candidate_thresholds_breaks_ties_by_backend_product_id(self) -> None:
        lower_product_id = uuid4()
        higher_product_id = uuid4()
        if str(lower_product_id) > str(higher_product_id):
            lower_product_id, higher_product_id = higher_product_id, lower_product_id

        grouped = group_search_candidates(
            [
                {
                    "backend_product_id": higher_product_id,
                    "image_url": "https://example.com/b.jpg",
                    "image_index": 0,
                    "is_primary": True,
                    "category_slug": "men",
                    "available_stock": 1,
                    "score": 0.88,
                },
                {
                    "backend_product_id": lower_product_id,
                    "image_url": "https://example.com/a.jpg",
                    "image_index": 0,
                    "is_primary": True,
                    "category_slug": "men",
                    "available_stock": 1,
                    "score": 0.88,
                },
            ]
        )

        candidates, _, _, status, _, _ = apply_candidate_thresholds(grouped)

        self.assertEqual(status, "accepted")
        self.assertEqual(candidates[0].backend_product_id, lower_product_id)
        self.assertEqual(candidates[1].backend_product_id, higher_product_id)

    def test_apply_candidate_thresholds_returns_low_confidence_when_top_score_is_too_low(self) -> None:
        grouped = group_search_candidates(
            [
                {
                    "backend_product_id": uuid4(),
                    "image_url": "https://example.com/a.jpg",
                    "image_index": 0,
                    "is_primary": True,
                    "category_slug": "men",
                    "available_stock": 2,
                    "score": 0.5,
                }
            ]
        )

        candidates, top_score, score_floor, status, empty_reason, threshold_filtered_count = apply_candidate_thresholds(grouped)

        self.assertEqual(candidates, [])
        self.assertEqual(status, "low_confidence")
        self.assertEqual(empty_reason, "top_score_below_min_confidence")
        self.assertEqual(top_score, 0.5)
        self.assertIsNotNone(score_floor)
        self.assertEqual(threshold_filtered_count, 1)

    def test_apply_candidate_thresholds_filters_tail_candidates(self) -> None:
        grouped = group_search_candidates(
            [
                {
                    "backend_product_id": uuid4(),
                    "image_url": "https://example.com/a.jpg",
                    "image_index": 0,
                    "is_primary": True,
                    "category_slug": "men",
                    "available_stock": 3,
                    "score": 0.9,
                },
                {
                    "backend_product_id": uuid4(),
                    "image_url": "https://example.com/b.jpg",
                    "image_index": 0,
                    "is_primary": True,
                    "category_slug": "men",
                    "available_stock": 1,
                    "score": 0.7,
                },
                {
                    "backend_product_id": uuid4(),
                    "image_url": "https://example.com/c.jpg",
                    "image_index": 0,
                    "is_primary": True,
                    "category_slug": "men",
                    "available_stock": 0,
                    "score": 0.5,
                },
            ]
        )

        candidates, top_score, score_floor, status, empty_reason, threshold_filtered_count = apply_candidate_thresholds(grouped)

        self.assertEqual(status, "accepted")
        self.assertIsNone(empty_reason)
        self.assertEqual(top_score, 0.9)
        self.assertAlmostEqual(score_floor or 0.0, 0.63, places=2)
        self.assertEqual(len(candidates), 2)
        self.assertEqual(threshold_filtered_count, 1)


if __name__ == "__main__":
    unittest.main()
