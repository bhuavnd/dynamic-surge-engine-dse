from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
import threading
import h3

from simulator.redis_client import redis_client
from simulator.driver_simulator import run_driver_simulator
from simulator.rider_simulator import run_rider_simulator
from surge_engine import run as run_surge_engine
from ml.scenario_state import state

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_jobs():
    threading.Thread(target=run_driver_simulator, daemon=True).start()
    threading.Thread(target=run_rider_simulator, daemon=True).start()
    threading.Thread(target=run_surge_engine, daemon=True).start()
    print("[OK] All background jobs started")


@app.get("/")
def root():
    return {"message": "Dynamic Surge API Running"}


@app.get("/drivers")
def get_drivers():
    drivers = []
    keys = list(redis_client.scan_iter("driver:*"))

    for key in keys:
        raw = redis_client.hgetall(key)
        if raw:
            drivers.append({
                "lat": float(raw.get("lat", 0)),
                "lon": float(raw.get("lon", 0)),
                "zone": raw.get("zone")
            })

    return drivers


@app.get("/riders")
def get_riders():
    riders = []
    keys = list(redis_client.scan_iter("rider:*"))

    for key in keys:
        raw = redis_client.hgetall(key)
        if raw:
            riders.append({
                "lat": float(raw.get("lat", 0)),
                "lon": float(raw.get("lon", 0)),
                "zone": raw.get("zone")
            })

    return riders


@app.get("/surge")
def get_surge(zone: str):
    raw = redis_client.hgetall(f"surge:{zone}")
    return raw if raw else {"error": "Zone not found"}


@app.get("/surge/all")
def get_all_surge():
    zones = []
    keys = list(redis_client.scan_iter("surge:*"))

    for key in keys:
        raw = redis_client.hgetall(key)
        if not raw:
            continue

        zone = key.split("surge:")[1]

        boundary = h3.cell_to_boundary(zone)
        polygon = [[lat, lon] for lat, lon in boundary]

        zones.append({
            "area": zone[:8],
            "zone": zone,
            "drivers": int(float(raw.get("drivers", 0))),
            "riders": int(float(raw.get("riders", 0))),
            "rule_surge": float(raw.get("rule_surge", 1)),
            "ml_surge": float(raw.get("ml_surge", 1)),
            "surge_multiplier": float(raw.get("surge_multiplier", 1)),
            "polygons": [polygon]
        })

    return zones


@app.get("/scenario")
def get_scenario():
    return state


@app.post("/scenario")
def update_scenario(payload: dict = Body(...)):
    state["rain"] = int(payload.get("rain", 0))
    state["event"] = int(payload.get("event", 0))
    return {"message": "updated", "state": state}