"""
SolarSmart Advisor — FastAPI Application Entry
Configures CORS, mounts routers, and manages DB lifecycle.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import database
from app.routers import simulation, settings as settings_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


# ── App lifecycle ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Connect to DB on startup, disconnect on shutdown."""
    logger.info("🚀 SolarSmart Advisor starting up …")
    database.connect()
    yield
    database.disconnect()
    logger.info("👋 SolarSmart Advisor shut down.")


# ── Create FastAPI app ────────────────────────────────────────────────────────

app = FastAPI(
    title="SolarSmart Advisor API",
    description=(
        "Intelligent Energy Management for Indian households with rooftop solar. "
        "Phase 1: Rule-based MVP with explainable decision logs."
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# ── CORS Middleware ───────────────────────────────────────────────────────────
# Supports localhost development AND Vercel production deployments.
# The ALLOWED_ORIGINS env var is comma-separated; wildcard *.vercel.app is
# expanded manually because the standard middleware doesn't support wildcards.

raw_origins = settings.ALLOWED_ORIGINS.split(",")
explicit_origins = [o.strip() for o in raw_origins if "*" not in o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=explicit_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app",   # Matches any local port and Vercel previews
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(simulation.router)
app.include_router(settings_router.router)


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
async def root():
    return {
        "service": "SolarSmart Advisor API",
        "version": "1.0.0",
        "status": "running",
        "db_mode": "local_json" if database.use_local else "mongodb",
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
