import time
import sys
import random

from simulator.redis_client import redis_client
from ml.predictor import predict_surge, rule_based_surge

SURGE_INTERVAL = 4


def fetch_entities(prefix):
    items = []
    for key in redis_client.scan_iter(f"{prefix}:*"):
        row = redis_client.hgetall(key)
        if row:
            items.append(row)
    return items


def group_by_zone(rows):
    result = {}
    for row in rows:
        zone = row.get("zone")
        if zone:
            result[zone] = result.get(zone, 0) + 1
    return result


def calculate_surge(drivers, riders, zone):
    rule = rule_based_surge(drivers, riders)
    ml = predict_surge(drivers, riders, zone)

    final = (0.65 * rule) + (0.35 * ml)

    # demand boost for demo visibility
    if riders > drivers:
        final += min((riders - drivers) * 0.08, 1.2)

    # hotspot randomness for realism
    final += random.uniform(-0.05, 0.15)

    prev = redis_client.hget(f"surge:{zone}", "surge_multiplier")
    if prev:
        try:
            final = (0.55 * float(prev)) + (0.45 * final)
        except:
            pass

    final = round(max(1.0, min(final, 4.0)), 2)
    return round(rule, 2), round(ml, 2), final


def run():
    print("[INFO] Final Surge Engine started...")

    try:
        while True:
            drivers = group_by_zone(fetch_entities("driver"))
            riders = group_by_zone(fetch_entities("rider"))

            zones = set(drivers.keys()) | set(riders.keys())

            for zone in zones:
                d = drivers.get(zone, 0)
                r = riders.get(zone, 0)

                rule, ml, final = calculate_surge(d, r, zone)

                redis_client.hset(
                    f"surge:{zone}",
                    mapping={
                        "drivers": d,
                        "riders": r,
                        "rule_surge": rule,
                        "ml_surge": ml,
                        "surge_multiplier": final,
                        "timestamp": time.time()
                    }
                )

                redis_client.expire(f"surge:{zone}", 120)

            time.sleep(SURGE_INTERVAL)

    except KeyboardInterrupt:
        print("[STOP] Surge engine stopped.")
        sys.exit(0)


if __name__ == "__main__":
    run()