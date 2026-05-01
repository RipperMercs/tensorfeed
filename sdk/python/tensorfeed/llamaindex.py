"""TensorFeed LlamaIndex integration.

Optional extra. Install with::

    pip install 'tensorfeed[llamaindex]'

Provides:
    * ``TensorFeedNewsReader``  - LlamaIndex BaseReader for AI news
    * ``TensorFeedAttentionReader`` - BaseReader for the attention index

Usage::

    from llama_index.core import VectorStoreIndex
    from tensorfeed.llamaindex import TensorFeedNewsReader

    docs = TensorFeedNewsReader(category="research", limit=50).load_data()
    index = VectorStoreIndex.from_documents(docs)
    qe = index.as_query_engine()
    print(qe.query("Summarize this week's AI research news"))

This module imports ``llama_index.core`` lazily so the base
``tensorfeed`` install stays stdlib-only.
"""

from __future__ import annotations

from typing import Any

from .client import TensorFeed


def _require_llamaindex() -> tuple[Any, Any]:
    try:
        from llama_index.core.readers.base import BaseReader
        from llama_index.core.schema import Document
    except ImportError as e:  # pragma: no cover
        raise ImportError(
            "llama_index.core is required for tensorfeed.llamaindex. "
            "Install with: pip install 'tensorfeed[llamaindex]'"
        ) from e
    return BaseReader, Document


def _client(token: str | None) -> TensorFeed:
    return TensorFeed(token=token, user_agent="TensorFeed-LlamaIndex/1.0")


def _make_news_reader():
    BaseReader, Document = _require_llamaindex()

    class _NewsReader(BaseReader):  # type: ignore[misc, valid-type]
        def __init__(
            self,
            category: str | None = None,
            limit: int = 50,
            token: str | None = None,
        ) -> None:
            self.category = category
            self.limit = limit
            self.token = token

        def load_data(self, **kwargs: Any) -> list[Any]:
            result = _client(self.token).news(category=self.category, limit=self.limit)
            docs = []
            for a in result.get("articles", []):
                docs.append(
                    Document(
                        text=f"{a.get('title', '')}\n\n{a.get('snippet', '')}",
                        metadata={
                            "source": a.get("source", ""),
                            "source_domain": a.get("sourceDomain", ""),
                            "url": a.get("url", ""),
                            "published_at": a.get("publishedAt", ""),
                            "categories": a.get("categories", []),
                            "id": a.get("id", ""),
                        },
                    )
                )
            return docs

    return _NewsReader


def _make_attention_reader():
    BaseReader, Document = _require_llamaindex()

    class _AttentionReader(BaseReader):  # type: ignore[misc, valid-type]
        def __init__(self, token: str | None = None) -> None:
            self.token = token

        def load_data(self, **kwargs: Any) -> list[Any]:
            result = _client(self.token).attention()
            docs = []
            for p in result.get("providers", []):
                top = "\n".join(
                    f"- {a.get('title', '')} ({a.get('source', '')})"
                    for a in p.get("top_articles", [])
                )
                text = (
                    f"{p['name']} attention score: {p['attention_score']:.1f}/100 "
                    f"(rank #{p['rank']}). News in last 24h: {p['news_24h']}. "
                    f"News in last 7d: {p['news_7d']}. Trending repos: {p['trending_repos']}.\n\n"
                    f"Recent articles:\n{top}"
                )
                docs.append(
                    Document(
                        text=text,
                        metadata={
                            "provider": p["name"],
                            "provider_id": p["id"],
                            "attention_score": p["attention_score"],
                            "rank": p["rank"],
                            "news_24h": p["news_24h"],
                            "news_7d": p["news_7d"],
                            "computed_at": result.get("computed_at"),
                        },
                    )
                )
            return docs

    return _AttentionReader


# Lazy class accessors so importing this module doesn't require
# llama_index to be installed at import time.

def TensorFeedNewsReader(*args: Any, **kwargs: Any) -> Any:
    return _make_news_reader()(*args, **kwargs)


def TensorFeedAttentionReader(*args: Any, **kwargs: Any) -> Any:
    return _make_attention_reader()(*args, **kwargs)
