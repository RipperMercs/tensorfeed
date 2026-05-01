"""
TensorFeed.ai Python SDK

Free, no-auth API client for AI news, service status, and model data.
Plus a paid premium tier (USDC on Base) for ranked model routing
recommendations and other intelligence endpoints.

https://tensorfeed.ai/developers
"""

from .client import (
    TensorFeed,
    TensorFeedError,
    PaymentRequired,
    RateLimited,
)

__all__ = [
    "TensorFeed",
    "TensorFeedError",
    "PaymentRequired",
    "RateLimited",
]
__version__ = "1.16.0"
