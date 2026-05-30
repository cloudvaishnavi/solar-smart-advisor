# SolarSmart Advisor ☀️🔋

Intelligent Energy Management Dashboard for Indian households with rooftop solar + battery systems.

SolarSmart Advisor addresses India-specific solar challenges: **frequent grid outages**, **heavy monsoon seasons**, **fast dust accumulation**, and the **PM Surya Ghar subsidy scheme**. The dashboard features an **Explainable Decision Log** that explains the *why* behind every battery/grid routing decision.

---

## Key Features

1. **Intelligent Rule-Based Dispatch**:
   - **Cost-Save 💰**: Peak shaving by discharging the battery during expensive evening peak hours (6 PM - 10 PM) and charging during off-peak night slots.
   - **Backup Priority 🔋**: Maintains battery SoC at 90%+ to guarantee backup power in outage-prone regions.
   - **Carbon-First 🌍**: Maximizes clean self-consumption, minimizing imports from grid carbon.
   - **Balanced ⚖️**: Maintains a 50% backup reserve, utilizing the remainder for peak tariff savings.

2. **India-Specific Simulation Logic**:
   - **Monsoon Pre-Charge 🌧️**: Auto-detects monsoon season/heavy precipitation and tops up the battery from the grid ahead of expected power cuts.
   - **Power-Cut Simulation 🔴**: Rules predict outage risks based on wind speeds, local rain probability, and typical peak hours.
   - **Dust-Loss Penalty 🧹**: Simulates linear panel efficiency loss due to dust accumulation, reversible via a manual "Clean Panels" trigger.
   - **PM Surya Ghar Muft Bijli Yojana Payback Tracker 🏛️**: Automatically calculates subsidies (e.g., ₹78,000 for system sizes $\ge$ 3 kWp) and projects break-even ROI.

3. **High-Fidelity Explainable Logs**:
   - Each simulation hour provides a clear, natural language explanation detailing why the system routed energy in a specific way, along with the precise rupee impact and carbon reduction offset.

---

## Folder Structure

```text
solar-smart-advisor/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI entry point & CORS configuration
│   │   ├── config.py          # Pydantic environment configurations
│   │   ├── database.py        # MongoDB connection with JSON file fallback
│   │   ├── models/            # Pydantic schemas (schemas.py)
│   │   ├── routers/           # Endpoint controllers (simulation.py, settings.py)
│   │   ├── core/              # Rule engine, simulation orchestrator, explainability
│   │   ├── services/          # Open-Meteo weather service
│   │   └── utils/             # Helpers
│   ├── requirements.txt
│   └── run.py
├── frontend/                  # React + Vite + TypeScript + Tailwind CSS
├── data/                      # Sample datasets (energy curves, power cut profile)
├── README.md
└── .env.example
```

---

## Database Fallback Strategy 💾

To ensure the application runs instantly without complex database setups, we have built a **zero-config fallback**:
- The backend attempts to connect to MongoDB using the configured `MONGODB_URI`.
- If MongoDB is unreachable, it logs a warning and automatically falls back to a local JSON database file (`backend/data/local_db.json`). All settings updates and simulation metrics will write to and read from this file.

---

## Quick Start (Local Run) 🚀

### 1. Run the Backend

Navigate to the `backend/` directory:
```bash
cd backend
```

Create a virtual environment and activate it:
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

Install the dependencies:
```bash
pip install -r requirements.txt
```

Create a `.env` file based on `.env.example` in the root:
```bash
# Copy template from root to backend/
cp ../.env.example .env
```

Start the FastAPI application:
```bash
python run.py
```
*The server will start at [http://localhost:8000](http://localhost:8000).*

### 2. Run the Frontend

Navigate to the `frontend/` directory:
```bash
cd ../frontend
```

Install dependencies:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```
*Open [http://localhost:5173](http://localhost:5173) in your browser.*

---

## Deployment Steps (Production-Ready) 🌐

SolarSmart Advisor is configured for standard hosting setups:

### Backend Deployment (Render / Railway)

1. **Host on Render**:
   - Create a new Web Service and link your GitHub repository.
   - Select the **Python** environment.
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `python backend/run.py` (or `uvicorn app.main:app --host 0.0.0.0 --port $PORT` from the `backend/` working directory).
   - Set the following environment variables:
     - `PORT`: Set by Render automatically.
     - `MONGODB_URI`: Link your MongoDB Atlas connection string (or leave empty to fall back to JSON storage).
     - `ALLOWED_ORIGINS`: Comma-separated list containing your Vercel URL (e.g. `https://your-app.vercel.app`).

### Frontend Deployment (Vercel)

1. **Host on Vercel**:
   - Create a new project, select your repository, and target the `frontend` folder as the root directory.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - Set the following environment variable in the Vercel dashboard:
     - `VITE_API_BASE_URL`: The URL of your backend hosted on Render (e.g. `https://solar-smart-advisor-api.onrender.com`).

---

## Future Roadmap: ML Swapping 🔮

The rule-based modules inside `backend/app/core/` are written using pure, stateless functions. This makes it easy to replace rules with Machine Learning models:
- **Solar Forecasting**: Swap `calculate_solar_generation` with an LSTM/XGBoost model trained on historical local solar irradiance.
- **Load Forecasting**: Swappable with a regression model using time-of-day, family size, and historical load charts.
- **Power Cut Classifier**: Swap `predict_power_cut` with a Random Forest binary classifier utilizing storm alerts, transformer load factors, and history.
- **Intelligent Dispatch**: Swap `decide_energy_flow` with a Reinforcement Learning agent (Q-Learning / PPO) optimized to minimize billing costs while maintaining backup safety.
