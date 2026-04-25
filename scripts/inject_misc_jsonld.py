#!/usr/bin/env python3
"""Inject JSON-LD into pages that lack it: index pages get CollectionPage, blog/article pages get BlogPosting."""
import json
from pathlib import Path

PUB = Path(__file__).resolve().parent.parent / "public"

PAGES = {
    "blog.html": {
        "@context": "https://schema.org", "@type": "Blog",
        "name": "International RE Blog",
        "url": "https://www.internationalre.org/blog.html",
        "description": "Weekly deep-dives into Latin American and international real estate markets.",
        "publisher": {"@type": "Organization", "name": "International RE", "url": "https://www.internationalre.org"},
    },
    "guides.html": {
        "@context": "https://schema.org", "@type": "CollectionPage",
        "name": "International RE Buying Guides",
        "url": "https://www.internationalre.org/guides.html",
        "description": "Step-by-step buying guides for foreign property buyers across Latin America.",
    },
    "gallery.html": {
        "@context": "https://schema.org", "@type": "ImageGallery",
        "name": "International RE Photo Gallery",
        "url": "https://www.internationalre.org/gallery.html",
        "description": "Property and travel photography across Latin America.",
    },
    "guide/2026-market-entry-guide.html": {
        "@context": "https://schema.org", "@type": "Article",
        "headline": "2026 Latin America Real Estate Market Entry Guide",
        "datePublished": "2026-01-01", "dateModified": "2026-04-25",
        "author": {"@type": "Organization", "name": "International RE"},
        "publisher": {"@type": "Organization", "name": "International RE", "url": "https://www.internationalre.org"},
        "description": "Free 20-page guide covering price data, legal essentials, and top neighborhoods across Costa Rica, Panama, Colombia, Mexico, Argentina, Chile and more.",
        "url": "https://www.internationalre.org/guide/2026-market-entry-guide.html",
    },
    "blog/latam-weekly-apr-14-18-2026.html": {
        "@context": "https://schema.org", "@type": "BlogPosting",
        "headline": "LATAM Weekly: April 14–18, 2026",
        "datePublished": "2026-04-18", "dateModified": "2026-04-18",
        "author": {"@type": "Organization", "name": "International RE"},
        "publisher": {"@type": "Organization", "name": "International RE", "url": "https://www.internationalre.org"},
        "url": "https://www.internationalre.org/blog/latam-weekly-apr-14-18-2026.html",
    },
    "blog/latam-weekly-apr-21-25-2026.html": {
        "@context": "https://schema.org", "@type": "BlogPosting",
        "headline": "LATAM Weekly: April 21–25, 2026",
        "datePublished": "2026-04-25", "dateModified": "2026-04-25",
        "author": {"@type": "Organization", "name": "International RE"},
        "publisher": {"@type": "Organization", "name": "International RE", "url": "https://www.internationalre.org"},
        "url": "https://www.internationalre.org/blog/latam-weekly-apr-21-25-2026.html",
    },
    "quick-reads/lisbon-property-buying-timeline.html": {
        "@context": "https://schema.org", "@type": "Article",
        "headline": "Lisbon Property Buying Timeline",
        "datePublished": "2026-04-15", "dateModified": "2026-04-15",
        "author": {"@type": "Organization", "name": "International RE"},
        "publisher": {"@type": "Organization", "name": "International RE", "url": "https://www.internationalre.org"},
        "url": "https://www.internationalre.org/quick-reads/lisbon-property-buying-timeline.html",
    },
    "tips/dominican-republic-fdi-record-2025.html": {
        "@context": "https://schema.org", "@type": "Article",
        "headline": "Dominican Republic Sets FDI Record in 2025",
        "datePublished": "2026-04-10", "dateModified": "2026-04-10",
        "author": {"@type": "Organization", "name": "International RE"},
        "publisher": {"@type": "Organization", "name": "International RE", "url": "https://www.internationalre.org"},
        "url": "https://www.internationalre.org/tips/dominican-republic-fdi-record-2025.html",
    },
    "reports/2026-global-investment-report.html": {
        "@context": "https://schema.org", "@type": "Report",
        "headline": "2026 Global Investment Report",
        "datePublished": "2026-01-15", "dateModified": "2026-04-25",
        "author": {"@type": "Organization", "name": "International RE"},
        "publisher": {"@type": "Organization", "name": "International RE", "url": "https://www.internationalre.org"},
        "description": "38-page comparative analysis of 11 international real estate markets — price, yield, growth, tax and methodology.",
        "url": "https://www.internationalre.org/reports/2026-global-investment-report.html",
    },
}

changed = 0
for rel, schema in PAGES.items():
    p = PUB / rel
    if not p.exists():
        print(f"  missing: {rel}")
        continue
    html = p.read_text(encoding="utf-8")
    if "application/ld+json" in html:
        print(f"  has-jsonld already: {rel}")
        continue
    block = '<script type="application/ld+json">\n' + json.dumps(schema, indent=2) + "\n</script>"
    new = html.replace("</head>", block + "\n</head>", 1)
    if new == html:
        print(f"  no </head>: {rel}")
        continue
    p.write_text(new, encoding="utf-8")
    changed += 1
    print(f"  injected: {rel}")

print(f"\n✓ injected {changed}")
