from __future__ import annotations

from contextlib import nullcontext
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
from uuid import uuid4


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.search_repository import SearchRepository  # noqa: E402


class SearchRepositoryTests(unittest.TestCase):
    class _FakeCursor:
        def __init__(self, rows, one=None):
            self._rows = rows
            self._one = one
            self.executed_sql = ""
            self.executed_params = None
            self.execute_calls = []

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            return False

        def execute(self, sql, params=None):
            self.executed_sql = sql
            self.executed_params = params
            self.execute_calls.append((sql, params))

        def fetchall(self):
            return self._rows

        def fetchone(self):
            return self._one

    class _FakeConnection:
        def __init__(self, cursor):
            self._cursor = cursor

        def cursor(self):
            return self._cursor

    def test_query_similar_images_applies_category_store_filters(self) -> None:
        fake_cursor = self._FakeCursor(
            [
                (uuid4(), "https://example.com/a.jpg", 0, True, "men", 5, 0.91),
            ]
        )
        repository = SearchRepository()

        with patch("app.search_repository.get_connection", return_value=nullcontext(self._FakeConnection(fake_cursor))):
            rows = repository.query_similar_images(
                vector=[0.1, 0.2],
                ann_limit=10,
                category_slug="men",
                store_slug="vision-store",
            )

        self.assertEqual(len(rows), 1)
        self.assertIn("category_slug = %s", fake_cursor.executed_sql)
        self.assertIn("store_slug = %s", fake_cursor.executed_sql)
        self.assertEqual(fake_cursor.executed_params[1], "men")
        self.assertEqual(fake_cursor.executed_params[2], "vision-store")

    def test_query_similar_images_skips_scope_filters_when_empty(self) -> None:
        fake_cursor = self._FakeCursor([])
        repository = SearchRepository()

        with patch("app.search_repository.get_connection", return_value=nullcontext(self._FakeConnection(fake_cursor))):
            repository.query_similar_images(
                vector=[0.3, 0.4],
                ann_limit=6,
                category_slug=None,
                store_slug=None,
            )

        self.assertNotIn("category_slug = %s", fake_cursor.executed_sql)
        self.assertNotIn("store_slug = %s", fake_cursor.executed_sql)
        self.assertEqual(len(fake_cursor.executed_params), 3)

    def test_query_similar_images_sets_hnsw_ef_search_with_set_config(self) -> None:
        fake_cursor = self._FakeCursor([])
        repository = SearchRepository()

        with patch("app.search_repository.settings.search_hnsw_ef_search", 120), patch(
            "app.search_repository.get_connection", return_value=nullcontext(self._FakeConnection(fake_cursor))
        ):
            repository.query_similar_images(
                vector=[0.3, 0.4],
                ann_limit=6,
                category_slug=None,
                store_slug=None,
            )

        self.assertGreaterEqual(len(fake_cursor.execute_calls), 2)
        self.assertEqual(
            fake_cursor.execute_calls[0],
            ("SELECT set_config('hnsw.ef_search', %s, true)", ("120",)),
        )

    def test_query_similar_images_with_views_prefers_foreground_consensus(self) -> None:
        repository = SearchRepository()
        product_a = uuid4()
        product_b = uuid4()
        responses = [
            [
                {
                    "backend_product_id": product_a,
                    "image_url": "https://example.com/a.jpg",
                    "image_index": 0,
                    "is_primary": True,
                    "category_slug": "men",
                    "available_stock": 3,
                    "score": 0.62,
                },
                {
                    "backend_product_id": product_b,
                    "image_url": "https://example.com/b.jpg",
                    "image_index": 0,
                    "is_primary": True,
                    "category_slug": "men",
                    "available_stock": 3,
                    "score": 0.81,
                },
            ],
            [
                {
                    "backend_product_id": product_a,
                    "image_url": "https://example.com/a.jpg",
                    "image_index": 0,
                    "is_primary": True,
                    "category_slug": "men",
                    "available_stock": 3,
                    "score": 0.87,
                },
            ],
            [
                {
                    "backend_product_id": product_a,
                    "image_url": "https://example.com/a.jpg",
                    "image_index": 0,
                    "is_primary": True,
                    "category_slug": "men",
                    "available_stock": 3,
                    "score": 0.79,
                },
                {
                    "backend_product_id": product_b,
                    "image_url": "https://example.com/b.jpg",
                    "image_index": 0,
                    "is_primary": True,
                    "category_slug": "men",
                    "available_stock": 3,
                    "score": 0.7,
                },
            ],
        ]
        call_index = {"value": 0}

        def fake_query(vector, ann_limit, category_slug, store_slug):
            index = call_index["value"]
            call_index["value"] += 1
            return responses[index]

        repository.query_similar_images = fake_query  # type: ignore[method-assign]

        ranked, db_query_latency_ms = repository.query_similar_images_with_views(
            vectors=[[0.1], [0.2], [0.3]],
            view_names=["foreground", "center", "original"],
            limit=10,
            category_slug=None,
            store_slug=None,
        )

        self.assertGreaterEqual(len(ranked), 2)
        self.assertEqual(ranked[0]["backend_product_id"], product_a)
        self.assertGreaterEqual(db_query_latency_ms, 0.0)

    def test_query_similar_images_with_views_can_force_hard_category_filter(self) -> None:
        repository = SearchRepository()
        captured = []

        def fake_query(vector, ann_limit, category_slug, store_slug):
            captured.append(category_slug)
            return []

        repository.query_similar_images = fake_query  # type: ignore[method-assign]

        with patch("app.search_repository.settings.image_search_category_filter_mode", "soft"):
            repository.query_similar_images_with_views(
                vectors=[[0.1]],
                view_names=["original"],
                limit=10,
                category_slug="tat",
                store_slug=None,
                force_hard_category_filter=True,
            )

        self.assertEqual(captured, ["tat"])

    def test_query_similar_images_with_views_uses_global_search_for_soft_category_mode(self) -> None:
        repository = SearchRepository()
        captured = []

        def fake_query(vector, ann_limit, category_slug, store_slug):
            captured.append(category_slug)
            return []

        repository.query_similar_images = fake_query  # type: ignore[method-assign]

        with patch("app.search_repository.settings.image_search_category_filter_mode", "soft"):
            repository.query_similar_images_with_views(
                vectors=[[0.1]],
                view_names=["original"],
                limit=10,
                category_slug="tat",
                store_slug=None,
            )

        self.assertEqual(captured, [None])

    def test_load_index_info_queries_and_caches_counts(self) -> None:
        fake_cursor = self._FakeCursor([], one=(12, 7, "sync-token"))
        repository = SearchRepository()

        with patch("app.search_repository.get_connection", return_value=nullcontext(self._FakeConnection(fake_cursor))):
            info = repository.load_index_info(force_refresh=True)

        self.assertEqual(info["active_image_count"], 12)
        self.assertEqual(info["active_product_count"], 7)
        self.assertEqual(info["index_version"], "sync-token")
        self.assertEqual(repository.load_index_info(), info)


if __name__ == "__main__":
    unittest.main()
