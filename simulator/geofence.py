import h3

# Lower resolution = bigger hexagons
# 8 = smaller cells
# 7 = bigger cells (best for demo)
# 6 = very large cells

HEX_RESOLUTION = 7


def get_zone(lat: float, lon: float) -> str:
    return h3.latlng_to_cell(lat, lon, HEX_RESOLUTION)