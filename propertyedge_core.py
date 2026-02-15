from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import requests
from bs4 import BeautifulSoup

from ppd_sqlite import find_comps_sqlite


@dataclass
class ListingFacts:
    url: str
    property_id: str
    address: Optional[str] = None
    postcode: Optional[str] = None
    price: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    property_type: Optional[str] = None
    tenure: Optional[str] = None
    floor_area_sqm: Optional[float] = None
    floor_area_sqft: Optional[float] = None
    epc_rating: Optional[str] = None
    key_features: List[str] = None


@dataclass
class Comp:
    price: int
    date: str
    postcode: str
    property_type: str
    street: Optional[str] = None
    town: Optional[str] = None


def parse_property_id(url: str) -> str:
    m = re.search(r"/properties/(\d+)", url)
    if not m:
        raise ValueError("Could not find property id in URL.")
    return m.group(1)


def money_int(x: Any) -> Optional[int]:
    if x is None:
        return None
    s = str(x)
    s = re.sub(r"[^\d]", "", s)
    return int(s) if s else None


def sqft_to_sqm(sqft: float) -> float:
    return sqft * 0.092903


def sqm_to_sqft(sqm: float) -> float:
    return sqm / 0.092903


def median(vals: List[float]) -> Optional[float]:
    if not vals:
        return None
    s = sorted(vals)
    n = len(s)
    return float(s[n // 2]) if n % 2 else float((s[n // 2 - 1] + s[n // 2]) / 2)


def quantile(vals: List[float], q: float) -> Optional[float]:
    if not vals:
        return None
    s = sorted(vals)
    if len(s) == 1:
        return float(s[0])
    pos = (len(s) - 1) * q
    lo = int(math.floor(pos))
    hi = int(math.ceil(pos))
    if lo == hi:
        return float(s[lo])
    return float(s[lo] + (s[hi] - s[lo]) * (pos - lo))


def pct(a: Optional[float], b: Optional[float]) -> Optional[float]:
    if a is None or b in (None, 0):
        return None
    return (a - b) / b * 100.0


def round_to_nearest(x: int, base: int = 1000) -> int:
    return int(base * round(x / base))


def fetch_rightmove_html(url: str, timeout: int = 20) -> str:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-GB,en;q=0.9",
    }
    r = requests.get(url, headers=headers, timeout=timeout)
    r.raise_for_status()
    return r.text


def extract_json_ld(soup: BeautifulSoup) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            raw = tag.get_text(strip=True)
            if not raw:
                continue
            data = json.loads(raw)
            if isinstance(data, list):
                out.extend([d for d in data if isinstance(d, dict)])
            elif isinstance(data, dict):
                out.append(data)
        except Exception:
            continue
    return out


def extract_next_data(soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    tag = soup.find("script", id="__NEXT_DATA__")
    if not tag:
        return None
    try:
        return json.loads(tag.get_text(strip=True))
    except Exception:
        return None


def deep_get(d: Any, path: List[Any]) -> Any:
    cur = d
    for p in path:
        if cur is None:
            return None
        if isinstance(p, int):
            if isinstance(cur, list) and 0 <= p < len(cur):
                cur = cur[p]
            else:
                return None
        else:
            if isinstance(cur, dict):
                cur = cur.get(p)
            else:
                return None
    return cur


def parse_listing(url: str) -> ListingFacts:
    pid = parse_property_id(url)
    html = fetch_rightmove_html(url)
    soup = BeautifulSoup(html, "lxml")

    facts = ListingFacts(url=url, property_id=pid, key_features=[])

    # JSON-LD (often includes price + address)
    for item in extract_json_ld(soup):
        price = deep_get(item, ["offers", "price"])
        if facts.price is None and price is not None:
            facts.price = money_int(price)

        addr = deep_get(item, ["address"])
        if isinstance(addr, dict):
            postal = addr.get("postalCode")
            if facts.postcode is None and postal:
                facts.postcode = str(postal).strip()
            if facts.address is None:
                bits = [addr.get("streetAddress"), addr.get("addressLocality"), addr.get("addressRegion"), postal]
                bits = [b for b in bits if b]
                if bits:
                    facts.address = ", ".join(bits)

        if facts.property_type is None:
            t = item.get("@type") or item.get("name")
            if isinstance(t, str):
                facts.property_type = t

    # __NEXT_DATA__ (best-effort)
    nd = extract_next_data(soup)
    if nd:
        candidate_paths = [
            ["props", "pageProps", "propertyData"],
            ["props", "pageProps", "initialReduxState", "propertyDetails", "property"],
            ["props", "pageProps", "initialState", "property"],
        ]
        pdata = None
        for p in candidate_paths:
            pdata = deep_get(nd, p)
            if isinstance(pdata, dict):
                break
            pdata = None

        if isinstance(pdata, dict):
            facts.bedrooms = facts.bedrooms or safe_int(pdata.get("bedrooms") or pdata.get("bedroomCount"))
            facts.bathrooms = facts.bathrooms or safe_int(pdata.get("bathrooms") or pdata.get("bathroomCount"))
            facts.property_type = facts.property_type or pdata.get("propertyType")
            facts.tenure = facts.tenure or pdata.get("tenure")

            fa = pdata.get("floorArea") or pdata.get("floorAreaSqm") or deep_get(pdata, ["floorArea", "value"])
            if facts.floor_area_sqm is None and fa is not None:
                try:
                    facts.floor_area_sqm = float(fa)
                except Exception:
                    pass

            epc = pdata.get("epcRating") or deep_get(pdata, ["epc", "rating"])
            if isinstance(epc, str) and not facts.epc_rating:
                facts.epc_rating = epc.strip()

            kf = pdata.get("keyFeatures") or pdata.get("features")
            if isinstance(kf, list):
                facts.key_features.extend([str(x).strip() for x in kf if x])

    # Fallback price from HTML
    if facts.price is None:
        price_tag = soup.select_one('[data-testid="price"]') or soup.select_one(".property-header-price")
        if price_tag:
            facts.price = money_int(price_tag.get_text(" ", strip=True))

    # Floor area conversions
    if facts.floor_area_sqm is None and facts.key_features:
        joined = " | ".join(facts.key_features)
        m = re.search(r"(\d{3,5})\s*(sq\s*ft|sqft)", joined, flags=re.I)
        if m:
            sqft = float(m.group(1))
            facts.floor_area_sqft = sqft
            facts.floor_area_sqm = round(sqft_to_sqm(sqft), 2)

    if facts.floor_area_sqft is None and facts.floor_area_sqm is not None:
        facts.floor_area_sqft = round(sqm_to_sqft(facts.floor_area_sqm), 0)

    return facts


def safe_int(x: Any) -> Optional[int]:
    try:
        return int(x)
    except Exception:
        return None


def estimate_value_from_comps(facts: ListingFacts, comps: List[Comp]) -> Tuple[Optional[int], Optional[int], Optional[int], List[str]]:
    notes: List[str] = []
    if not comps:
        notes.append("No sold comps found (PPD SQLite not loaded or no matches in postcode sector/time window).")
        return None, None, None, notes

    prices = [float(c.price) for c in comps if c.price]
    mid = median(prices)
    q25 = quantile(prices, 0.25)
    q75 = quantile(prices, 0.75)

    if mid is None or q25 is None or q75 is None:
        notes.append("Insufficient comp distribution to compute quartiles.")
        return None, None, None, notes

    # Light-touch size adjustment if floor area known
    size_adj = 1.0
    if facts.floor_area_sqm:
        baseline = 68.0
        size_adj = math.sqrt(facts.floor_area_sqm / baseline)
        size_adj = max(0.92, min(1.10, size_adj))

    low = int(q25 * size_adj)
    midv = int(mid * size_adj)
    high = int(q75 * size_adj)

    notes.append(f"Comp quartiles (unadjusted): Q25≈£{int(q25):,}, Median≈£{int(mid):,}, Q75≈£{int(q75):,}.")
    if facts.floor_area_sqm:
        notes.append(f"Applied light size adjustment factor ≈ {size_adj:.3f} based on {facts.floor_area_sqm:.1f} sqm vs baseline 68 sqm.")

    return low, midv, high, notes


def reasonableness_score(facts: ListingFacts, fair_mid: Optional[int], comps_used: int) -> Tuple[Optional[int], Optional[str], List[str]]:
    if facts.price is None or fair_mid is None:
        return None, None, ["Score unavailable (missing asking price or fair-mid)."]

    diff_pct = pct(float(facts.price), float(fair_mid))
    dev = abs(diff_pct or 0)

    price_component = max(0, 40 - int((dev / 15.0) * 40))
    data_component = (10 if facts.floor_area_sqm else 0) + min(10, comps_used)

    tenure_component = 8
    if facts.tenure:
        if facts.tenure.lower().startswith("free"):
            tenure_component = 15
        elif facts.tenure.lower().startswith("lease"):
            tenure_component = 10

    epc_component = 8
    if facts.epc_rating:
        r = facts.epc_rating.strip().upper()
        epc_component = 15 if r in ("A", "B") else 12 if r == "C" else 9 if r == "D" else 7

    behavior_component = 6  # neutral (unless you later add DOM/reductions)

    score = max(0, min(100, price_component + data_component + tenure_component + epc_component + behavior_component))

    if score >= 80:
        label = "Reasonably priced"
    elif score >= 60:
        label = "Slight premium / negotiate"
    elif score >= 40:
        label = "Overpriced unless there’s hidden value"
    else:
        label = "Stretch pricing / proceed cautiously"

    notes = [f"Asking vs fair-mid deviation ≈ {diff_pct:+.1f}%. Price component={price_component}/40."]
    return score, label, notes


def offer_strategy(facts: ListingFacts, fair_low: Optional[int], fair_mid: Optional[int]) -> Tuple[Optional[int], Optional[int], Optional[int], List[str]]:
    if facts.price is None or fair_mid is None:
        return None, None, None, ["Offer strategy unavailable (missing asking price or fair-mid)."]

    anchor = int(fair_mid * 0.95)
    if fair_low is not None:
        anchor = max(anchor, int(fair_low * 0.98))

    band_low = int(anchor * 0.98)
    band_high = int(anchor * 1.02)

    anchor = round_to_nearest(anchor, 1000)
    band_low = round_to_nearest(band_low, 1000)
    band_high = round_to_nearest(band_high, 1000)

    return anchor, band_low, band_high, ["Offer anchor set near 95% of fair-mid (rounded to nearest £1k)."]


def render_markdown(facts: ListingFacts, comps: List[Comp], valuation: Dict[str, Any]) -> str:
    lines = []
    lines.append(f"# PropertyEdge AI Report — {facts.property_id}")
    lines.append("")
    lines.append(f"**Source:** {facts.url}")
    lines.append("")
    lines.append("## Fact Card")
    lines.append(f"- Asking price: {'£{:,.0f}'.format(facts.price) if facts.price else '—'}")
    lines.append(f"- Address: {facts.address or '—'}")
    lines.append(f"- Postcode: {facts.postcode or '—'}")
    lines.append(f"- Type: {facts.property_type or '—'}")
    lines.append(f"- Tenure: {facts.tenure or '—'}")
    lines.append(f"- Beds/Baths: {facts.bedrooms or '—'}/{facts.bathrooms or '—'}")
    if facts.floor_area_sqm:
        lines.append(f"- Size: {facts.floor_area_sqm:.2f} sqm ({int(facts.floor_area_sqft or 0)} sq ft)")
    else:
        lines.append(f"- Size: —")
    lines.append(f"- EPC: {facts.epc_rating or '—'}")
    if facts.key_features:
        lines.append(f"- Key features: {', '.join(facts.key_features[:8])}{'…' if len(facts.key_features) > 8 else ''}")
    lines.append("")
    lines.append("## Sold comps (Land Registry PPD)")
    if not comps:
        lines.append("- None found.")
    else:
        lines.append("| Sold date | Sold price | Postcode | Type | Street/Town |")
        lines.append("|---|---:|---|---|---|")
        for c in comps:
            st = " ".join([x for x in [c.street, c.town] if x])
            lines.append(f"| {c.date} | £{c.price:,} | {c.postcode} | {c.property_type} | {st} |")
    lines.append("")
    lines.append("## Valuation")
    lines.append(f"- Fair value (low/mid/high): {valuation.get('fair_value_range','—')}")
    lines.append(f"- Asking vs fair-mid: {valuation.get('asking_vs_mid','—')}")
    lines.append(f"- PropertyEdge score: {valuation.get('score','—')} — {valuation.get('label','—')}")
    lines.append(f"- Offer anchor: {valuation.get('offer_anchor','—')}")
    lines.append(f"- Offer band: {valuation.get('offer_band','—')}")
    lines.append("")
    lines.append("**Disclaimer:** Educational content only — not a professional valuation or financial advice.")
    return "\n".join(lines)


def run_propertyedge(url: str, ppd_sqlite_path: Optional[str]) -> Dict[str, Any]:
    facts = parse_listing(url)

    comps: List[Comp] = []
    if ppd_sqlite_path:
        comps = find_comps_sqlite(ppd_sqlite_path, facts.postcode, facts.property_type)

    fair_low, fair_mid, fair_high, n1 = estimate_value_from_comps(facts, comps)
    asking_vs_mid = pct(float(facts.price), float(fair_mid)) if (facts.price and fair_mid) else None
    score, label, n2 = reasonableness_score(facts, fair_mid, len(comps))
    offer_anchor, offer_low, offer_high, n3 = offer_strategy(facts, fair_low, fair_mid)

    valuation = {
        "fair_value_low": round_to_nearest(fair_low, 1000) if fair_low else None,
        "fair_value_mid": round_to_nearest(fair_mid, 1000) if fair_mid else None,
        "fair_value_high": round_to_nearest(fair_high, 1000) if fair_high else None,
        "fair_value_range": (
            f"£{round_to_nearest(fair_low,1000):,} / £{round_to_nearest(fair_mid,1000):,} / £{round_to_nearest(fair_high,1000):,}"
            if (fair_low and fair_mid and fair_high) else None
        ),
        "asking_vs_mid": f"{asking_vs_mid:+.1f}%" if asking_vs_mid is not None else None,
        "asking_vs_mid_pct": asking_vs_mid,
        "score": score,
        "label": label,
        "offer_anchor": f"£{offer_anchor:,}" if offer_anchor else None,
        "offer_band": f"£{offer_low:,}–£{offer_high:,}" if (offer_low and offer_high) else None,
        "notes": n1 + n2 + n3,
        "comps_used": len(comps),
    }

    md_report = render_markdown(facts, comps, valuation)

    return {
        "created_at_utc": datetime.utcnow().isoformat() + "Z",
        "facts": asdict(facts),
        "comps": [asdict(c) for c in comps],
        "valuation": valuation,
        "md_report": md_report,
    }
