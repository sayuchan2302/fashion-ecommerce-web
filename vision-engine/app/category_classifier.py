from __future__ import annotations

from dataclasses import dataclass
from threading import Lock
from typing import Iterable

import numpy as np

from .openclip_service import OpenClipService


# Prompt keys must match category_slug values indexed in vision.product_image_embeddings.
CATEGORY_PROMPTS: dict[str, list[str]] = {
    "tat": ["a photo of socks", "a pair of socks", "white socks", "crew socks", "ankle socks", "fashion socks"],
    "kinh-mat": ["a photo of sunglasses", "polarized sunglasses", "fashion sunglasses", "eyewear"],
    "tui-xach": ["a photo of a bag", "handbag", "tote bag", "crossbody bag", "fashion bag"],
    "non-mu": ["a photo of a hat", "cap", "beanie", "fashion hat"],
    "men-ao-thun": ["a t-shirt", "short sleeve t-shirt", "plain t-shirt", "men's t-shirt"],
    "women-ao-thun": ["a t-shirt", "short sleeve t-shirt", "plain t-shirt", "women's t-shirt"],
    "men-ao-so-mi": ["a button shirt", "a men's shirt", "long sleeve shirt", "fashion shirt"],
    "women-ao-so-mi": ["a button shirt", "a women's shirt", "long sleeve shirt", "fashion shirt"],
    "men-quan-jeans": ["jeans", "denim jeans", "wide leg jeans", "men's jeans"],
    "women-quan-jeans": ["jeans", "denim jeans", "wide leg jeans", "women's jeans"],
    "men-quan-tay": ["pants", "trousers", "wide leg pants", "men's trousers"],
    "women-quan-tay": ["pants", "trousers", "wide leg pants", "women's trousers"],
    "women-vay-lien": ["a dress", "midi dress", "fashion dress"],
    "women-vay-du-tiec": ["a dress", "party dress", "fashion dress"],
    "women-vay-cong-so": ["a dress", "office dress", "fashion dress"],
    "women-vay-maxi": ["a dress", "maxi dress", "fashion dress"],
}


@dataclass(frozen=True, slots=True)
class CategoryClassification:
    category_slug: str
    score: float


class CategoryClassifier:
    def __init__(self, clip_service: OpenClipService, prompts: dict[str, list[str]] | None = None) -> None:
        self.clip_service = clip_service
        self.prompts = prompts or CATEGORY_PROMPTS
        self._embedding_lock = Lock()
        self._prompt_embeddings: list[tuple[str, np.ndarray]] | None = None

    def classify(self, image_vector) -> CategoryClassification:
        query = normalize_vector(image_vector)
        prompt_embeddings = self._load_prompt_embeddings()
        if not prompt_embeddings:
            return CategoryClassification(category_slug="", score=0.0)

        scores_by_category: dict[str, list[float]] = {}
        for category_slug, text_vector in prompt_embeddings:
            score = float(np.dot(query, text_vector))
            scores_by_category.setdefault(category_slug, []).append(score)

        category_scores = {
            category_slug: mean_top_scores(scores)
            for category_slug, scores in scores_by_category.items()
        }
        category_slug, score = min(category_scores.items(), key=lambda item: (-item[1], item[0]))
        return CategoryClassification(category_slug=category_slug, score=score)

    def _load_prompt_embeddings(self) -> list[tuple[str, np.ndarray]]:
        cached = self._prompt_embeddings
        if cached is not None:
            return cached

        with self._embedding_lock:
            if self._prompt_embeddings is not None:
                return self._prompt_embeddings

            flat_prompts = list(flatten_prompts(self.prompts))
            if not flat_prompts:
                self._prompt_embeddings = []
                return self._prompt_embeddings

            text_vectors = self.clip_service.encode_texts([prompt for _, prompt in flat_prompts])
            self._prompt_embeddings = [
                (category_slug, normalize_vector(vector))
                for (category_slug, _), vector in zip(flat_prompts, text_vectors, strict=True)
            ]
            return self._prompt_embeddings


def flatten_prompts(prompts: dict[str, list[str]]) -> Iterable[tuple[str, str]]:
    for category_slug in sorted(prompts):
        for prompt in prompts[category_slug]:
            yield category_slug, prompt


def normalize_vector(vector) -> np.ndarray:
    array = np.asarray(vector, dtype=np.float32).reshape(-1)
    norm = float(np.linalg.norm(array))
    if norm <= 0:
        return array
    return array / norm


def mean_top_scores(scores: list[float], count: int = 2) -> float:
    if not scores:
        return 0.0
    top_scores = sorted(scores, reverse=True)[:count]
    return float(sum(top_scores) / len(top_scores))
