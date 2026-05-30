"""
SolarSmart Advisor — Database Manager
Connects to MongoDB with automatic fallback to a local JSON file.
This means the app works out-of-the-box without any DB setup.
"""
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from app.config import settings

logger = logging.getLogger(__name__)

# Path to the JSON fallback database (auto-created if missing)
LOCAL_DB_PATH = Path(__file__).parent.parent.parent / "data" / "local_db.json"


class Database:
    """
    Unified database interface.
    Tries MongoDB first; silently falls back to a JSON file on failure.
    """

    def __init__(self):
        self.client: Optional[MongoClient] = None
        self.db = None
        self.use_local: bool = False

    # ── Connection ────────────────────────────────────────────────────────────

    def connect(self):
        """Attempt to connect to MongoDB; fall back to JSON if unavailable."""
        try:
            self.client = MongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=3000,
            )
            # Ping to verify the connection is alive
            self.client.admin.command("ping")
            self.db = self.client[settings.MONGODB_DB_NAME]
            logger.info("✅  Connected to MongoDB at %s", settings.MONGODB_URI)
        except (ConnectionFailure, ServerSelectionTimeoutError):
            logger.warning(
                "⚠️  MongoDB unreachable — switching to local JSON fallback at %s",
                LOCAL_DB_PATH,
            )
            self.use_local = True
            self._init_local_db()

    def disconnect(self):
        """Gracefully close the MongoDB connection."""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")

    # ── Local JSON helpers ────────────────────────────────────────────────────

    def _init_local_db(self):
        """Create the JSON fallback file with empty collections."""
        LOCAL_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not LOCAL_DB_PATH.exists():
            initial = {
                "user_settings": [],
                "simulations": [],
            }
            LOCAL_DB_PATH.write_text(json.dumps(initial, indent=2))

    def _read_local(self) -> Dict[str, Any]:
        return json.loads(LOCAL_DB_PATH.read_text())

    def _write_local(self, data: Dict[str, Any]):
        LOCAL_DB_PATH.write_text(json.dumps(data, indent=2, default=str))

    # ── Settings CRUD ─────────────────────────────────────────────────────────

    def get_settings(self, user_id: str = "default") -> Optional[Dict]:
        """Fetch saved household settings for a user."""
        if self.use_local:
            db = self._read_local()
            for s in db["user_settings"]:
                if s.get("user_id") == user_id:
                    return s
            return None
        return self.db.user_settings.find_one(
            {"user_id": user_id}, {"_id": 0}
        )

    def save_settings(self, user_id: str, data: Dict[str, Any]):
        """Upsert household settings."""
        if self.use_local:
            db = self._read_local()
            db["user_settings"] = [
                s for s in db["user_settings"] if s.get("user_id") != user_id
            ]
            db["user_settings"].append({"user_id": user_id, **data})
            self._write_local(db)
        else:
            self.db.user_settings.update_one(
                {"user_id": user_id}, {"$set": data}, upsert=True
            )

    # ── Simulation CRUD ───────────────────────────────────────────────────────

    def save_simulation(self, simulation_data: Dict[str, Any]):
        """Persist a completed simulation result (last 50 kept in JSON mode)."""
        if self.use_local:
            db = self._read_local()
            db["simulations"].append(simulation_data)
            # Keep only the latest 50 simulations to limit disk usage
            db["simulations"] = db["simulations"][-50:]
            self._write_local(db)
        else:
            self.db.simulations.insert_one(simulation_data)

    def get_recent_simulations(self, limit: int = 10):
        """Return the most recent simulation summaries."""
        if self.use_local:
            db = self._read_local()
            return db["simulations"][-limit:]
        return list(
            self.db.simulations.find({}, {"_id": 0})
            .sort("created_at", -1)
            .limit(limit)
        )


# Global singleton — import `database` wherever DB access is needed
database = Database()
