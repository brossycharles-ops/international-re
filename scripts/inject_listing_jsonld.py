#!/usr/bin/env python3
"""Inject RealEstateListing JSON-LD into existing city-focused guides/blog/tips/quick-reads pages."""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"

sys.path.insert(0, str(ROOT))
from seo_generator import CITIES

CITY_BY_SLUG = {c["slug"]: c for c in CITIES}

PAGE_TO_CITY = {
    "guides/can-foreigners-buy-property-costa-rica.html": "tamarindo-costa-rica",
    "guides/medellin-neighborhood-guide-property-buyers-2026.html": "medellin-colombia",
    "guides/montevideo-rental-yield-analysis-2026.html": "punta-del-este-uruguay",
    "guides/panama-city-vs-san-jose-expat-investors-2026.html": "panama-city-panama",
    "quick-reads/airbnb-income-cartagena-colombia-2026.html": "medellin-colombia",
    "quick-reads/airbnb-income-playa-del-carmen.html": "playa-del-carmen-mexico",
    "quick-reads/airbnb-income-san-jose-costa-rica.html": "tamarindo-costa-rica",
    "quick-reads/best-neighborhoods-medellin-for-expats.html": "medellin-colombia",
    "quick-reads/cost-of-living-panama-city-per-month.html": "panama-city-panama",
    "blog/buenos-aires-best-value-2026.html": "buenos-aires-argentina",
    "blog/granada-nicaraguas-colonial-gem-2026.html": "san-juan-del-sur-nicaragua",
    "blog/guanacaste-hottest-market-2026.html": "tamarindo-costa-rica",
    "blog/medellin-real-estate-2026.html": "medellin-colombia",
    "blog/mendoza-wine-country-estates.html": "buenos-aires-argentina",
    "blog/san-juan-del-sur-affordable-beach.html": "san-juan-del-sur-nicaragua",
    "blog/santiago-supply-squeeze-2026.html": "santiago-chile",
    "blog/santiago-vs-lake-district.html": "santiago-chile",
    "tips/ecuador-dollar-beachfront.html": "cuenca-ecuador",
    "tips/medellin-property-vs-miami.html": "medellin-colombia",
    "tips/panama-no-capital-gains-tax.html": "panama-city-panama",
    "guide/panama-foreign-buyer-legal-guide.html": "panama-city-panama",
}


def build_listing(c, page_path):
    url = f"https://www.internationalre.org/{page_path}"
    return {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        "name": f"{c['city']} ({c['country']}) — Representative Property Listings",
        "url": url,
        "description": f"Representative price and yield range for residential property in {c['city']}, {c['country']}. {c['tagline']}",
        "address": {"@type": "PostalAddress", "addressLocality": c["city"], "addressCountry": c["country"]},
        "image": c["image"],
        "offers": {
            "@type": "AggregateOffer",
            "priceCurrency": "USD",
            "lowPrice": c["price_low"],
            "highPrice": c["price_high"],
            "offerCount": 25,
        },
        "additionalProperty": [
            {"@type": "PropertyValue", "name": "Rental Yield Low", "value": f"{c['yield_low']}%"},
            {"@type": "PropertyValue", "name": "Rental Yield High", "value": f"{c['yield_high']}%"},
            {"@type": "PropertyValue", "name": "Annual Appreciation", "value": f"{c['growth']}%"},
            {"@type": "PropertyValue", "name": "Property Tax", "value": f"{c['tax']}%"},
        ],
    }


changed = 0
skipped = 0
for rel, slug in PAGE_TO_CITY.items():
    p = PUB / rel
    if not p.exists():
        print(f"  missing: {rel}")
        continue
    html = p.read_text(encoding="utf-8")
    if "RealEstateListing" in html:
        skipped += 1
        continue
    c = CITY_BY_SLUG[slug]
    block = '<script type="application/ld+json">\n' + json.dumps(build_listing(c, rel), indent=2) + "\n</script>"
    new = html.replace("</head>", block + "\n</head>", 1)
    if new == html:
        print(f"  no </head>: {rel}")
        continue
    p.write_text(new, encoding="utf-8")
    changed += 1
    print(f"  injected: {rel} -> {slug}")

print(f"\n✓ injected {changed}, skipped {skipped} (already had JSON-LD)")
