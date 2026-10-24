# WindLens — UK Wind Forecast Analytics Platform

> **A production-quality Day-Ahead electricity procurement analytics MVP for UK wind generation.**  
> Built for wholesale procurement teams to quantify wind generation uncertainty, evaluate forecast vintages at decision cutoffs, track forecast evolution, and assess exposure risks using official **Elexon BMRS** data for **January 2026**.

---

## 1. Product Overview & Problem Statement

### Business Context
In the UK electricity wholesale market, electricity suppliers purchase power in advance through the day-ahead auction (typically closing between 11:00 and 12:00 UK local time on day $D-1$) to meet forecasted consumer demand for delivery day $D$. 

Because wind generation is weather-dependent and highly variable:
1. **Decision-Time Information Asymmetry**: Purchasing managers must lock procurement positions before actual delivery, relying on the latest available weather forecasts published prior to the bidding cutoff.
2. **Forecast Error & Cash-out Risk**: When actual wind generation deviates from the day-ahead forecast, the utility experiences an imbalance position. If wind generation falls short of forecast, the supplier is short and must purchase balance power in the intraday market or face system imbalance settlement charges (cash-out prices).
3. **Forecast Evolution Uncertainty**: As delivery approaches, newer meteorological model runs and telemetry update the expected generation profile. Decision-makers need to evaluate how forecasts evolve and how stable they are across lead times.

### Solution: WindLens
**WindLens** provides a data-driven decision cockpit tailored for utility power buyers:
- **Executive Dashboard**: Unified view of delivery dates in January 2026, comparing delivered actuals against decision-time forecasts, quantifying Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and systematic bias, alongside potential energy shortfall exposures.
- **Decision-Time Forecast Explorer**: Interactive tool allowing procurement analysts to select any delivery date and settlement period, apply configurable decision cutoff deadlines (preventing look-ahead bias), and audit the exact forecast vintage available at that critical moment.
- **Forecast Evolution Analysis**: Multi-vintage trajectory tracking showing how successive forecast runs converged towards actual delivered generation as delivery time approached.
- **Accuracy Analysis**: Statistical distribution of forecast errors (in MW bins), over- vs. under-estimation counts, daily aggregations, and granular half-hourly reconciliation tables.
- **Data Quality & Source Provenance**: Telemetry panel documenting observation counts, Elexon BMRS streams (`FUELHH` and `WINDFOR`), and caching status.

---

## 2. Architecture & Data Flow

```mermaid
flowchart TD
    subgraph External ["Official Elexon BMRS API"]
        BMRS_ACT["FUELHH Stream<br/>(Half-Hourly Actual Wind Generation)"]
        BMRS_FC["WINDFOR Stream<br/>(Multi-Vintage Wind Generation Forecasts)"]
    end

    subgraph Backend ["WindLens Backend (FastAPI / Python)"]
        CLIENT["ElexonClient<br/>(HTTPX, Retries, Europe/London Normalizer)"]
        INGEST["IngestionService<br/>(Chunked ingestion & upsert)"]
        DB[(SQLite Cache<br/>windlens.db<br/>1,489 Actuals | 19,272 Forecasts)]
        FC_SERV["ForecastService<br/>(Cutoff Filtering, Zero Look-Ahead Bias,<br/>Lead-Time Calculation, Evolution)"]
        METRICS["MetricsService<br/>(MAE, RMSE, Bias, Shortfall MWh,<br/>Error Distribution, Coverage %)"]
        ROUTERS["REST API Routers<br/>(/dashboard, /forecast-at-cutoff,<br/>/forecast-evolution, /accuracy, /data-status)"]
    end

    subgraph Frontend ["WindLens Frontend (React / TypeScript / Vite)"]
        UI_STORE["State & API Service Layer<br/>(api.ts)"]
        VIEW_EXEC["Executive Dashboard<br/>(KPI Cards, Charts, Daily Table)"]
        VIEW_DEC["Decision Explorer<br/>(Cutoff Selector, Vintage Audit)"]
        VIEW_EVO["Forecast Evolution<br/>(Vintage Convergence Chart)"]
        VIEW_ACC["Accuracy Analysis<br/>(Histogram, Granular Log)"]
        VIEW_DQ["Data Quality Panel<br/>(Source Provenance, Sync Controls)"]
    end

    BMRS_ACT -->|publishDateTimeFrom/To| CLIENT
    BMRS_FC -->|publishDateTimeFrom/To| CLIENT
    CLIENT --> INGEST --> DB
    DB --> FC_SERV
    FC_SERV --> METRICS
    METRICS --> ROUTERS
    ROUTERS -->|REST JSON| UI_STORE
    UI_STORE --> VIEW_EXEC
    UI_STORE --> VIEW_DEC
    UI_STORE --> VIEW_EVO
    UI_STORE --> VIEW_ACC
    UI_STORE --> VIEW_DQ
```

---

## 3. Technology Stack

| Layer | Technologies | Justification |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React | Type-safe, high-performance responsive UI tailored with enterprise navy/slate/teal aesthetic and interactive SVG charting. |
| **Backend** | Python 3.12, FastAPI, Pandas, NumPy, Pydantic, HTTPX | High-throughput asynchronous REST API with strict request/response validation and vectorized numerical metric computations. |
| **Persistence** | SQLite with structured indexes | Compact, zero-configuration local cache capable of sub-millisecond query latency for 20k+ records. Easily portable to PostgreSQL. |
| **Testing** | Pytest, Pytest-Asyncio, Starlette TestClient, TypeScript `tsc -b` | Automated unit and integration testing covering cutoff logic, look-ahead bias prevention, timezone conversions, and build integrity. |
| **DevOps** | Docker, Docker Compose, Multi-stage Nginx, GitHub Actions CI | Reproducible containerized execution, reverse-proxy routing, and continuous integration pipeline. |

---

## 4. Repository Structure

```text
windlens/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions automated test & build workflow
├── backend/
│   ├── app/
│   │   ├── client/
│   │   │   └── elexon.py          # Elexon BMRS API client (retries, timeouts, normalization)
│   │   ├── db/
│   │   │   └── database.py        # SQLite schema initialization, connection pooling, indexes
│   │   ├── routers/
│   │   │   ├── accuracy.py        # /api/accuracy router
│   │   │   ├── dashboard.py       # /api/dashboard router
│   │   │   ├── data_status.py     # /api/data-status & /api/data/sync router
│   │   │   ├── forecasts.py       # /api/forecast-at-cutoff & /api/forecast-evolution
│   │   │   └── health.py          # /api/health router
│   │   ├── schemas/               # Pydantic validation schemas
│   │   │   ├── accuracy.py
│   │   │   ├── dashboard.py
│   │   │   ├── data_status.py
│   │   │   └── forecast.py
│   │   ├── services/
│   │   │   ├── forecast_service.py# Core cutoff selection logic & evolution engine
│   │   │   ├── ingestion.py       # Chunked BMRS data ingestion & caching
│   │   │   └── metrics_service.py # MAE, RMSE, bias, shortfall MWh, distribution
│   │   ├── config.py              # Environment configuration & defaults
│   │   └── main.py                # FastAPI application entrypoint & CORS
│   ├── data/
│   │   └── windlens.db            # Cached SQLite database (1,489 actuals, 19,272 forecasts)
│   ├── scripts/
│   │   └── seed_elexon_data.py    # Production ingestion seed script for January 2026
│   ├── tests/
│   │   ├── test_api.py            # API endpoint integration tests
│   │   ├── test_elexon_client.py  # Normalization & fuel filtering tests
│   │   ├── test_forecast_selection.py # Cutoff boundary & lookahead bias tests
│   │   └── test_metrics.py        # MAE, RMSE, shortfall, and zero-handling tests
│   ├── Dockerfile                 # Backend container definition
│   ├── requirements.txt           # Pinned Python dependencies
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/            # Recharts components (Generation, Error, Evolution, Dist)
│   │   │   ├── common/            # MetricCard, CutoffSelector, Loading, Error, Empty states
│   │   │   ├── layout/            # Sidebar, Header, AppLayout
│   │   │   └── tables/            # DailySummaryTable, IntervalDataTable
│   │   ├── pages/                 # 5 application views
│   │   ├── services/api.ts        # Typed frontend HTTP service layer
│   │   ├── types/index.ts         # TypeScript data contracts
│   │   ├── App.tsx                # Application root & view routing
│   │   ├── index.css              # Tailwind base & custom scrollbars
│   │   └── main.tsx
│   ├── Dockerfile                 # Multi-stage build (Node builder -> Nginx Alpine)
│   ├── nginx.conf                 # Nginx reverse proxy configuration (/api -> backend:8000)
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .dockerignore
├── docker-compose.yml             # Orchestration for backend & frontend
├── .env.example                   # Environment variable template
├── .gitignore
├── DEMO_SCRIPT.md                 # 10-minute demonstration & technical review presentation script
└── README.md                      # Comprehensive project documentation
```

---

## 5. Elexon Data Sources & Processing

### Official Datasets
1. **Actual Wind Generation (`FUELHH`)**:
   - Stream Endpoint: `https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream`
   - Filter criteria: `fuelType == "WIND"`
   - Extracted fields: `startTime` (interval delivery start), `publishTime`, `settlementDate`, `settlementPeriod` (1–48), and `generation` (MW).
   - January 2026 coverage: **1,489 half-hourly records** (48 periods/day $\times$ 31 days).
2. **Wind Generation Forecasts (`WINDFOR`)**:
   - Stream Endpoint: `https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream`
   - Extracted fields: `publishTime` (vintage timestamp), `startTime` (target delivery interval), `generation` (forecast MW).
   - Ingested range: Published from `2025-12-30T00:00:00Z` to `2026-01-31T23:59:59Z`.
   - Total forecast vintages cached: **19,272 records** providing hourly forecasts across multi-day horizons.

---

## 6. Critical Forecast Selection Logic & Look-Ahead Bias Prevention

For each half-hourly delivery interval ($T_{\text{delivery}}$):
1. **Identify Target Interval**: Extract `start_time` (e.g. `2026-01-05T12:00:00Z`).
2. **Establish Applied Cutoff Timestamp**:
   - *Day-Ahead Cutoff (Default Utility Assumption)*: $D-1$ at 12:00:00 UK Local Time (`Europe/London`).
   - For delivery date `2026-01-05`, the cutoff timestamp is `2026-01-04T12:00:00Z`.
3. **Filter Candidate Vintages**:
   $$\text{Candidate Vintages} = \{ v \in \text{WINDFOR} \mid v.\text{start\_time} = T_{\text{delivery}} \land v.\text{publish\_time} \le T_{\text{cutoff}} \}$$
4. **Select Latest Eligible Vintage**:
   $$v^* = \arg\max_{v \in \text{Candidate Vintages}} (v.\text{publish\_time})$$
5. **Strict Look-Ahead Bias Prevention**: Any forecast published after $T_{\text{cutoff}}$ (e.g. at 14:30 or intraday) is strictly excluded from decision-time evaluation. Unit tests explicitly verify this boundary condition.
6. **Reconcile with Actuals**: Match $v^*.\text{generation\_mw}$ against delivered actual generation for that interval.
   $$\text{error\_mw} = \text{forecast\_generation\_mw} - \text{actual\_generation\_mw}$$

---

## 7. Metrics & Methodology

- **Error Definition**:
  $$\text{error\_mw} = \text{forecast\_generation\_mw} - \text{actual\_generation\_mw}$$
  - **Positive error ($>0$)**: Forecast overestimated actual generation (overforecasting).
  - **Negative error ($<0$)**: Forecast underestimated actual generation (underforecasting).
- **Mean Absolute Error (MAE)**:
  $$\text{MAE} = \frac{1}{N} \sum_{i=1}^{N} \lvert \text{error\_mw}_i \rvert$$
- **Root Mean Squared Error (RMSE)**:
  $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (\text{error\_mw}_i)^2}$$
- **Forecast Bias (Mean Error)**:
  $$\text{Mean Error} = \frac{1}{N} \sum_{i=1}^{N} \text{error\_mw}_i$$
- **Forecast Coverage %**:
  $$\text{Coverage} = \frac{\text{Matched Intervals}}{\text{Expected Delivery Intervals}} \times 100\%$$
- **Procurement Wind Shortfall (MWh)**:
  $$\text{potential\_wind\_shortfall\_mw} = \max(\text{actual\_generation\_mw} - \text{forecast\_generation\_mw}, 0)$$
  $$\text{Total Shortfall MWh} = \sum (\text{potential\_wind\_shortfall\_mw} \times 0.5\text{ h})$$
- **Wind Surplus (MWh)**:
  $$\text{surplus\_mw} = \max(\text{forecast\_generation\_mw} - \text{actual\_generation\_mw}, 0)$$
  $$\text{Total Surplus MWh} = \sum (\text{surplus\_mw} \times 0.5\text{ h})$$

> **Methodological Policy on MAPE**: Mean Absolute Percentage Error (MAPE) is intentionally excluded as a primary metric because when actual wind generation is near zero, the percentage calculation yields extreme or undefined asymptotic spikes, distorting utility portfolio assessment.

> **Missing Data Policy**: Unmatched intervals (such as half-hourly periods without an exact hourly WINDFOR record) are **never replaced with zero**. They are strictly omitted from error metric calculations and accounted for transparently via the Forecast Coverage metric.

---

## 8. Timezone & Daylight-Saving Treatment

All timestamps are stored in standard UTC ISO-8601 (`YYYY-MM-DDTHH:MM:SSZ`) to guarantee unambiguous chronological sequencing.
- **UK Local Time**: Business cutoffs (e.g. Day-Ahead 12:00) are resolved using Python's `zoneinfo.ZoneInfo("Europe/London")`.
- In January 2026, the UK observes Greenwich Mean Time (GMT, UTC+0).
- The codebase handles British Summer Time (BST, UTC+1) transitions cleanly, ensuring that during summer clock transitions the 23-hour and 25-hour settlement days (46 or 50 settlement periods) are parsed without drift.

---

## 9. Quickstart & Local Installation

### Prerequisites
- Python 3.11+
- Node.js v18+ & npm
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/anonymous-org/windlens-uk.git
cd windlens-uk
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux / macOS:
# source venv/bin/activate

pip install -r requirements.txt

# Run backend tests
python -m pytest tests -v

# Start FastAPI backend server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Backend API will be accessible at `http://127.0.0.1:8000`.  
Swagger documentation available at `http://127.0.0.1:8000/docs`.

### 3. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install

# Run TypeScript check & build verification
npm run build

# Start frontend development server
npm run dev
```
Frontend will be available at `http://localhost:5173`.

---

## 10. Docker & Containerized Startup

Run the complete multi-service stack with a single command:

```bash
docker compose up --build -d
```

- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

To stop the containers:
```bash
docker compose down
```

---

## 11. Automated Testing Suite

The repository includes a comprehensive automated test suite with 100% pass rates:

```bash
# Run backend pytest suite
pytest backend/tests -v
```

### Test Coverage Highlights:
- `test_elexon_client.py`: Verifies UTC normalization, timezone offsets, and filtering out non-wind fuel types (`BIOMASS`, `NUCLEAR`, `CCGT`).
- `test_forecast_selection.py`: Validates cutoff timestamp derivation, latest eligible vintage selection, look-ahead bias prevention, and evolution tracking.
- `test_metrics.py`: Tests mathematical correctness of MAE, RMSE, mean error bias, shortfall MWh, error distribution binning, and zero-division handling.
- `test_api.py`: Tests all REST endpoints (`/health`, `/dashboard`, `/forecast-at-cutoff`, `/forecast-evolution`, `/accuracy`, `/data-status`) with validation error handling (e.g. `start_date > end_date` returns 400).

---

## 12. Deployment Instructions

### Production Deployment Strategy
1. **Frontend**: Deployable to **Vercel** or **AWS S3/CloudFront**.
   - Build command: `npm run build`
   - Output directory: `dist`
   - Set environment variable: `VITE_API_BASE_URL=https://api.yourdomain.com/api`
2. **Backend**: Deployable to **Render**, **Railway**, **Fly.io**, or **AWS ECS/Fargate**.
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - Persistent disk mount: `/app/data` (for SQLite database `windlens.db`)
   - Environment variables: `ELEXON_API_BASE=https://data.elexon.co.uk/bmrs/api/v1`

> **Deployment Status**: Production containers and Dockerfile configurations are fully tested and ready for deployment. External cloud provider deployment remains pending until target infrastructure credentials and domain records are assigned.

---

## 13. REST API Documentation

| Method | Endpoint | Description | Query Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status and SQLite record counts | None |
| `GET` | `/api/dashboard` | Summary procurement metrics, daily table, and time-series | `start_date`, `end_date`, `cutoff_time`, `cutoff_type` |
| `GET` | `/api/forecast-at-cutoff` | Audits latest eligible forecast vintage for specific interval | `delivery_date`, `settlement_period`, `cutoff_time`, `cutoff_type` |
| `GET` | `/api/forecast-evolution` | All published forecast vintages converging to target interval | `start_time` (e.g. `2026-01-05T12:00:00Z`) |
| `GET` | `/api/accuracy` | Statistical accuracy metrics, error histogram, detailed log | `start_date`, `end_date`, `cutoff_time`, `cutoff_type`, `bin_width` |
| `GET` | `/api/data-status` | Source dataset metadata, observation counts, sync logs | None |
| `POST` | `/api/data/sync` | Triggers on-demand synchronization with Elexon BMRS | `start_date`, `end_date`, `sync_now` |

---

## 14. AI Tool Usage Disclosure

In compliance with the project guidelines, AI coding assistance (Antigravity AI Agent powered by Google DeepMind) was utilized during the development of WindLens for code scaffolding, algorithmic validation, test generation, and documentation drafting. All architectural designs, forecast selection logic, mathematical formulas, and data integrations were verified against official Elexon documentation and validated with automated test suites.
