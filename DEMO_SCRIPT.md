# WindLens — 10-Minute Video Demonstration Script & Recording Guide

> **Note on Submission**: This document contains the complete script, visual cue checklist, and presenter timing guide for the 10-minute unlisted YouTube demonstration. As an automated engineering environment without direct camera/microphone peripherals, the video recording and upload to YouTube remain to be finalized using this exact script.

---

## Demonstration Structure & Timing

| Section | Target Duration | Focus Area | Primary Audience |
| :--- | :--- | :--- | :--- |
| **Part 1: Customer Presentation** | 0:00 – 4:45 (4m 45s) | Business problem, Procurement decision cutoff, Error metrics, Shortfall exposure | Procurement Managers, Trading Analysts, Utility Executives |
| **Transition** | 4:45 – 5:00 (15s) | Section break | — |
| **Part 2: Technical Review** | 5:00 – 9:50 (4m 50s) | Architecture, Elexon BMRS ingestion, Selection logic, Pytest, Docker, CI/CD | Engineering Leads, System Architects, Technical Evaluators |
| **Closing** | 9:50 – 10:00 (10s) | Next steps & wrap-up | All Stakeholders |

---

## Screen Recording Checklist

Before starting the recording, ensure the following tabs are prepared:
- [ ] Browser Tab 1: `http://localhost:5173/` (WindLens UI running locally)
- [ ] Browser Tab 2: `http://localhost:8000/docs` (FastAPI Interactive OpenAPI Swagger docs)
- [ ] Terminal Window: Terminal open at project root showing Docker / Pytest commands ready
- [ ] IDE Window (VS Code): Backend project tree open (`app/client`, `app/services`, `tests/`)

---

## Part 1 — Customer Presentation (0:00 – 4:45)

### [0:00 – 1:00] 1. The Business Problem & Procurement Dilemma
**Screen**: *WindLens Executive Dashboard (`http://localhost:5173/`)*

**Spoken Script**:
> "Good morning. In the UK wholesale electricity market, our procurement team faces a daily financial challenge: purchasing sufficient electricity on the day-ahead auction to cover anticipated demand for tomorrow.
>
> Wind power is one of our largest clean generation sources, but its weather-dependent nature introduces significant volatility. Decisions must be locked in before delivery day—typically around noon on day $D-1$. 
> 
> If we buy based on a wind forecast that subsequently overestimates actual wind production, we are caught short in the physical market and forced to balance our position through expensive intraday trades or volatile cash-out settlement prices. Conversely, underestimating wind forces us to buy excess thermal generation.
> 
> To solve this, we built **WindLens**—a purpose-built analytics platform that links official Elexon BMRS market data directly into our decision-making workflow."

---

### [1:00 – 2:15] 2. Executive Dashboard & Decision-Time Cutoffs
**Screen**: *Highlight top controls, Cutoff Selector, and KPI Cards*  
**Action**: *Hover over the Cutoff Selector showing 'Day-Ahead D-1 12:00 (Default Assumption)' and point out the KPI metrics.*

**Spoken Script**:
> "Here on the Executive Dashboard for January 2026, WindLens provides instant visibility into procurement performance. 
> 
> Notice this top control: **Procurement Decision Cutoff**. Unlike standard retrospective analytics that compare actuals against whatever forecast was published right before the turbines spun, WindLens strictly locks in the forecast that was available **before our purchasing decision deadline**—by default, Day-Ahead 12:00 PM UK local time.
> 
> Across the first week of January:
> - Our **Mean Absolute Error (MAE)** was 2,112 MW, with a Root Mean Squared Error (RMSE) of 2,560 MW.
> - Notice the **Forecast Bias** metric: it shows +1,956 MW in the 'Overestimation' direction across 150 out of 168 matched intervals. This indicates that for this specific week, day-ahead forecasts consistently predicted more wind than the atmosphere actually delivered.
> - In the **Potential Wind Shortfall** panel, we see a cumulative 6,577 MWh of energy shortfall where actual wind fell below our locked forecast. For our trading desk, this is not just an error metric—it represents physical replacement exposure."

---

### [2:15 – 3:15] 3. Generation & Residual Error Time-Series
**Screen**: *Scroll down to the Generation Chart and Forecast Error Profile*  
**Action**: *Hover over peaks where the teal line (forecast) diverges from the slate shaded area (actual generation).*

**Spoken Script**:
> "In this top chart, the slate shaded area represents actual wind generation from Elexon's `FUELHH` dataset, while the teal line represents the decision-time forecast from `WINDFOR`.
> 
> Look at January 1st and 2nd: the forecast anticipated over 20,000 MW of wind output, yet actual generation settled around 15,000 MW.
> 
> Directly below, the **Forecast Error Profile** makes this discrepancy actionable:
> - Teal bars show intervals of overforecasting (potential position surplus).
> - Red bars pinpoint intervals of underforecasting, where wind fell short and created procurement shortfall risk.
> 
> In the table beneath, our desk can review the performance on a daily aggregated basis, tracking actual vs. forecast energy in MWh and daily MAE."

---

### [3:15 – 4:00] 4. Decision-Time Explorer & Vintage Audit
**Screen**: *Click on 'Decision Explorer' in the navy sidebar*  
**Action**: *Select Delivery Date '2026-01-05', Settlement Period 25 (12:00 UTC), and point to the Applied Cutoff and Explanation banner.*

**Spoken Script**:
> "When a trader needs to audit a specific trade, they navigate to the **Decision Explorer**.
> 
> Suppose we are investigating Delivery Date January 5th, Period 25 (noon). WindLens shows us:
> - The interval required delivery at 12:00 UTC.
> - Our configured cutoff was Day-Ahead January 4th at 12:00 UTC.
> - The latest eligible forecast published **before** that cutoff was published at 11:30 AM on January 4th—exactly 24.5 hours prior to delivery, predicting 11,600 MW.
> 
> Newer forecasts published later that evening or during the intraday morning are deliberately excluded from this view to prevent look-ahead bias. This gives management an uncompromised audit trail of what the procurement desk knew at the moment the trade was submitted."

---

### [4:00 – 4:45] 5. Pilot Value & Practical Boundaries
**Screen**: *Return to Executive Dashboard summary*

**Spoken Script**:
> "What is the strategic value of this pilot?
> First, it transforms raw, disjointed Elexon streams into an automated risk cockpit. Second, it quantifies systematic weather model bias, allowing us to apply corrective procurement deratings.
> 
> However, we maintain clear operational boundaries: WindLens is a retrospective forecast analytics tool. It does not replace our full wholesale trading model, as customer demand swings, forward wholesale contract prices, thermal merit orders, and reserve costs are handled by our broader portfolio systems. 
> 
> Now, let's look under the hood at the engineering architecture."

---

## Part 2 — Technical Review (5:00 – 9:50)

### [5:00 – 6:00] 6. Architecture & Data Flow
**Screen**: *Show Mermaid Architecture Diagram in README.md or Slide*

**Spoken Script**:
> "Welcome to the technical review. WindLens is built as a modular, decoupled full-stack application.
> 
> On the ingestion side:
> - We integrate directly with the official **Elexon BMRS API**.
> - Actual generation is retrieved from the `FUELHH` stream and filtered dynamically for `fuelType == WIND`.
> - Forecast vintages are pulled from the `WINDFOR` stream, which publishes rolling wind forecasts across multi-day look-ahead horizons.
> - The ingestion service safely chunks queries to respect Elexon rate limits, normalizes all timestamps to UTC ISO-8601 while handling `Europe/London` timezone transitions, and persists the data into an indexed SQLite database."

---

### [6:00 – 7:15] 7. Forecast Selection Logic & Look-Ahead Bias Prevention
**Screen**: *Open `backend/app/services/forecast_service.py` in VS Code*  
**Action**: *Highlight the `get_forecasts_and_actuals` method (filtering `publish_time <= cutoff`).*

**Spoken Script**:
> "The heart of the application is our **Forecast Selection Service**.
> 
> In energy trading analytics, the most common trap is **look-ahead bias**—inadvertently evaluating a trading decision using forecast data that was only published hours after the decision was finalized.
> 
> In `forecast_service.py`, notice how we handle this:
> - For any delivery interval $T$, we first compute the applicable cutoff in UK local time (`Europe/London`) and normalize it to UTC.
> - When querying the forecast database, we apply a strict SQL filter: `WHERE start_time = :start AND publish_time <= :cutoff`.
> - We order by `publish_time DESC LIMIT 1` to guarantee we extract the latest vintage that was legally available to the trader.
> - Intervals without an eligible forecast are marked as `None` and excluded from error calculations, never silently replaced with zero.
> 
> In the frontend, the **Forecast Evolution** view visualizes all published vintages for any given interval, demonstrating how forecasts converge as delivery approaches."

---

### [7:15 – 8:00] 8. Accuracy Metrics & Missing Data Policies
**Screen**: *Click on 'Accuracy Analysis' in the frontend UI (`http://localhost:5173/`)*  
**Action**: *Demonstrate switching the histogram bin width from 500 MW to 250 MW and show the granular interval error table.*

**Spoken Script**:
> "Let's examine the **Accuracy Analysis** view.
> 
> We compute standard utility metrics: Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and Mean Error bias.
> 
> Two crucial engineering decisions were made here:
> 1. **No MAPE as Primary Metric**: In wind analytics, during low-wind or doldrum intervals where generation approaches zero, Mean Absolute Percentage Error (MAPE) divides by near-zero, producing false 1,000%+ spikes that distort utility performance metrics.
> 2. **Explicit Missing Data Treatment**: In Elexon BMRS, `WINDFOR` forecasts are published at hourly resolution (`:00` timestamps), whereas actuals in `FUELHH` are half-hourly (`:00` and `:30`). Half-hourly intervals without a forecast record are treated as missing observations and reported via our Coverage metric (50% direct hourly coverage), rather than skewing error metrics with fabricated zeros.
> 
> The interactive histogram dynamically recalculates error distributions across selectable 250 MW, 500 MW, or 1000 MW bins."

---

### [8:00 – 8:50] 9. Testing, Docker & CI/CD Pipeline
**Screen**: *Terminal Window*  
**Action**: *Run `pytest backend/tests -v` and show 15 passing tests. Then show `docker-compose.yml` and `.github/workflows/ci.yml`.*

**Spoken Script**:
> "Engineering quality is enforced through automation.
> 
> In the terminal, running `pytest backend/tests` executes our 15 comprehensive unit and integration tests:
> - Normalization and fuel type filtering in `test_elexon_client.py`.
> - Strict cutoff boundary and look-ahead bias prevention in `test_forecast_selection.py`.
> - Vectorized math correctness, shortfall calculations, and zero-handling in `test_metrics.py`.
> - Full FastAPI endpoint contracts in `test_api.py`.
> 
> On the frontend, `tsc -b && vite build` verifies zero TypeScript compilation errors.
> 
> For containerization, our `docker-compose.yml` orchestrates:
> - A lightweight Python 3.12 backend container with health checks.
> - A multi-stage Alpine Nginx frontend serving the static build with a reverse proxy forwarding `/api` calls.
> 
> Our GitHub Actions CI workflow runs both test suites on every push and pull request."

---

### [8:50 – 9:50] 10. Data Quality, Telemetry & Next Steps
**Screen**: *Click on 'Data Quality & Source' in the frontend UI*  
**Action**: *Show the observation counts (1,489 actuals, 19,272 forecasts) and the Ingestion Audit log.*

**Spoken Script**:
> "Finally, the **Data Quality & Source** panel provides full operational provenance.
> 
> We see:
> - 1,489 verified half-hourly actual wind generation records covering 100% of January 2026.
> - 19,272 multi-vintage forecast observations published between December 30th and January 31st.
> - A live audit log tracking every sync operation.
> - A single-click 'Refresh from Elexon BMRS' trigger for automated synchronization.
> 
> **Limitations & Roadmap**:
> In future iterations, we can expand beyond national-level wind to regional DNO breakdowns, incorporate intraday market price feeds (APX / N2EX) to convert shortfall MWh into monetary cash-out risk, and migrate SQLite to PostgreSQL for multi-year historical archives."

---

### [9:50 – 10:00] Closing & Sign-off
**Screen**: *WindLens Executive Dashboard*

**Spoken Script**:
> "WindLens delivers a robust, test-driven, and enterprise-ready solution for utility wind procurement analytics. Thank you for your time."
