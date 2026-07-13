"""API routers for FinAlly."""

from . import portfolio, watchlist, chat, health

# NOTE: stream router is created inline in app.main:lifespan to allow
# injecting the shared PriceCache before router registration.

__all__ = ["portfolio", "watchlist", "chat", "health"]
