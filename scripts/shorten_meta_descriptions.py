#!/usr/bin/env python3
"""
Shortens over-long meta descriptions across all content pages.

Strategy:
- Target: 140-158 chars (Google SERP truncates around 155-160)
- Prefer to end at a sentence boundary (. ! ?)
- Otherwise end at a word boundary with no trailing ellipsis (looks like
  marketing fluff)
- Preserve numbers/data (these drive CTR — most CTR-impactful content)
- Update both <meta name="description">, <meta property="og:description">,
  and <meta name="twitter:description">

Idempotent — running twice produces the same result.
"""

import re
import glob
import os

PUBLIC = os.path.join(os.path.dirname(__file__), '..', 'public')
TARGET_MAX = 158
TARGET_MIN = 130
HARD_CEILING = 160

TRAILING_FRAGMENTS = {
    'and', 'or', 'but', 'with', 'of', 'in', 'on', 'at', 'to', 'for', 'from',
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have',
    'will', 'now', 'then', 'plus', 'while', 'as', 'by'
}

def shorten(desc):
    """Shorten a description to be under TARGET_MAX, ending naturally."""
    if len(desc) <= HARD_CEILING:
        return desc

    # Try sentence boundaries first (longest one under the limit)
    sentences = re.split(r'(?<=[.!?])\s+', desc)
    accumulated = ''
    for sent in sentences:
        candidate = (accumulated + ' ' + sent).strip() if accumulated else sent
        if len(candidate) <= TARGET_MAX:
            accumulated = candidate
        else:
            break
    if len(accumulated) >= TARGET_MIN:
        return accumulated

    # Try clause boundaries (commas not inside numbers) — accumulate up to the limit
    # Split on commas not followed by a digit (so "$2,800" stays intact)
    clauses = [c.strip() for c in re.split(r',(?!\d)', desc)]
    accumulated = ''
    for clause in clauses:
        candidate = (accumulated + ', ' + clause).strip(', ') if accumulated else clause
        if len(candidate) + 1 > TARGET_MAX:
            break
        accumulated = candidate
    if len(accumulated) >= TARGET_MIN:
        # Trim trailing fragment words, then add a period
        words = accumulated.split()
        while words and words[-1].lower().rstrip('.,;:') in TRAILING_FRAGMENTS:
            words.pop()
        out = ' '.join(words).rstrip(',;–-—:')
        if out and not out.endswith('.'):
            out += '.'
        if out and len(out) >= TARGET_MIN:
            return out

    # Last resort: word-boundary truncation with fragment trimming
    words = desc.split()
    out_words = []
    char_count = 0
    for w in words:
        next_len = char_count + len(w) + (1 if out_words else 0)
        if next_len + 1 > TARGET_MAX:  # +1 for the period we'll add
            break
        out_words.append(w)
        char_count = next_len
    # Trim trailing fragment words (conjunctions, prepositions, etc.)
    while out_words and out_words[-1].lower().rstrip('.,;:') in TRAILING_FRAGMENTS:
        out_words.pop()
    # Also trim if last word is a bare number (e.g., "5,500+" trailing)
    while out_words and re.match(r'^[\d,.$+%–-]+$', out_words[-1]):
        out_words.pop()
    out = ' '.join(out_words).rstrip(',;–-—:')
    if out and not out.endswith('.'):
        out += '.'
    return out

def process_file(fpath):
    with open(fpath) as f:
        html = f.read()
    m = re.search(r'<meta\s+name="description"\s+content="([^"]+)"', html)
    if not m:
        return None
    old = m.group(1)
    if len(old) <= HARD_CEILING:
        return None  # no change needed
    new = shorten(old)
    if new == old:
        return None
    # Escape any special chars for HTML attribute
    new_esc = new.replace('&', '&amp;').replace('"', '&quot;')
    # Replace description, og:description, twitter:description with the same shortened text
    html_new = re.sub(
        r'(<meta\s+name="description"\s+content=")[^"]+(")',
        rf'\g<1>{new_esc}\g<2>',
        html, count=1
    )
    html_new = re.sub(
        r'(<meta\s+property="og:description"\s+content=")[^"]+(")',
        rf'\g<1>{new_esc}\g<2>',
        html_new, count=1
    )
    html_new = re.sub(
        r'(<meta\s+name="twitter:description"\s+content=")[^"]+(")',
        rf'\g<1>{new_esc}\g<2>',
        html_new, count=1
    )
    if html_new != html:
        with open(fpath, 'w') as f:
            f.write(html_new)
        return (len(old), len(new), os.path.relpath(fpath, PUBLIC))
    return None

results = []
for d in ['blog', 'guides', 'quick-reads', 'tips', 'landing', 'cities']:
    for fpath in sorted(glob.glob(os.path.join(PUBLIC, d, '**', '*.html'), recursive=True)):
        r = process_file(fpath)
        if r:
            results.append(r)

print(f'Shortened {len(results)} files.')
print()
for old_len, new_len, path in results[:15]:
    print(f'  {old_len:3d} → {new_len:3d}  {path}')
if len(results) > 15:
    print(f'  ... and {len(results)-15} more')
print()
# Verify
remaining = 0
for d in ['blog', 'guides', 'quick-reads', 'tips', 'landing', 'cities']:
    for fpath in glob.glob(os.path.join(PUBLIC, d, '**', '*.html'), recursive=True):
        with open(fpath) as f:
            html = f.read()
        m = re.search(r'<meta\s+name="description"\s+content="([^"]+)"', html)
        if m and len(m.group(1)) > HARD_CEILING:
            remaining += 1
print(f'Remaining descriptions over {HARD_CEILING} chars: {remaining}')
