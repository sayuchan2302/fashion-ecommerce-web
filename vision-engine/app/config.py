from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "vision-engine"
    environment: str = "development"

    marketplace_base_url: str = "http://localhost:8080"
    vision_database_url: str = "postgresql://postgres:postgres@localhost:5432/postgres"
    vision_internal_secret: str = ""

    openclip_model_name: str = "ViT-B-32"
    openclip_pretrained: str = "laion2b_s34b_b79k"
    embedding_dimension: int = 512

    connect_timeout_seconds: int = 5
    read_timeout_seconds: int = 20
    image_download_timeout_seconds: int = 20
    max_upload_size_bytes: int = 5_242_880
    max_catalog_image_download_bytes: int = 8_388_608
    max_image_pixels: int = 20_000_000
    metrics_window_size: int = 500
    search_candidate_multiplier: int = 8
    search_candidate_cap: int = 500
    search_hnsw_ef_search: int = 80
    db_pool_min_size: int = 1
    db_pool_max_size: int = 8
    image_search_min_confidence_score: float = 0.55
    image_search_relative_score_floor: float = 0.7
    image_search_absolute_score_floor: float = 0.4
    image_search_foreground_view_weight: float = 0.6
    image_search_center_view_weight: float = 0.25
    image_search_original_view_weight: float = 0.15
    image_search_best_view_bonus: float = 0.08
    image_search_product_best_image_weight: float = 1.0
    image_search_product_primary_image_boost: float = 0.03
    image_search_product_category_match_boost: float = 0.02
    image_search_product_in_stock_boost: float = 0.04
    image_search_category_filter_mode: str = "hard"
    image_search_auto_category_enabled: bool = False
    image_search_auto_category_hard_threshold: float = 0.28
    image_search_auto_category_soft_threshold: float = 0.22
    image_search_auto_category_soft_boost: float = 0.12
    sync_page_size: int = 100
    sync_batch_size: int = 32


settings = Settings()
