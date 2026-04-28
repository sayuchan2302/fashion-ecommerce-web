from __future__ import annotations

from pathlib import Path
import sys
import unittest
from uuid import uuid4


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models import VisionCatalogPage  # noqa: E402


class VisionCatalogModelTests(unittest.TestCase):
    def test_vision_catalog_page_parses_backend_payload_aliases(self) -> None:
        backend_product_id = str(uuid4())
        store_id = str(uuid4())
        payload = {
            "items": [
                {
                    "backend_product_id": backend_product_id,
                    "product_slug": "sample-product",
                    "store_id": store_id,
                    "store_slug": "sample-store",
                    "category_slug": "sample-category",
                    "image_url": "https://example.com/image.jpg",
                    "image_index": 1,
                    "is_primary": True,
                    "source_updated_at": "2026-04-27T11:55:00",
                }
            ],
            "totalProducts": 12,
            "page": 0,
            "size": 100,
            "totalPages": 2,
            "generatedAt": "2026-04-27T12:00:00Z",
        }

        page = VisionCatalogPage.model_validate(payload)

        self.assertEqual(page.total_products, 12)
        self.assertEqual(page.total_pages, 2)
        self.assertEqual(page.page, 0)
        self.assertEqual(page.items[0].product_slug, "sample-product")
        self.assertEqual(str(page.items[0].backend_product_id), backend_product_id)
        self.assertIsNotNone(page.items[0].source_updated_at)


if __name__ == "__main__":
    unittest.main()
