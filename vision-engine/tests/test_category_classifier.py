from __future__ import annotations

from pathlib import Path
import sys
import unittest
from unittest.mock import Mock

import numpy as np


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.category_classifier import CategoryClassifier, mean_top_scores, normalize_vector  # noqa: E402


class CategoryClassifierTests(unittest.TestCase):
    def test_classify_returns_deterministic_top_category_and_caches_text_embeddings(self) -> None:
        clip_service = Mock()
        clip_service.encode_texts.return_value = [
            np.array([0.0, 1.0], dtype=np.float32),
            np.array([1.0, 0.0], dtype=np.float32),
            np.array([0.9, 0.1], dtype=np.float32),
            np.array([0.8, 0.2], dtype=np.float32),
        ]
        classifier = CategoryClassifier(
            clip_service,
            prompts={
                "tui-xach": ["bag"],
                "tat": ["socks", "white socks", "crew socks"],
            },
        )

        first = classifier.classify(np.array([1.0, 0.0], dtype=np.float32))
        second = classifier.classify(np.array([1.0, 0.0], dtype=np.float32))

        self.assertEqual(first.category_slug, "tat")
        self.assertEqual(second.category_slug, "tat")
        clip_service.encode_texts.assert_called_once_with(["socks", "white socks", "crew socks", "bag"])

    def test_classify_breaks_score_ties_by_category_slug(self) -> None:
        clip_service = Mock()
        clip_service.encode_texts.return_value = [
            np.array([1.0, 0.0], dtype=np.float32),
            np.array([1.0, 0.0], dtype=np.float32),
        ]
        classifier = CategoryClassifier(
            clip_service,
            prompts={
                "tat": ["socks"],
                "kinh-mat": ["sunglasses"],
            },
        )

        result = classifier.classify(np.array([1.0, 0.0], dtype=np.float32))

        self.assertEqual(result.category_slug, "kinh-mat")

    def test_normalize_vector_handles_zero_vector(self) -> None:
        normalized = normalize_vector([0.0, 0.0])

        self.assertEqual(normalized.tolist(), [0.0, 0.0])

    def test_mean_top_scores_uses_top_two_values(self) -> None:
        self.assertAlmostEqual(mean_top_scores([0.1, 0.7, 0.5]), 0.6)


if __name__ == "__main__":
    unittest.main()
