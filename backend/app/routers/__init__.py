from app.routers.health import router as health_router
from app.routers.dashboard import router as dashboard_router
from app.routers.forecasts import router as forecasts_router
from app.routers.accuracy import router as accuracy_router
from app.routers.data_status import router as data_status_router

__all__ = [
    "health_router",
    "dashboard_router",
    "forecasts_router",
    "accuracy_router",
    "data_status_router"
]
