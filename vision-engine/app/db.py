from __future__ import annotations

from contextlib import contextmanager

import psycopg
from pgvector.psycopg import register_vector

from .config import settings


BOOTSTRAP_SQL = f"""
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA IF NOT EXISTS vision;

CREATE TABLE IF NOT EXISTS vision.product_image_embeddings (
    id uuid PRIMARY KEY,
    backend_product_id uuid NOT NULL,
    product_slug text,
    store_id uuid NOT NULL,
    store_slug text,
    category_slug text,
    image_url text NOT NULL,
    image_index integer NOT NULL DEFAULT 0,
    is_primary boolean NOT NULL DEFAULT false,
    source_updated_at timestamptz,
    embedding vector({settings.embedding_dimension}) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    model_name text NOT NULL,
    model_pretrained text NOT NULL,
    sync_token text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (backend_product_id, image_url)
);

ALTER TABLE vision.product_image_embeddings
    ADD COLUMN IF NOT EXISTS source_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS product_image_embeddings_product_idx
    ON vision.product_image_embeddings (backend_product_id);

CREATE INDEX IF NOT EXISTS product_image_embeddings_active_idx
    ON vision.product_image_embeddings (is_active);

CREATE INDEX IF NOT EXISTS product_image_embeddings_store_slug_idx
    ON vision.product_image_embeddings (store_slug);

CREATE INDEX IF NOT EXISTS product_image_embeddings_category_slug_idx
    ON vision.product_image_embeddings (category_slug);

CREATE INDEX IF NOT EXISTS product_image_embeddings_source_updated_at_idx
    ON vision.product_image_embeddings (source_updated_at);

CREATE INDEX IF NOT EXISTS product_image_embeddings_embedding_hnsw_idx
    ON vision.product_image_embeddings
    USING hnsw (embedding vector_cosine_ops);
"""


@contextmanager
def get_connection():
    connection = psycopg.connect(settings.vision_database_url)
    register_vector(connection)
    try:
        yield connection
    finally:
        connection.close()


def bootstrap_database() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(BOOTSTRAP_SQL)
        conn.commit()
