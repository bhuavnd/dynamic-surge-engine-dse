import time
import uuid
import sys
import os
import traceback

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from simulator.utils import generate_random_location, move_driver
from simulator.geofence import get_zone
from simulator.redis_client import redis_client


def run_driver_simulator():
    drivers = {}

    # reduced from 300
    for _ in range(120):
        driver_id = str(uuid.uuid4())
        lat, lon = generate_random_location()
        drivers[driver_id] = {"lat": lat, "lon": lon}

    print("[INFO] Driver simulator started...")

    while True:
        try:
            for driver_id in drivers:
                lat = drivers[driver_id]["lat"]
                lon = drivers[driver_id]["lon"]

                lat, lon = move_driver(lat, lon)
                zone = get_zone(lat, lon)

                drivers[driver_id]["lat"] = lat
                drivers[driver_id]["lon"] = lon

                redis_client.hset(
                    f"driver:{driver_id}",
                    mapping={
                        "lat": lat,
                        "lon": lon,
                        "zone": zone,
                        "timestamp": time.time()
                    }
                )

                redis_client.expire(f"driver:{driver_id}", 120)

            time.sleep(2)

        except Exception as e:
            print("[ERROR]", e)
            traceback.print_exc()
            time.sleep(2)


if __name__ == "__main__":
    run_driver_simulator()