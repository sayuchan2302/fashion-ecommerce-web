from __future__ import annotations

from io import BytesIO
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch
from uuid import uuid4

from PIL import Image


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.category_classifier import CategoryClassification  # noqa: E402
from app.search_repository import SearchRepository  # noqa: E402
from app.search_service import (  # noqa: E402
    ImageSearchService,
    QueryView,
    RankedSearchCandidate,
    SearchValidationError,
    apply_candidate_thresholds,
    build_query_views,
    decode_search_image,
    format_score,
    group_search_candidates,
    validate_image_upload,
)


class SearchServiceCompatibilityTests(unittest.TestCase):
    @staticmethod
    def _build_png_payload() -> bytes:
        image = Image.new("RGB", (20, 20), color="red")
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue()

    @staticmethod
    def _build_row(product_id, *, category_slug: str, score: float) -> dict:
        return {
            "backend_product_id": product_id,
            "image_url": f"https://example.com/{product_id}.jpg",
            "image_index": 0,
            "is_primary": False,
            "category_slug": category_slug,
            "available_stock": 0,
            "score": score,
        }

    @staticmethod
    def _build_repository(rows: list[dict] | None = None) -> Mock:
        repository = Mock(spec=SearchRepository)
        repository.query_similar_images_with_views.return_value = (rows or [], 3.5)
        repository.should_apply_soft_category_boost.return_value = False
        repository.load_index_info.return_value = {
            "active_image_count": 1,
            "active_product_count": 1,
            "index_version": "sync-token",
        }
        return repository

    def test_search_service_reexports_existing_internals(self) -> None:
        self.assertIsNotNone(QueryView)
        self.assertIsNotNone(RankedSearchCandidate)
        self.assertIs(validate_image_upload, validate_image_upload)
        self.assertIs(decode_search_image, decode_search_image)
        self.assertIs(build_query_views, build_query_views)
        self.assertIs(group_search_candidates, group_search_candidates)
        self.assertIs(apply_candidate_thresholds, apply_candidate_thresholds)
        self.assertEqual(format_score(0.12345), "0.1235")

    def test_search_bytes_rejects_oversized_payload_before_decode(self) -> None:
        service = ImageSearchService(clip_service=Mock())

        with patch("app.search_service.settings.max_upload_size_bytes", 4), patch(
            "app.search_service.decode_search_image"
        ) as decode_mock:
            with self.assertRaises(SearchValidationError) as context:
                service.search_bytes(
                    content_type="application/octet-stream",
                    payload=b"12345",
                    limit=5,
                    category_slug=None,
                    store_slug=None,
                )

        self.assertEqual(context.exception.status_code, 413)
        self.assertEqual(context.exception.metrics_status, "oversized_payload")
        decode_mock.assert_not_called()

    def test_search_bytes_orchestrates_encoding_repository_and_ranking(self) -> None:
        product_id = uuid4()
        clip_service = Mock()
        clip_service.encode_images.return_value = [[0.1, 0.2]]
        repository = Mock(spec=SearchRepository)
        repository.query_similar_images_with_views.return_value = (
            [
                {
                    "backend_product_id": product_id,
                    "image_url": "https://example.com/a.jpg",
                    "image_index": 0,
                    "is_primary": True,
                    "category_slug": "men",
                    "available_stock": 2,
                    "score": 0.9,
                }
            ],
            3.5,
        )
        repository.should_apply_soft_category_boost.return_value = False
        repository.load_index_info.return_value = {
            "active_image_count": 1,
            "active_product_count": 1,
            "index_version": "sync-token",
        }
        service = ImageSearchService(clip_service=clip_service, search_repository=repository)

        result = service.search_bytes(
            content_type="image/png",
            payload=self._build_png_payload(),
            limit=5,
            category_slug="men",
            store_slug="store-a",
        )

        self.assertEqual(result.status, "accepted")
        self.assertEqual(result.candidates[0].backend_product_id, product_id)
        self.assertEqual(result.index_version, "sync-token")
        clip_service.encode_images.assert_called_once()
        repository.query_similar_images_with_views.assert_called_once()
        repository.should_apply_soft_category_boost.assert_called_once_with("men")

    def test_auto_category_disabled_keeps_global_search_and_skips_classifier(self) -> None:
        product_id = uuid4()
        clip_service = Mock()
        clip_service.encode_images.return_value = [[1.0, 0.0]]
        repository = self._build_repository([self._build_row(product_id, category_slug="tat", score=0.9)])
        classifier = Mock()
        service = ImageSearchService(clip_service=clip_service, search_repository=repository, category_classifier=classifier)

        with patch("app.search_service.settings.image_search_auto_category_enabled", False):
            result = service.search_bytes(
                content_type="image/png",
                payload=self._build_png_payload(),
                limit=5,
                category_slug=None,
                store_slug=None,
            )

        classifier.classify.assert_not_called()
        repository.query_similar_images_with_views.assert_called_once()
        call_kwargs = repository.query_similar_images_with_views.call_args.kwargs
        self.assertIsNone(call_kwargs["category_slug"])
        self.assertFalse(call_kwargs["force_hard_category_filter"])
        self.assertIsNone(result.inferred_category)
        self.assertEqual(result.category_filter_applied, "none")

    def test_explicit_category_slug_overrides_auto_category(self) -> None:
        product_id = uuid4()
        clip_service = Mock()
        clip_service.encode_images.return_value = [[1.0, 0.0]]
        repository = self._build_repository([self._build_row(product_id, category_slug="men-ao-thun", score=0.9)])
        classifier = Mock()
        service = ImageSearchService(clip_service=clip_service, search_repository=repository, category_classifier=classifier)

        with patch("app.search_service.settings.image_search_auto_category_enabled", True):
            result = service.search_bytes(
                content_type="image/png",
                payload=self._build_png_payload(),
                limit=5,
                category_slug="men-ao-thun",
                store_slug=None,
            )

        classifier.classify.assert_not_called()
        call_kwargs = repository.query_similar_images_with_views.call_args.kwargs
        self.assertEqual(call_kwargs["category_slug"], "men-ao-thun")
        self.assertFalse(call_kwargs["force_hard_category_filter"])
        self.assertIsNone(result.inferred_category)

    def test_high_confidence_auto_category_applies_hard_filter(self) -> None:
        product_id = uuid4()
        clip_service = Mock()
        clip_service.encode_images.return_value = [[1.0, 0.0]]
        repository = self._build_repository([self._build_row(product_id, category_slug="tat", score=0.9)])
        classifier = Mock()
        classifier.classify.return_value = CategoryClassification(category_slug="tat", score=0.31)
        service = ImageSearchService(clip_service=clip_service, search_repository=repository, category_classifier=classifier)

        with patch("app.search_service.settings.image_search_auto_category_enabled", True):
            result = service.search_bytes(
                content_type="image/png",
                payload=self._build_png_payload(),
                limit=5,
                category_slug=None,
                store_slug=None,
            )

        classifier.classify.assert_called_once_with([1.0, 0.0])
        call_kwargs = repository.query_similar_images_with_views.call_args.kwargs
        self.assertEqual(call_kwargs["category_slug"], "tat")
        self.assertTrue(call_kwargs["force_hard_category_filter"])
        self.assertEqual(result.inferred_category, "tat")
        self.assertEqual(result.inferred_category_score, 0.31)
        self.assertEqual(result.category_filter_applied, "hard")

    def test_medium_confidence_auto_category_applies_soft_boost(self) -> None:
        pants_id = uuid4()
        socks_id = uuid4()
        clip_service = Mock()
        clip_service.encode_images.return_value = [[1.0, 0.0]]
        repository = self._build_repository(
            [
                self._build_row(pants_id, category_slug="women-quan-tay", score=0.82),
                self._build_row(socks_id, category_slug="tat", score=0.78),
            ]
        )
        classifier = Mock()
        classifier.classify.return_value = CategoryClassification(category_slug="tat", score=0.25)
        service = ImageSearchService(clip_service=clip_service, search_repository=repository, category_classifier=classifier)

        with patch("app.search_service.settings.image_search_auto_category_enabled", True):
            result = service.search_bytes(
                content_type="image/png",
                payload=self._build_png_payload(),
                limit=5,
                category_slug=None,
                store_slug=None,
            )

        call_kwargs = repository.query_similar_images_with_views.call_args.kwargs
        self.assertIsNone(call_kwargs["category_slug"])
        self.assertFalse(call_kwargs["force_hard_category_filter"])
        self.assertEqual(result.candidates[0].backend_product_id, socks_id)
        self.assertEqual(result.category_filter_applied, "soft")

    def test_low_confidence_auto_category_keeps_global_search(self) -> None:
        pants_id = uuid4()
        socks_id = uuid4()
        clip_service = Mock()
        clip_service.encode_images.return_value = [[1.0, 0.0]]
        repository = self._build_repository(
            [
                self._build_row(pants_id, category_slug="women-quan-tay", score=0.82),
                self._build_row(socks_id, category_slug="tat", score=0.78),
            ]
        )
        classifier = Mock()
        classifier.classify.return_value = CategoryClassification(category_slug="tat", score=0.1)
        service = ImageSearchService(clip_service=clip_service, search_repository=repository, category_classifier=classifier)

        with patch("app.search_service.settings.image_search_auto_category_enabled", True):
            result = service.search_bytes(
                content_type="image/png",
                payload=self._build_png_payload(),
                limit=5,
                category_slug=None,
                store_slug=None,
            )

        call_kwargs = repository.query_similar_images_with_views.call_args.kwargs
        self.assertIsNone(call_kwargs["category_slug"])
        self.assertFalse(call_kwargs["force_hard_category_filter"])
        self.assertEqual(result.candidates[0].backend_product_id, pants_id)
        self.assertEqual(result.inferred_category, "tat")
        self.assertEqual(result.category_filter_applied, "none")


if __name__ == "__main__":
    unittest.main()
