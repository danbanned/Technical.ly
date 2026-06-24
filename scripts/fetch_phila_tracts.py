"""
fetch_phila_tracts.py
─────────────────────
Builds a full 408-tract Philadelphia GeoJSON with real ACS economic data
and Opportunity Atlas mobility scores, ready to feed into enrich_buildings.py.

Usage
-----
  pip install requests pandas geopandas

  # Basic (income + unemployment only, no mobility scores):
  python fetch_phila_tracts.py --census-key YOUR_KEY

  # Full (adds Opportunity Atlas mobility scores):
  # 1. Download the tract-level CSV from:
  #    https://opportunityinsights.org/wp-content/uploads/2018/10/tract_outcomes.zip
  # 2. Unzip — you want tract_outcomes_simple.csv
  python fetch_phila_tracts.py --census-key YOUR_KEY --atlas tract_outcomes_simple.csv

Output
------
  scripts/phila_tracts_full.geojson   ← drop-in replacement for the 16-tract seed

Census API key signup (free, instant):
  https://api.census.gov/data/key_signup.html

Opportunity Atlas data download (free, ~10 MB):
  https://opportunityinsights.org/wp-content/uploads/2018/10/tract_outcomes.zip
"""

import argparse
import json
import sys
import requests
import pandas as pd
import geopandas as gpd
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

STATE_FIPS  = "42"       # Pennsylvania
COUNTY_FIPS = "101"      # Philadelphia
ACS_YEAR    = 2022       # Most recent 5-year ACS with full tract coverage

# ACS variable codes
#   B19013_001E  Median household income (dollars)
#   B23025_003E  Civilian labor force
#   B23025_005E  Unemployed
ACS_VARS = "B19013_001E,B23025_003E,B23025_005E"

# Census TIGER tract boundary URL (2022 vintage)
TIGER_URL = (
    "https://www2.census.gov/geo/tiger/TIGER2022/TRACT/"
    "tl_2022_42_tract.zip"
)

OUT_FILE = Path(__file__).parent / "phila_tracts_full.geojson"

# ── Helpers ───────────────────────────────────────────────────────────────────

def fetch_acs(census_key: str) -> pd.DataFrame:
    url = (
        f"https://api.census.gov/data/{ACS_YEAR}/acs/acs5"
        f"?get=NAME,{ACS_VARS}"
        f"&for=tract:*"
        f"&in=state:{STATE_FIPS}%20county:{COUNTY_FIPS}"
        f"&key={census_key}"
    )
    print(f"Fetching ACS {ACS_YEAR} data…")
    resp = requests.get(url, timeout=30)
    if not resp.ok or not resp.text.strip().startswith("["):
        print(f"  Census API error ({resp.status_code}):\n  {resp.text[:400]}")
        sys.exit(1)
    data = resp.json()
    headers, *rows = data
    df = pd.DataFrame(rows, columns=headers)

    df["tract_geoid"] = df["state"] + df["county"] + df["tract"]  # 11-digit GEOID
    df["medianIncome"] = pd.to_numeric(df["B19013_001E"], errors="coerce").clip(lower=0)
    df["laborForce"]   = pd.to_numeric(df["B23025_003E"], errors="coerce")
    df["unemployed"]   = pd.to_numeric(df["B23025_005E"], errors="coerce")
    df["unemploymentRate"] = (
        (df["unemployed"] / df["laborForce"].replace(0, float("nan"))) * 100
    ).round(2)

    # Normalise income to 0-100 for CBS compatibility (cap at $150k)
    df["incomeNorm"] = (df["medianIncome"].clip(upper=150_000) / 150_000 * 100).round(1)

    print(f"  → {len(df)} tracts fetched")
    return df[["tract_geoid", "medianIncome", "incomeNorm", "unemploymentRate"]]


def fetch_tiger() -> gpd.GeoDataFrame:
    print("Fetching Census TIGER tract boundaries…")
    gdf = gpd.read_file(TIGER_URL)
    # Filter to Philadelphia county
    phila = gdf[(gdf["STATEFP"] == STATE_FIPS) & (gdf["COUNTYFP"] == COUNTY_FIPS)].copy()
    phila["tract_geoid"] = phila["GEOID"]
    phila = phila.to_crs("EPSG:4326")
    print(f"  → {len(phila)} Philadelphia tracts in TIGER")
    return phila[["tract_geoid", "NAME", "geometry"]]


def load_atlas(atlas_path: str) -> pd.DataFrame:
    print(f"Loading Opportunity Atlas from {atlas_path}…")
    df = pd.read_csv(atlas_path, dtype={"state": str, "county": str, "tract": str})

    # Filter to Philadelphia
    df = df[(df["state"] == STATE_FIPS) & (df["county"] == COUNTY_FIPS)].copy()

    # Build 11-digit GEOID (state=2, county=3, tract=6 — zero-pad each)
    df["tract_geoid"] = (
        df["state"].str.zfill(2)
        + df["county"].str.zfill(3)
        + df["tract"].str.zfill(6)
    )

    # kfr_pooled_pooled_p25 = mean household income rank at age 35 for
    # children whose parents were at the 25th percentile — the core
    # upward-mobility metric used in the seed data.
    mob_col = "kfr_pooled_pooled_p25"
    if mob_col not in df.columns:
        print(f"  ⚠ Column '{mob_col}' not found. Available: {list(df.columns[:10])}…")
        print("  Skipping mobility scores — tracts will use income proxy instead.")
        return pd.DataFrame(columns=["tract_geoid", "mobilityScore"])

    # Convert percentile rank (0-1) to 0-100 score
    df["mobilityScore"] = (pd.to_numeric(df[mob_col], errors="coerce") * 100).round(1)
    print(f"  → {len(df)} Philadelphia tracts in Atlas")
    return df[["tract_geoid", "mobilityScore"]]


def compute_cbs(row: pd.Series) -> float:
    """
    Simplified CBS matching the weights in src/data/config.js:
      outcomeIndex = mobility*0.4 + income*0.35 + (1-unemployment)*0.25
    Returns 0-10.
    """
    mob  = (row.get("mobilityScore") or 0) / 100   # 0-1
    inc  = (row.get("incomeNorm")    or 0) / 100   # 0-1
    unem = min((row.get("unemploymentRate") or 0) / 100, 1.0)

    outcome = mob * 0.4 + inc * 0.35 + (1 - unem) * 0.25
    # Innovation index placeholder (0.5) — enrich_buildings.py will overwrite
    # with the real proximity-weighted value during the spatial join.
    innovation = 0.5
    cbs = (innovation * 0.5 + outcome * 0.5) * 10
    return round(cbs, 2)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Build full Philadelphia tract GeoJSON")
    parser.add_argument("--census-key", required=True, help="Census API key")
    parser.add_argument("--atlas", default=None,
                        help="Path to Opportunity Atlas tract_outcomes_simple.csv")
    args = parser.parse_args()

    # 1. ACS economic data
    acs = fetch_acs(args.census_key)

    # 2. Tract boundaries
    tiger = fetch_tiger()

    # 3. Opportunity Atlas mobility (optional)
    if args.atlas:
        atlas = load_atlas(args.atlas)
    else:
        print("No --atlas file provided. mobilityScore will be estimated from income.")
        atlas = pd.DataFrame(columns=["tract_geoid", "mobilityScore"])

    # 4. Merge
    gdf = tiger.merge(acs, on="tract_geoid", how="left")
    if not atlas.empty:
        gdf = gdf.merge(atlas, on="tract_geoid", how="left")
    else:
        # Proxy: use income percentile as mobility stand-in
        gdf["mobilityScore"] = gdf["incomeNorm"]

    # 5. Fill gaps
    gdf["mobilityScore"]   = gdf["mobilityScore"].fillna(gdf["incomeNorm"]).fillna(40.0)
    gdf["medianIncome"]    = gdf["medianIncome"].fillna(45000)
    gdf["unemploymentRate"]= gdf["unemploymentRate"].fillna(8.0)
    gdf["incomeNorm"]      = gdf["incomeNorm"].fillna(30.0)

    # 6. Placeholder innovation index (enrich_buildings.py recomputes via spatial join)
    gdf["innovationIndex"] = 0.5
    gdf["outcomeIndex"]    = (
        gdf["mobilityScore"] / 100 * 0.4
        + gdf["incomeNorm"]  / 100 * 0.35
        + (1 - (gdf["unemploymentRate"] / 100).clip(upper=1)) * 0.25
    ).round(3)
    gdf["cbs"] = gdf.apply(compute_cbs, axis=1)

    # 7. Rename to match enrich_buildings.py expectations
    gdf = gdf.rename(columns={"tract_geoid": "id", "NAME": "neighborhood"})
    gdf["neighborhood"] = gdf["neighborhood"].fillna("Philadelphia")

    # 8. Write
    gdf.to_file(OUT_FILE, driver="GeoJSON")
    print(f"\n✓ Written: {OUT_FILE}")
    print(f"  {len(gdf)} tracts  |  columns: {list(gdf.columns)}")
    print("\nNext steps:")
    print("  1. Update enrich_buildings.py TRACTS_FILE to point at phila_tracts_full.geojson")
    print("  2. python scripts/enrich_buildings.py")
    print("  3. Upload the new enriched_buildings.geojson to Cesium ion (replace asset 4979179)")


if __name__ == "__main__":
    main()
