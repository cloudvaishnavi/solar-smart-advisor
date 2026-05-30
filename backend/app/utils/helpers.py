"""
SolarSmart Advisor — Utility Helpers
General-purpose helper functions used across the backend.
"""
from datetime import date


def days_since(date_str: str) -> int:
    """Return how many days ago a date string (YYYY-MM-DD) was."""
    try:
        d = date.fromisoformat(date_str)
        return (date.today() - d).days
    except ValueError:
        return 0


def clamp(value: float, lo: float, hi: float) -> float:
    """Clamp a float value between lo and hi."""
    return max(lo, min(hi, value))


def kwh_to_co2(kwh: float, factor: float = 0.82) -> float:
    """Convert kWh of grid electricity to kg CO₂ using Indian grid factor."""
    return round(kwh * factor, 3)


def format_inr(amount: float) -> str:
    """Format a float as Indian Rupees string."""
    return f"₹{amount:,.0f}"
