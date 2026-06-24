"""
enrich_buildings.py
====================
Downloads OSM building footprints for Philadelphia, spatially joins them with
census-tract metrics from a GeoJSON file, and exports an enriched GeoJSON.

Optionally uploads the result to Cesium ion as a 3D Tileset.

Requirements:
    pip install osmnx geopandas shapely requests tqdm

Optional (3D tiling without Cesium ion):
    pip install py3dtiles          # local tiling
    pip install numpy              # py3dtiles dependency

Usage:
    # Basic — enriched GeoJSON only
    python enrich_buildings.py

    # With Cesium ion upload
    python enrich_buildings.py --ion-token YOUR_TOKEN --ion-name "Phila Buildings"

    # Skip the slow OSM download and reuse a cached file
    python enrich_buildings.py --buildings-cache buildings_raw.gpkg
"""

import argparse
import json
import sys
import time
from pathlib import Path

import geopandas as gpd
import osmnx as ox
import requests
from shapely.geometry import Point, shape
from tqdm import tqdm

# ── Constants ─────────────────────────────────────────────────────────────────

PLACE_QUERY   = "Philadelphia, Pennsylvania, USA"
OUTPUT_PATH   = Path("enriched_buildings.geojson")
CACHE_PATH    = Path("buildings_raw.gpkg")

# OSM tags we want to pull through onto each building feature
KEEP_OSM_TAGS = [
    "name", "building", "building:levels", "height",
    "addr:street", "addr:housenumber", "amenity", "shop", "office",
]

# Tract metric columns to join onto buildings
TRACT_METRICS = [
    "tract_id", "neighborhood", "medianIncome", "unemploymentRate",
    "mobilityScore", "innovationIndex", "outcomeIndex", "cbs",
]

# Cesium ion endpoint
ION_API = "https://api.cesium.com/v1"


# ── Step 1: download OSM buildings ────────────────────────────────────────────

def download_buildings(cache_path: Path) -> gpd.GeoDataFrame:
    """
    Fetch building footprints from OSM via osmnx.
    Results are cached to a GeoPackage so re-runs skip the download.
    """
    if cache_path.exists():
        print(f"[buildings] Loading cached footprints from {cache_path}")
        import pyogrio
        layers = pyogrio.list_layers(str(cache_path))
        layer_name = layers[0][0]
        print(f"[buildings] Reading layer: {layer_name}")
        gdf = gpd.read_file(cache_path, layer=layer_name)
        print(f"[buildings] {len(gdf):,} buildings loaded from cache.")
        return gdf

    print(f"[buildings] Downloading OSM building footprints for '{PLACE_QUERY}' …")
    print("            (This can take 2–5 minutes for a full city.)")

    # Use a reliable Overpass mirror with a long timeout.
    # osmnx 2.x uses ox.settings as a config object — set before any query.
    try:
        # osmnx >= 2.0
        ox.settings.overpass_url = "https://overpass.kumi.systems/api/interpreter"
        ox.settings.timeout = 600
    except AttributeError:
        # osmnx < 2.0 fallback
        ox.config(overpass_url="https://overpass.kumi.systems/api/interpreter", timeout=600)

    MIRRORS = [
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass-api.de/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ]

    gdf = None
    last_err = None
    for mirror in MIRRORS:
        try:
            print(f"            Trying mirror: {mirror}")
            try:
                ox.settings.overpass_url = mirror
            except AttributeError:
                ox.config(overpass_url=mirror, timeout=600)

            gdf = ox.features_from_place(PLACE_QUERY, tags={"building": True})
            break  # success
        except Exception as exc:
            print(f"            ✗ Failed ({type(exc).__name__}): {exc}")
            last_err = exc
            continue

    if gdf is None:
        sys.exit(
            f"[ERROR] All Overpass mirrors timed out or failed.\n"
            f"        Last error: {last_err}\n"
            f"        Try again later, or download manually:\n"
            f"          https://download.geofabrik.de/north-america/us/pennsylvania.html\n"
            f"        Then re-run with --buildings-cache <your_file.gpkg>"
        )

    # Keep only polygon geometries (discard nodes/relations that have no area)
    gdf = gdf[gdf.geometry.geom_type.isin(["Polygon", "MultiPolygon"])].copy()
    gdf = gdf.reset_index(drop=True)

    # Flatten multi-index columns that osmnx sometimes produces
    if isinstance(gdf.columns, gpd.pd.MultiIndex):
        gdf.columns = ["_".join(c).strip("_") for c in gdf.columns]

    print(f"[buildings] {len(gdf):,} building polygons retrieved.")

    # Persist for future runs
    gdf.to_file(cache_path, driver="GPKG")
    print(f"[buildings] Cached to {cache_path}")

    return gdf


# ── Step 2: load tract GeoJSON ────────────────────────────────────────────────

def load_tracts(geojson_path: Path) -> gpd.GeoDataFrame:
    """
    Load census tract polygons + metrics from a GeoJSON file.

    The GeoJSON must have each feature's properties include at minimum:
        id, neighborhood, medianIncome, unemploymentRate, mobilityScore

    Optional but used if present:
        innovationIndex, outcomeIndex, cbs
    """
    if not geojson_path.exists():
        sys.exit(
            f"[ERROR] Tract GeoJSON not found at '{geojson_path}'.\n"
            "        Run scripts/export_tracts_geojson.py first, or pass --tracts <path>."
        )

    print(f"[tracts]    Loading tract polygons from {geojson_path} …")
    tracts = gpd.read_file(geojson_path)

    required = {"id", "neighborhood", "medianIncome", "unemploymentRate", "mobilityScore"}
    missing  = required - set(tracts.columns)
    if missing:
        sys.exit(f"[ERROR] Tract GeoJSON is missing required columns: {missing}")

    # Rename 'id' → 'tract_id' to avoid collision with OSM feature id
    tracts = tracts.rename(columns={"id": "tract_id"})

    # Ensure consistent CRS (WGS-84)
    tracts = tracts.to_crs(epsg=4326)

    print(f"[tracts]    {len(tracts)} tracts loaded.")
    return tracts


# ── Step 3: compute building centroids + height ───────────────────────────────

def prepare_buildings(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    Normalise building heights and compute centroids.
    OSM stores height as a free-text tag (e.g. "12", "12 m", "4 levels").
    We parse it into a numeric `height_m` column.
    """
    print("[prepare]   Computing centroids and normalising heights …")

    # Project to a metre-based CRS for accurate centroid calculation,
    # then project back to WGS-84 for the spatial join.
    gdf_m = gdf.to_crs(epsg=3857)
    gdf["centroid_geom"] = gdf_m.centroid.to_crs(epsg=4326)

    gdf["centroid_lon"] = gdf["centroid_geom"].x
    gdf["centroid_lat"] = gdf["centroid_geom"].y

    # Parse height: prefer explicit 'height' tag, fall back to building:levels * 3 m
    def parse_height(row) -> float | None:
        raw_h = row.get("height") or row.get("height_1")
        raw_l = row.get("building:levels") or row.get("building_levels")

        if raw_h:
            try:
                # Strip non-numeric suffixes like " m", " ft"
                val = float(str(raw_h).split()[0])
                return round(val, 1)
            except ValueError:
                pass

        if raw_l:
            try:
                return round(float(str(raw_l).split()[0]) * 3.0, 1)
            except ValueError:
                pass

        return None  # unknown height

    gdf["height_m"] = [parse_height(r) for _, r in tqdm(
        gdf.iterrows(), total=len(gdf), desc="  heights", unit="bldg"
    )]

    return gdf


# ── Step 4: spatial join ──────────────────────────────────────────────────────

def spatial_join(buildings: gpd.GeoDataFrame, tracts: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """
    For each building, find the tract whose polygon contains the building's centroid.
    Buildings whose centroids fall outside all tract polygons get NaN metrics.
    """
    print("[join]      Performing spatial join (centroid-in-polygon) …")

    # Build a temporary GeoDataFrame of centroids for the join
    centroids = gpd.GeoDataFrame(
        buildings[["centroid_lon", "centroid_lat"]].copy(),
        geometry=buildings["centroid_geom"],
        crs="EPSG:4326",
    )

    # Select only the metric columns + geometry from tracts
    tract_cols = [c for c in TRACT_METRICS if c in tracts.columns] + ["geometry"]
    tracts_slim = tracts[tract_cols].copy()

    # sjoin: each centroid point gets matched to the containing tract polygon
    joined = gpd.sjoin(
        centroids,
        tracts_slim,
        how="left",
        predicate="within",
    )

    # Attach joined metrics back to the buildings GeoDataFrame by index
    metric_cols = [c for c in TRACT_METRICS if c in joined.columns]
    buildings = buildings.copy()
    buildings[metric_cols] = joined[metric_cols].values

    matched = buildings["tract_id"].notna().sum()
    print(f"[join]      {matched:,} / {len(buildings):,} buildings matched to a tract.")

    return buildings


# ── Step 5: export enriched GeoJSON ──────────────────────────────────────────

def export_geojson(buildings: gpd.GeoDataFrame, output_path: Path) -> None:
    """
    Write the enriched buildings as a GeoJSON FeatureCollection.
    Only columns that are useful downstream are kept to limit file size.
    """
    print(f"[export]    Writing enriched GeoJSON to {output_path} …")

    # Columns to include in the output
    keep = (
        [c for c in KEEP_OSM_TAGS if c in buildings.columns]
        + ["height_m", "centroid_lon", "centroid_lat"]
        + [c for c in TRACT_METRICS if c in buildings.columns]
        + ["geometry"]
    )
    keep = list(dict.fromkeys(keep))  # deduplicate, preserve order

    out = buildings[[c for c in keep if c in buildings.columns]].copy()

    # GeoJSON only supports a single geometry column; drop centroid helper
    out = out.drop(columns=["centroid_geom"], errors="ignore")

    out.to_file(output_path, driver="GeoJSON")
    size_mb = output_path.stat().st_size / 1_048_576
    print(f"[export]    Done — {len(out):,} features, {size_mb:.1f} MB")


# ── Step 6 (optional): local 3D tiling with py3dtiles ────────────────────────

def tile_local(geojson_path: Path) -> None:
    """
    Convert the enriched GeoJSON to a 3D Tiles tileset using py3dtiles.
    Requires: pip install py3dtiles numpy
    Output directory: ./tileset/
    """
    try:
        from py3dtiles.convert import convert  # type: ignore
    except ImportError:
        print(
            "[tile]      py3dtiles not installed — skipping local tiling.\n"
            "            Install with: pip install py3dtiles numpy"
        )
        return

    out_dir = Path("tileset")
    out_dir.mkdir(exist_ok=True)

    print(f"[tile]      Converting {geojson_path} → {out_dir}/ …")
    try:
        convert(
            files=[str(geojson_path)],
            outfolder=str(out_dir),
            overwrite=True,
        )
        print(f"[tile]      Tileset written to {out_dir}/")
    except Exception as exc:
        print(f"[tile]      py3dtiles conversion failed: {exc}")


# ── Step 6 (optional): upload to Cesium ion ───────────────────────────────────

def upload_to_cesium_ion(geojson_path: Path, token: str, asset_name: str) -> None:
    """
    Upload the enriched GeoJSON to Cesium ion as a 3D Tiles asset.

    Cesium ion handles the tiling server-side; no local tiling tool needed.
    The asset will be available in your Cesium ion dashboard after processing.

    API docs: https://cesium.com/docs/rest-api/
    """
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    # 1. Create the asset upload endpoint
    print(f"[ion]       Creating asset '{asset_name}' on Cesium ion …")
    create_payload = {
        "name": asset_name,
        "description": "Philadelphia enriched building footprints with tract metrics",
        "type": "3DTILES",
        "options": {
            "sourceType": "GEOJSON",
            "height": {
                "heightReference": "TERRAIN",
                "heightProperty": "height_m",
            },
        },
    }

    # Step 1: create upload session
    r = requests.post(
        "https://api.cesium.com/v1/assets",
        json=create_payload,
        headers=headers,
        timeout=30,
        params={"assetRegion": "us-east-1"},
    )

    # Try without region param if that fails
    if r.status_code not in (200, 201):
        r = requests.post(
            "https://api.cesium.com/v1/assets",
            json=create_payload,
            headers={**headers, "Content-Type": "application/json"},
            timeout=30,
        )

    if r.status_code not in (200, 201):
        print(f"[ion ERROR] Asset creation failed ({r.status_code}): {r.text}")
        print(
            "\n[ion]       The Cesium ion REST API upload flow may have changed.\n"
            "            Upload manually instead:\n"
            "              1. Go to https://ion.cesium.com/assets\n"
            "              2. Click 'Add data' → 'Upload files'\n"
            "              3. Select: enriched_buildings.geojson\n"
            "              4. Set type: '3D Tiles', source: GeoJSON\n"
            "              5. Under 'Height', set property: height_m\n"
        )
        return

    data       = r.json()
    print(f"[ion]       API response keys: {list(data.keys())}")

    # Handle both v1 response shapes
    asset_meta  = data.get("assetMetadata") or data.get("asset") or data
    asset_id    = asset_meta.get("id") or asset_meta.get("assetId")
    upload_loc  = data.get("uploadLocation") or data.get("upload")
    on_complete = data.get("onComplete") or data.get("complete")

    if not asset_id or not upload_loc:
        print(f"[ion ERROR] Unexpected response shape: {json.dumps(data, indent=2)}")
        return

    print(f"[ion]       Asset id={asset_id}. Uploading GeoJSON ({geojson_path.stat().st_size // 1_048_576} MB) …")

    # Step 2: upload file to S3 presigned location
    bucket   = upload_loc.get("bucket", "")
    prefix   = upload_loc.get("prefix", "")
    endpoint = upload_loc.get("endpoint", "https://s3.amazonaws.com")
    s3_url   = f"{endpoint}/{bucket}/{prefix}enriched_buildings.geojson"

    s3_headers = {}
    if upload_loc.get("accessKey"):
        s3_headers["Authorization"] = upload_loc["accessKey"]

    print(f"[ion]       PUT → {s3_url[:80]}…")
    with open(geojson_path, "rb") as f:
        r2 = requests.put(s3_url, data=f, headers=s3_headers, timeout=600)

    if r2.status_code not in (200, 204):
        print(f"[ion ERROR] S3 upload failed ({r2.status_code}): {r2.text[:300]}")
        return

    # Step 3: notify ion upload is complete
    if on_complete:
        r3 = requests.post(
            on_complete["url"],
            json=on_complete.get("fields", {}),
            headers=headers,
            timeout=30,
        )
        if r3.status_code not in (200, 204):
            print(f"[ion ERROR] on-complete callback failed ({r3.status_code}): {r3.text}")
            return

    print(
        f"\n[ion]       ✓ Upload complete. Cesium ion is now tiling the asset.\n"
        f"            Asset id : {asset_id}\n"
        f"            Dashboard: https://ion.cesium.com/assets/{asset_id}\n"
        f"\n"
        f"            Once status is COMPLETE, add to your Cesium viewer:\n"
        f"              const tileset = await Cesium.Cesium3DTileset.fromIonAssetId({asset_id});\n"
        f"              viewer.scene.primitives.add(tileset);\n"
    )

    # Step 4: poll for completion
    print("[ion]       Polling for tiling completion (Ctrl-C to stop) …")
    for attempt in range(40):
        time.sleep(20)
        r4 = requests.get(
            f"https://api.cesium.com/v1/assets/{asset_id}",
            headers=headers,
            timeout=15,
        )
        if r4.ok:
            status = r4.json().get("status", "UNKNOWN")
            print(f"            [{attempt + 1}/40] Status: {status}")
            if status == "COMPLETE":
                print("[ion]       ✓ Asset is ready to use.")
                break
            if status == "ERROR":
                print(f"[ion ERROR] Tiling failed. Check https://ion.cesium.com/assets/{asset_id}")
                break
        else:
            print(f"            Poll {attempt + 1} failed ({r4.status_code}) — retrying …")
    else:
        print("[ion]       Timed out. Check https://ion.cesium.com/assets/ for status.")


# ── Utility: export the JS tract data as GeoJSON ─────────────────────────────

def js_tracts_to_geojson(js_path: Path, out_path: Path) -> None:
    """
    Parse the raw philadelphiaTracts.js file and write it as a proper GeoJSON.
    This is a one-time helper — after running it you have a file to pass as --tracts.

    The parser handles the ES-module export syntax by stripping it and using
    Python's json module on the extracted array literal.
    """
    import re

    print(f"[convert]   Parsing {js_path} → {out_path} …")
    raw = js_path.read_text(encoding="utf-8")

    # Strip ES-module boilerplate
    raw = re.sub(r"export\s+const\s+\w+\s*=\s*", "", raw)
    raw = re.sub(r"export\s+default\s+\w+;?\s*$", "", raw, flags=re.MULTILINE)
    raw = raw.strip().rstrip(";")

    # JS object keys are unquoted — wrap bare identifiers in double quotes
    # e.g.  id: '42101...'  →  "id": "42101..."
    raw = re.sub(r"([{,])\s*([A-Za-z_]\w*)\s*:", r'\1 "\2":', raw)

    # JS uses single-quoted strings — convert to double-quoted
    # Simple pass: swap ' → " but preserve apostrophes inside already-double-quoted strings
    # Strategy: tokenise quoted strings to avoid mangling content
    def single_to_double(s):
        result = []
        i = 0
        while i < len(s):
            if s[i] == "'":
                # find closing single quote (not escaped)
                j = i + 1
                while j < len(s) and s[j] != "'":
                    if s[j] == "\\":
                        j += 1  # skip escaped char
                    j += 1
                inner = s[i+1:j]
                # escape any double quotes inside the string
                inner = inner.replace('"', '\\"')
                result.append('"' + inner + '"')
                i = j + 1
            else:
                result.append(s[i])
                i += 1
        return "".join(result)

    raw = single_to_double(raw)

    # Remove JS trailing commas before } or ]
    raw = re.sub(r",\s*([}\]])", r"\1", raw)

    # Remove single-line JS comments
    raw = re.sub(r"//[^\n]*", "", raw)

    try:
        tracts_list = json.loads(raw)
    except json.JSONDecodeError as exc:
        # Show context around the error to help debug
        lines = raw.splitlines()
        lineno = exc.lineno - 1
        snippet = "\n".join(lines[max(0, lineno-2):lineno+3])
        sys.exit(f"[ERROR] JSON parse failed at line {exc.lineno}: {exc.msg}\n\n{snippet}")

    features = []
    for t in tracts_list:
        # polygon is a list of [lon, lat] pairs — close the ring
        coords = t["polygon"] + [t["polygon"][0]]
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords],
            },
            "properties": {
                "id":               t["id"],
                "name":             t.get("name", ""),
                "neighborhood":     t.get("neighborhood", ""),
                "medianIncome":     t.get("medianIncome"),
                "unemploymentRate": t.get("unemploymentRate"),
                "mobilityScore":    t.get("mobilityScore"),
                "innovationIndex":  t.get("innovationIndex"),
                "outcomeIndex":     t.get("outcomeIndex"),
                "cbs":              t.get("cbs"),
                "synthetic":        t.get("synthetic", True),
            },
        }
        features.append(feature)

    geojson = {"type": "FeatureCollection", "features": features}
    out_path.write_text(json.dumps(geojson, indent=2), encoding="utf-8")
    print(f"[convert]   Wrote {len(features)} tract features to {out_path}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Enrich OSM Philadelphia buildings with tract metrics.")
    p.add_argument(
        "--tracts",
        type=Path,
        default=Path("philadelphia_tracts.geojson"),
        help="Path to the tract GeoJSON file (default: philadelphia_tracts.geojson). "
             "Run with --convert-tracts first if you only have the .js file.",
    )
    p.add_argument(
        "--convert-tracts",
        type=Path,
        metavar="JS_FILE",
        help="Path to philadelphiaTracts.js — converts it to GeoJSON and exits.",
    )
    p.add_argument(
        "--buildings-cache",
        type=Path,
        default=CACHE_PATH,
        help=f"GeoPackage cache for the OSM download (default: {CACHE_PATH}).",
    )
    p.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_PATH,
        help=f"Output GeoJSON path (default: {OUTPUT_PATH}).",
    )
    p.add_argument(
        "--tile-local",
        action="store_true",
        help="Convert output to a local 3D Tileset using py3dtiles.",
    )
    p.add_argument(
        "--ion-token",
        type=str,
        default=None,
        help="Cesium ion access token. If provided, uploads the result to ion.",
    )
    p.add_argument(
        "--ion-name",
        type=str,
        default="Philadelphia Enriched Buildings",
        help="Asset name on Cesium ion (default: 'Philadelphia Enriched Buildings').",
    )
    return p.parse_args()


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    args = parse_args()

    # One-time conversion helper
    if args.convert_tracts:
        js_tracts_to_geojson(
            js_path=args.convert_tracts,
            out_path=args.tracts,
        )
        print("Conversion complete. Re-run without --convert-tracts to process buildings.")
        return

    # ── Pipeline ──────────────────────────────────────────────────────────────
    buildings = download_buildings(args.buildings_cache)
    tracts    = load_tracts(args.tracts)
    buildings = prepare_buildings(buildings)
    buildings = spatial_join(buildings, tracts)
    export_geojson(buildings, args.output)

    # ── Optional steps ────────────────────────────────────────────────────────
    if args.tile_local:
        tile_local(args.output)

    if args.ion_token:
        upload_to_cesium_ion(args.output, args.ion_token, args.ion_name)

    print("\n✓ Done.")


if __name__ == "__main__":
    main()
