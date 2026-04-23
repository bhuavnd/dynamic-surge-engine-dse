import random
from typing import Tuple

MIN_LAT, MAX_LAT = 12.85, 13.05
MIN_LON, MAX_LON = 77.45, 77.75

HOTSPOTS = [
    (12.9756, 77.6050),   # MG Road
    (12.9352, 77.6245),   # Koramangala
    (12.9784, 77.6408),   # Indiranagar
    (12.9116, 77.6474),   # HSR
]


def generate_random_location() -> Tuple[float, float]:
    if random.random() < 0.7:
        base_lat, base_lon = random.choice(HOTSPOTS)
        lat = base_lat + random.uniform(-0.01, 0.01)
        lon = base_lon + random.uniform(-0.01, 0.01)
    else:
        lat = random.uniform(MIN_LAT, MAX_LAT)
        lon = random.uniform(MIN_LON, MAX_LON)

    return lat, lon


def move_driver(lat: float, lon: float) -> Tuple[float, float]:
    lat += random.uniform(-0.001, 0.001)
    lon += random.uniform(-0.001, 0.001)

    lat = max(MIN_LAT, min(lat, MAX_LAT))
    lon = max(MIN_LON, min(lon, MAX_LON))

    return lat, lon