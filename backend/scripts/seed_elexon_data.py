import sys
from pathlib import Path
import logging

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.db.database import init_db
from app.services.ingestion import IngestionService
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed")

def main():
    logger.info("Initializing WindLens database...")
    init_db()
    
    service = IngestionService()
    
    # 1. Ingest FUELHH actual wind generation for January 2026
    logger.info("Starting ingestion of FUELHH actual wind generation for January 2026...")
    actual_res = service.ingest_actuals("2026-01-01", "2026-01-31")
    logger.info(f"Actuals ingestion result: {actual_res}")

    # 2. Ingest WINDFOR forecasts published from 2025-12-30 to 2026-01-31
    # Day-ahead procurement for 2026-01-01 relies on forecasts published on 2025-12-31 (and D-2 on Dec 30)
    logger.info("Starting ingestion of WINDFOR forecast vintages for January 2026 delivery...")
    fc_res = service.ingest_forecasts("2025-12-30", "2026-01-31")
    logger.info(f"Forecasts ingestion result: {fc_res}")

    # 3. Check data status
    status = service.get_data_status()
    logger.info(f"Data status summary: Actuals: {status['total_actual_records']}, Forecasts: {status['total_forecast_records']}")
    print("Seed complete successfully!")

if __name__ == "__main__":
    main()
