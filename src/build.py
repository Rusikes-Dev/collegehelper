#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""College Helper — static site builder.

Reads the dictionaries in src/data/ and writes plain HTML into site/.
No framework, no runtime dependency: the output is static files that any
host will serve, which is what makes free Cloudflare Pages hosting work.

    python3 src/build.py
"""
import html
import json
import os
import re
import shutil
import sys
from datetime import date, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SITE = os.path.join(ROOT, "site")
sys.path.insert(0, HERE)

from data.config import SITE as CFG, NAV, CATEGORIES, STATUS_META, EXTRA_EVENTS, BOARD_ORDER, TOOLS
from data.exams_1 import EXAMS as E1
from data.exams_2 import EXAMS as E2
from data.exams_3 import EXAMS as E3
from data.guides import GUIDES

EXAMS = E1 + E2 + E3
GUIDES = list(GUIDES)


# --------------------------------------------------------------- overrides --
# The admin panel writes src/data/overrides.json. Anything in it wins over the
# Python defaults above, which is what makes editing content from the browser
# actually change the built site.
OVERRIDES = os.path.join(HERE, "data", "overrides.json")
if os.path.exists(OVERRIDES):
    try:
        with open(OVERRIDES, encoding="utf-8") as f:
            _ov = json.load(f)
    except Exception as exc:                                   # noqa: BLE001
        print(f"  ! overrides.json is not valid JSON, ignoring it ({exc})")
        _ov = {}

    if isinstance(_ov.get("site"), dict):
        CFG.update(_ov["site"])
    if isinstance(_ov.get("boardOrder"), list) and _ov["boardOrder"]:
        BOARD_ORDER[:] = _ov["boardOrder"]
    if isinstance(_ov.get("extraEvents"), list):
        EXTRA_EVENTS[:] = [tuple(x) for x in _ov["extraEvents"]]

    def _merge(base, patches, deleted):
        by = {x["slug"]: x for x in base}
        order = [x["slug"] for x in base]
        for p in patches or []:
            if not isinstance(p, dict) or not p.get("slug"):
                continue
            if p["slug"] in by:
                by[p["slug"]] = {**by[p["slug"]], **p}
            else:
                by[p["slug"]] = p
                order.append(p["slug"])
        for s in deleted or []:
            by.pop(s, None)
        return [by[s] for s in order if s in by]

    EXAMS = _merge(EXAMS, _ov.get("exams"), _ov.get("deletedExams"))
    GUIDES = _merge(GUIDES, _ov.get("guides"), _ov.get("deletedGuides"))
    print(f"  overrides.json applied · {len(EXAMS)} exams · {len(GUIDES)} guides")

EXAM_BY_SLUG = {x["slug"]: x for x in EXAMS}
TODAY = date.fromisoformat(CFG["built"])

e = html.escape


def attr(s):
    return html.escape(str(s), quote=True)


# ----------------------------------------------------------------- helpers --
MARK = ('<svg class="brand-mark" viewBox="0 0 26 26" fill="none" aria-hidden="true">'
        '<rect x="1.5" y="1.5" width="23" height="23" rx="5" fill="#F7F8FA" stroke="#CDD5E0"/>'
        '<rect x="5.5" y="6.5" width="2" height="13" rx="1" fill="#15509E"/>'
        '<rect x="10" y="7" width="10.5" height="2" rx="1" fill="#1A2233"/>'
        '<rect x="10" y="12" width="7.5" height="2" rx="1" fill="#8A93A3"/>'
        '<rect x="10" y="17" width="9.5" height="2" rx="1" fill="#8A93A3"/></svg>')

ICON_SEARCH = ('<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" '
               'aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="m13.5 13.5 4 4"/></svg>')
ICON_ALERT = ('<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" '
              'aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 6v5M10 14h.01"/></svg>')


def _ic(paths):
    return ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>')

# One icon per exam category. Colour and icon together let a student navigate
# by sight instead of reading every label.
CAT_ICONS = {
  "engineering": _ic('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1'
                     'M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
  "medical": _ic('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
  "civil-services": _ic('<path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M3 10l9-6 9 6"/>'),
  "ssc": _ic('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>'
             '<path d="M14 3v5h5"/><path d="M9 14l2 2 4-4"/>'),
  "banking": _ic('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>'
                 '<path d="M6 12h.01M18 12h.01"/>'),
  "management": _ic('<rect x="2" y="7" width="20" height="13" rx="2"/>'
                    '<path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M2 12h20"/>'),
  "law": _ic('<path d="M12 4v16M8 20h8M4 8h16M4 8l-2 5h4zM20 8l-2 5h4z"/>'),
  "university": _ic('<path d="M22 9 12 4 2 9l10 5 10-5z"/>'
                    '<path d="M6 11.5V17c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5"/>'),
}

NAV_ICONS = {
  "exams": _ic('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  "calendar": _ic('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>'),
  "tools": _ic('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01'
               'M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h8"/>'),
  "guides": _ic('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>'
                '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
}
ARROW = '<span class="ar" aria-hidden="true">→</span>'


def status_of(exam):
    cls, label = STATUS_META.get(exam.get("status", ""), ("", "Tracking"))
    return cls, exam.get("statusLabel") or label


def fmt_date(iso):
    if not iso:
        return None
    d = date.fromisoformat(iso)
    return d.strftime("%-d %b %Y") if os.name != "nt" else d.strftime("%d %b %Y")


def days_until(iso):
    if not iso:
        return None
    return (date.fromisoformat(iso) - TODAY).days


def head(title, desc, path, *, extra="", jsonld=None, og_type="website"):
    url = CFG["url"] + path
    ld = ""
    if jsonld:
        blocks = jsonld if isinstance(jsonld, list) else [jsonld]
        for b in blocks:
            ld += ('<script type="application/ld+json">'
                   + json.dumps(b, ensure_ascii=False, separators=(",", ":")) + "</script>")
    return f"""<!DOCTYPE html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{attr(desc)}">
<link rel="canonical" href="{attr(url)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta name="theme-color" content="#FFFFFF">
<meta property="og:site_name" content="{attr(CFG['name'])}">
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{attr(title)}">
<meta property="og:description" content="{attr(desc)}">
<meta property="og:url" content="{attr(url)}">
<meta property="og:locale" content="{attr(CFG['locale'])}">
<meta property="og:image" content="{attr(CFG['url'])}/assets/img/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{attr(title)}">
<meta name="twitter:description" content="{attr(desc)}">
<meta name="twitter:image" content="{attr(CFG['url'])}/assets/img/og.png">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/icon-180.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preload" href="/assets/fonts/InstrumentSans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css">
{ld}{extra}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
{header(path)}
<main id="main">"""


def header(path):
    links = ""
    mob = ""
    for label, href in NAV:
        cur = ' aria-current="page"' if path.startswith(href.rstrip("/") or "/x") and href != "/" else ""
        links += f'<a href="{attr(href)}"{cur}>{e(label)}</a>'
        mob += f'<a href="{attr(href)}">{e(label)}</a>'
    links += '<a class="nav-cta" href="/tools/">College predictors</a>'
    mob += '<a href="/tools/">College predictors</a><a href="/about.html">About</a>'
    return f"""<header class="site-head">
<div class="head-in">
<a class="brand" href="/">{MARK}College<em>Helper</em></a>
<nav class="nav" aria-label="Main">{links}</nav>
<button class="burger" type="button" aria-expanded="false" aria-controls="mnav" aria-label="Menu"><span></span></button>
</div>
<nav class="mobile-nav" id="mnav" aria-label="Mobile">{mob}</nav>
</header>"""


def mobile_bar(path):
    """Fixed bottom navigation on phones. Four destinations, always one tap away,
    which is what keeps someone moving through the site instead of bouncing."""
    items = [("Exams", "/exams/", "exams"), ("Calendar", "/calendar.html", "calendar"),
             ("Tools", "/tools/", "tools"), ("Guides", "/guides/", "guides")]
    out = ""
    for label, href, ico in items:
        cur = ' aria-current="page"' if path and path.startswith(href.rstrip("/")) and href != "/" else ""
        out += f'<a href="{attr(href)}"{cur}>{NAV_ICONS[ico]}<span>{e(label)}</span></a>'
    return f'<nav class="mobile-bar" aria-label="Quick navigation">{out}</nav>'


def footer(path=None):
    cats = "".join(
        f'<li><a href="/exams/?c={k}">{e(v["label"])}</a></li>' for k, v in CATEGORIES.items())
    tools = "".join(f'<li><a href="/tools/{t["slug"]}.html">{e(t["short"])}</a></li>' for t in TOOLS)
    guides = "".join(f'<li><a href="/guides/{g["slug"]}.html">{e(g["title"][:38])}…</a></li>'
                     for g in GUIDES[:4])
    return f"""</main>
{mobile_bar(path)}
<button class="to-top" type="button" id="totop" aria-label="Back to top">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
 stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
<div class="disclaimer"><div class="wrap"><p><strong>Please verify before you act.</strong>
College Helper compiles dates, syllabus and cutoff information from official notifications and
established education sources. Schedules change, notices get revised, and errors are possible.
Always confirm anything that affects a deadline, a fee payment or a counselling choice against the
official website of the conducting body before acting on it.</p></div></div>
<footer class="site-foot">
<div class="wrap">
<div class="foot-grid">
  <div class="foot-about">
    <h4>{e(CFG['name'])}</h4>
    <p>Every major Indian competitive exam in one place — dates, syllabus, eligibility, cutoffs
    and college predictors. Updated as notifications drop.</p>
    <p class="mono" style="font-size:.76rem">Last built {e(fmt_date(CFG['built']))}</p>
  </div>
  <div><h4>Exams</h4><ul>{cats}</ul></div>
  <div><h4>Tools</h4><ul>{tools}
    <li><a href="/calendar.html">Exam calendar</a></li>
    <li><a href="/exams/">All exams</a></li></ul></div>
  <div><h4>Guides</h4><ul>{guides}<li><a href="/guides/">All guides</a></li></ul></div>
</div>
<div class="foot-bar">
  <span>© {TODAY.year} {e(CFG['name'])} · {e(CFG['domain'])}</span>
  <span><a href="/about.html">About</a> · <a href="/contact.html">Contact</a>
  · <a href="/privacy.html">Privacy</a> · <a href="/disclaimer.html">Disclaimer</a></span>
</div>
</div>
</footer>
<script src="/assets/js/site.js" defer></script>
</body>
</html>"""


def crumbs(items):
    """items = [(label, href|None), ...]"""
    parts = []
    ld = []
    for i, (label, href) in enumerate(items, 1):
        parts.append(f'<a href="{attr(href)}">{e(label)}</a>' if href else e(label))
        entry = {"@type": "ListItem", "position": i, "name": label}
        if href:
            entry["item"] = CFG["url"] + href
        ld.append(entry)
    return (' <span aria-hidden="true">/</span> '.join(parts),
            {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": ld})


def write(path, content):
    full = os.path.join(SITE, path.lstrip("/"))
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)
    return path


PAGES = []          # (path, priority, changefreq)


def page(path, content, priority="0.6", freq="weekly"):
    write(path, content)
    PAGES.append((path, priority, freq))


# =============================================================== components ==
def board_row(exam):
    cls, label = status_of(exam)
    d = exam.get("nextDate")
    cd = ""
    if d:
        n = days_until(d)
        if n is not None and n >= 0:
            txt = "Today" if n == 0 else ("Tomorrow" if n == 1 else f"in {n} days")
            cd = f'<span class="row-count mono" data-countdown="{attr(d)}">{e(txt)}</span>'
        else:
            cd = f'<span class="row-count mono past">{e(fmt_date(d))}</span>'
    return f"""<a class="row" href="/exams/{attr(exam['slug'])}.html">
<span class="rail {cls}" aria-hidden="true"></span>
<span class="row-main">
  <span class="row-name">{e(exam['name'])}</span>
  <span class="row-tag {cls}">{e(label)}</span>
  {cd}
</span>
<span class="row-go" aria-hidden="true">›</span>
<span class="row-stage">{e(exam.get('stage',''))}</span>
</a>"""


def exam_card(exam):
    cls, label = status_of(exam)
    d = exam.get("nextDate")
    when = ""
    if d:
        n = days_until(d)
        when = (f'<span class="chip">{e("in %d days" % n)}</span>' if n and n >= 0
                else f'<span class="chip">{e(fmt_date(d))}</span>')
    st = e(CATEGORIES.get(exam["category"], {}).get("label", exam["category"]))
    lvl = f'<span class="chip">{e(exam["state"])}</span>' if exam.get("state") else ""
    return f"""<a class="card cat-{attr(exam['category'])}" href="/exams/{attr(exam['slug'])}.html"
   data-name="{attr(exam['name'].lower()+' '+exam['fullName'].lower()+' '+exam['body'].lower())}"
   data-cat="{attr(exam['category'])}" data-level="{attr(exam['level'])}"
   data-state="{attr(exam.get('state') or '')}">
<span class="card-rail {cls}" aria-hidden="true"></span>
<span class="card-body">
<h3>{e(exam['name'])}</h3>
<p>{e(exam['tagline'])}</p>
<span class="card-meta"><span class="chip {cls}">{e(label)}</span>
<span class="chip cat">{st}</span>{lvl}{when}</span>
</span></a>"""


def table(t):
    """Content table. `data-label` lets the CSS stack it into label/value rows
    on phones instead of forcing a horizontal scroll."""
    head = t["head"]
    thead = "".join(f"<th>{e(h)}</th>" for h in head)
    body = ""
    for r in t["rows"]:
        cells = ""
        for i, c in enumerate(r):
            lbl = head[i] if i < len(head) else ""
            cells += f'<td data-label="{attr(lbl)}">{e(str(c))}</td>'
        body += f"<tr>{cells}</tr>"
    return (f'<div class="tw stack"><table><thead><tr>{thead}</tr></thead>'
            f'<tbody>{body}</tbody></table></div>')


# ================================================================= homepage ==
def build_home():
    board = "".join(board_row(EXAM_BY_SLUG[sl]) for sl in BOARD_ORDER if sl in EXAM_BY_SLUG)

    live = [x for x in EXAMS if x.get("alert")][:3]
    alerts = ""
    for x in live:
        cls, lab = status_of(x)
        alerts += f"""<a class="card cat-{attr(x['category'])}" href="/exams/{attr(x['slug'])}.html">
<span class="card-rail {cls}" aria-hidden="true"></span><span class="card-body">
<h3>{e(x['name'])}</h3><p>{e(x['alert'][:150])}{'…' if len(x['alert'])>150 else ''}</p>
<span class="card-meta"><span class="chip {cls}">{e(lab)}</span></span>
</span></a>"""

    cats = ""
    for k, v in CATEGORIES.items():
        n = len([x for x in EXAMS if x["category"] == k])
        cats += (f'<a class="card cat-{attr(k)}" href="/exams/?c={attr(k)}">'
                 f'<span class="cat-card">'
                 f'<span class="cat-ico">{CAT_ICONS.get(k, "")}</span>'
                 f'<span><h3>{e(v["label"])}</h3><p>{e(v["blurb"])}</p>'
                 f'<span class="card-meta"><span class="chip cat">{n} exam{"s" if n != 1 else ""}</span></span>'
                 f'</span></span></a>')

    tools = ""
    for t in TOOLS:
        x = EXAM_BY_SLUG.get(t["exam"])
        cc = f'cat-{x["category"]}' if x else ""
        tools += f"""<a class="card {cc}" href="/tools/{attr(t['slug'])}.html"><span class="card-body" style="padding-left:0">
<h3>{e(t['name'])}</h3><p>{e(t['blurb'])}</p>
<span class="card-meta"><span class="chip open">₹{t['price']} one-time</span>
<span class="chip">Official cutoff data</span><span class="chip">Safe / moderate / reach</span></span>
</span></a>"""

    guides = "".join(
        f"""<a class="card" href="/guides/{attr(g['slug'])}.html"><span class="card-body" style="padding-left:0">
<h3>{e(g['title'])}</h3><p>{e(g['excerpt'])}</p>
<span class="card-meta"><span class="chip next">{e(g['category'])}</span>
<span class="chip">{e(g['readTime'])}</span></span>
</span></a>""" for g in GUIDES[:4])

    nlive = len([x for x in EXAMS if x.get("status") in ("live", "counselling", "open", "open-soon")])

    ld = [
        {"@context": "https://schema.org", "@type": "WebSite", "name": CFG["name"],
         "url": CFG["url"], "description": CFG["description"], "inLanguage": "en-IN",
         "potentialAction": {"@type": "SearchAction",
                             "target": {"@type": "EntryPoint",
                                        "urlTemplate": CFG["url"] + "/exams/?q={search_term_string}"},
                             "query-input": "required name=search_term_string"}},
        {"@context": "https://schema.org", "@type": "Organization", "name": CFG["name"],
         "url": CFG["url"], "logo": CFG["url"] + "/assets/img/og.png",
         "description": CFG["description"]},
    ]

    body = f"""{head(
        f"{CFG['name']} — Indian competitive exam dates, syllabus, cutoffs and college predictors",
        CFG["description"], "/", jsonld=ld)}

<section class="board-wrap">
  <div class="board-head">
    <p class="eyebrow">Updated {e(fmt_date(CFG['built']))}</p>
    <h1>Exam dates, syllabus and <mark>cutoffs</mark> — in one place</h1>
    <p class="lede">Everything you need for {len(EXAMS)} Indian competitive exams: what is happening
    right now, what closes this week, and which colleges your score actually reaches.</p>

    <form class="hero-search" action="/exams/" method="get" role="search">
      {ICON_SEARCH}
      <label class="sr" for="heroq">Search exams</label>
      <input type="search" id="heroq" name="q" placeholder="Search an exam — JEE, NEET, UPSC…" autocomplete="off">
    </form>

    <div class="hero-actions">
      <a class="btn lg" href="/exams/">Browse all exams {ARROW}</a>
      <a class="btn lg ghost" href="/tools/">Check my college chances</a>
    </div>

    <div class="hero-stats">
      <span><b>{len(EXAMS)}</b> exams tracked</span>
      <span><b>{nlive}</b> open right now</span>
      <span><b>{len(GUIDES)}</b> guides</span>
      <span><b>2</b> college predictors</span>
    </div>
  </div>

  <div class="board">
    <div class="board-inner">
      <div class="board-title"><span><span class="dot"></span>What is happening now</span>
        <span>Next date</span></div>
      {board}
      <div class="board-foot">
        <a class="btn sm ghost" href="/exams/">All {len(EXAMS)} exams</a>
        <a class="btn sm ghost" href="/calendar.html">Full calendar</a>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap reveal">
    <div class="sec-head"><p class="eyebrow">Start here</p>
      <h2>Three steps, whatever exam you are writing</h2></div>
    <div class="steps">
      <div class="step"><h3>Find your exam</h3>
        <p>Search or filter by category, level and state. Every exam has its own page with
        dates, pattern, full syllabus and eligibility.</p></div>
      <div class="step"><h3>Track what is next</h3>
        <p>Each page shows the current stage and a live countdown to the next deadline, so you
        never miss a form or a fee date.</p></div>
      <div class="step"><h3>Predict your college</h3>
        <p>Put your rank or merit number into a predictor and see exactly which colleges closed
        at or near it last year.</p></div>
    </div>
  </div>
</section>

<section class="section alt">
  <div class="wrap reveal">
    <div class="sec-head"><p class="eyebrow">Closing soon</p>
      <h2>Deadlines you should not miss</h2>
      <p>The three things most likely to affect you this week.</p></div>
    <div class="grid g3">{alerts}</div>
  </div>
</section>

<section class="section">
  <div class="wrap reveal">
    <div class="sec-head-row"><div class="sec-head"><p class="eyebrow">Browse</p>
      <h2>Pick your category</h2>
      <p>Every exam we track, grouped by the kind of career it leads to.</p></div>
      <a class="btn ghost" href="/exams/">See all {ARROW}</a></div>
    <div class="grid g4">{cats}</div>
  </div>
</section>

<section class="section alt">
  <div class="wrap reveal">
    <div class="sec-head"><p class="eyebrow">Predictor tools</p>
      <h2>Find out which colleges your score reaches</h2>
      <p>Built on the official cutoff lists. The calculation runs in your browser — your rank
      is never uploaded anywhere.</p></div>
    <div class="grid g2">{tools}</div>
  </div>
</section>

<section class="section">
  <div class="wrap reveal">
    <div class="sec-head-row"><div class="sec-head"><p class="eyebrow">Guides</p>
      <h2>Choosing between exams, and what comes after</h2>
      <p>Comparisons, salary and posting breakdowns, and the counselling advice that changes outcomes.</p></div>
      <a class="btn ghost" href="/guides/">All guides {ARROW}</a></div>
    <div class="grid g2">{guides}</div>
  </div>
</section>

<section class="section alt">
  <div class="wrap">
    <div class="cta-strip reveal">
      <div><h2>Every exam page is free</h2>
      <p>No account, no ads, no email capture. Start with the calendar and work backwards from
      your next deadline.</p></div>
      <div class="btns"><a class="btn" href="/calendar.html">Open the calendar {ARROW}</a>
      <a class="btn ghost" href="/contact.html">Report a correction</a></div>
    </div>
  </div>
</section>
{footer("/")}"""
    page("/index.html", body, "1.0", "daily")


# ============================================================== exam pages ==
def build_exam(x):
    cls, label = status_of(x)
    cb, cld = crumbs([("Home", "/"), ("Exams", "/exams/"), (x["name"], None)])

    badges = f'<span class="badge {cls}">{e(label)}</span>'
    badges += f'<span class="badge">{e(CATEGORIES[x["category"]]["label"])}</span>'
    badges += f'<span class="badge">{e("State — " + x["state"]) if x.get("state") else "National"}</span>'
    badges += f'<span class="badge">{e(x["frequency"])}</span>'

    cd = ""
    if x.get("nextDate"):
        n = days_until(x["nextDate"])
        if n is not None and n >= 0:
            cd = (f'<div class="countdown"><span class="num mono" data-countdown-num="{attr(x["nextDate"])}">{n}</span>'
                  f'<span class="lbl">days to go</span></div>')
    stagebar = f"""<div class="statusbar">
<p class="st-stage"><strong>{e(label)}.</strong> {e(x.get('stage',''))}</p>{cd}</div>"""

    alert = ""
    if x.get("alert"):
        alert = f'<div class="alertbox">{ICON_ALERT}<p>{e(x["alert"])}</p></div>'

    # sections
    sections = []

    elig = "".join(f"<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>" for k, v in x["eligibility"])
    sections.append(("eligibility", "Eligibility", f'<dl class="deflist">{elig}</dl>'))

    pat = table(x["pattern"])
    for n in x["pattern"].get("notes", []):
        pat += f'<p class="tnote">{e(n)}</p>'
    sections.append(("pattern", "Exam pattern and marking", pat))

    syl = "".join(
        f'<details class="acc"><summary>{e(s)}</summary><div class="acc-body"><p>{e(t)}</p></div></details>'
        for s, t in x["syllabus"])
    sections.append(("syllabus", "Syllabus", syl))

    dl = ""
    for ev, dt, st in x["dates"]:
        rc = {"live": "live", "next": "next", "done": "", "upcoming": "next", "cancelled": "alert"}.get(st, "")
        dl += (f'<li class="is-{attr(st)}"><span class="rail {rc}" aria-hidden="true"></span>'
               f'<span class="d-ev">{e(ev)}</span><span class="d-dt">{e(dt)}</span></li>')
    sections.append(("dates", "Important dates", f'<ul class="dates">{dl}</ul>'))

    cut = f'<p>{e(x["cutoff"]["note"])}</p>' + table(x["cutoff"]) + \
          f'<p class="tnote">{e(x["cutoff"]["disclaimer"])}</p>'
    sections.append(("cutoff", "Cutoff trends", cut))

    car = "".join(f'<details class="acc"><summary>{e(a)}</summary>'
                  f'<div class="acc-body"><p>{e(b)}</p></div></details>' for a, b in x["careers"])
    car += ('<p class="tnote">Full pay scales and posting details for every exam are in the '
            '<a href="/guides/careers-and-salary-after-every-exam.html">careers and salary guide</a>.</p>')
    sections.append(("careers", "What you get after clearing it", car))

    faq = "".join(f'<details class="acc"><summary>{e(q)}</summary>'
                  f'<div class="acc-body"><p>{e(a)}</p></div></details>' for q, a in x["faqs"])
    sections.append(("faq", "Frequently asked questions", faq))

    # tool + related
    extras = ""
    for tslug in x.get("tools", []):
        t = next((t for t in TOOLS if t["slug"] == tslug), None)
        if t:
            extras += f"""<div class="cta-strip" style="margin-bottom:1rem">
<div><h2>{e(t['name'])}</h2><p>{e(t['blurb'])}</p></div>
<div class="btns"><a class="btn" href="/tools/{attr(t['slug'])}.html">Open the predictor</a></div></div>"""

    rel = [y for y in EXAMS if y["category"] == x["category"] and y["slug"] != x["slug"]][:4]
    rl = "".join(f'<a href="/exams/{attr(y["slug"])}.html">{e(y["name"])}<span>{e(status_of(y)[1])}</span></a>'
                 for y in rel)
    relguides = [g for g in GUIDES if x["slug"] in g.get("related", [])][:3]
    gl = "".join(f'<a href="/guides/{attr(g["slug"])}.html">{e(g["title"])}<span>{e(g["readTime"])}</span></a>'
                 for g in relguides)

    body_html = ""
    for sid, stitle, shtml in sections:
        body_html += f'<section class="block" id="{sid}"><h2>{e(stitle)}</h2>{shtml}</section>'
    if extras:
        body_html += f'<section class="block">{extras}</section>'
    if gl:
        body_html += f'<section class="block"><h2>Related guides</h2><div class="prose-links">{gl}</div></section>'
    if rl:
        body_html += f'<section class="block"><h2>Other {e(CATEGORIES[x["category"]]["label"].lower())} exams</h2><div class="prose-links">{rl}</div></section>'

    toc = "".join(f'<a href="#{sid}">{e(t)}</a>' for sid, t, _ in sections)

    faqld = {"@context": "https://schema.org", "@type": "FAQPage",
             "mainEntity": [{"@type": "Question", "name": q,
                             "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in x["faqs"]]}
    title = f"{x['name']} {TODAY.year} — dates, syllabus, eligibility and cutoffs | {CFG['name']}"
    desc = (f"{x['name']} ({x['fullName']}) conducted by {x['body']}. {x['statusLabel']}. "
            f"Exam pattern, full syllabus, eligibility, important dates and cutoff trends.")[:300]

    out = f"""{head(title, desc, f"/exams/{x['slug']}.html", jsonld=[cld, faqld], og_type="article")}
<div class="cat-{attr(x['category'])}">
<section class="exam-hero"><div class="wrap">
<p class="crumb">{cb}</p>
<h1>{e(x['name'])} {TODAY.year}</h1>
<p class="sub">{e(x['fullName'])} · conducted by {e(x['body'])}</p>
<div class="exam-badges">{badges}</div>
{stagebar}
</div></section>
<div class="wrap"><div class="exam-layout">
<div>
{alert}
<p class="lede" style="margin-bottom:1.6rem">{e(x['summary'])}</p>
<div class="pill-row" style="margin-bottom:2rem">
  <span class="pill">Mode: {e(x['mode'])}</span>
  <a class="pill" href="{attr(x['site'])}" rel="nofollow noopener" target="_blank">Official site ↗</a>
</div>
{body_html}
</div>
<aside class="toc"><p class="eyebrow">On this page</p>{toc}</aside>
</div></div>
</div>
{footer("/exams/")}"""
    page(f"/exams/{x['slug']}.html", out, "0.9", "weekly")


# ============================================================== exam index ==
def build_exam_index():
    cb, cld = crumbs([("Home", "/"), ("Exams", None)])
    cards = "".join(exam_card(x) for x in sorted(EXAMS, key=lambda z: (z["category"], z["name"])))
    catfilters = "".join(
        f'<button class="filter" type="button" data-filter="cat" data-value="{attr(k)}" '
        f'aria-pressed="false">{e(v["label"])}</button>' for k, v in CATEGORIES.items())
    states = sorted({x["state"] for x in EXAMS if x.get("state")})
    statefilters = "".join(
        f'<button class="filter" type="button" data-filter="state" data-value="{attr(s)}" '
        f'aria-pressed="false">{e(s)}</button>' for s in states)

    ld = {"@context": "https://schema.org", "@type": "ItemList",
          "itemListElement": [{"@type": "ListItem", "position": i,
                               "url": f"{CFG['url']}/exams/{x['slug']}.html", "name": x["name"]}
                              for i, x in enumerate(EXAMS, 1)]}

    out = f"""{head(
        f"All Indian competitive exams {TODAY.year} — search and filter | {CFG['name']}",
        "Search and filter every major Indian competitive exam by category, level and state. "
        "JEE, NEET, UPSC, SSC, IBPS, SBI, CAT, CLAT, GATE, CUET and MHT CET with dates, "
        "syllabus, eligibility and cutoffs.",
        "/exams/", jsonld=[cld, ld])}
<section class="exam-hero"><div class="wrap">
<p class="crumb">{cb}</p>
<h1>All exams</h1>
<p class="sub">{len(EXAMS)} exams tracked. Search by name, or filter by category, level and state.</p>
</div></section>
<div class="section"><div class="wrap">
<div class="finder">
  <div class="search-box">{ICON_SEARCH}
    <label class="sr" for="q">Search exams</label>
    <input type="search" id="q" placeholder="Search — try 'banking', 'NTA', 'Maharashtra'…" autocomplete="off">
  </div>
  <div class="filters" role="group" aria-label="Filter by category">
    <button class="filter" type="button" data-filter="cat" data-value="" aria-pressed="true">All</button>
    {catfilters}
  </div>
  <div class="filters" role="group" aria-label="Filter by level">
    <button class="filter" type="button" data-filter="level" data-value="" aria-pressed="true">Any level</button>
    <button class="filter" type="button" data-filter="level" data-value="national" aria-pressed="false">National</button>
    <button class="filter" type="button" data-filter="level" data-value="state" aria-pressed="false">State</button>
    {statefilters}
  </div>
</div>
<p class="result-count" id="count" aria-live="polite"></p>
<div class="grid g3" id="results">{cards}</div>
<p class="empty" id="empty" hidden>No exam matches that. Try a shorter search term, or
<button class="btn ghost sm" type="button" id="clear">clear the filters</button>.</p>
</div></div>
{footer("/exams/")}"""
    page("/exams/index.html", out, "0.9", "weekly")


# ================================================================ calendar ==
def build_calendar():
    events = []
    for x in EXAMS:
        for ev, dt, st in x["dates"]:
            iso = parse_when(dt)
            if iso:
                events.append((iso, f"{x['name']} — {ev}", x["category"], x["name"], st,
                               f"/exams/{x['slug']}.html", dt))
    for iso, title, cat, name, st, href in EXTRA_EVENTS:
        events.append((iso, title, cat, name, st, href, fmt_date(iso)))

    events.sort(key=lambda z: z[0])
    events = [ev for ev in events if ev[0] >= "2026-07-01"]

    months, cur, buf = [], None, []
    for ev in events:
        m = ev[0][:7]
        if m != cur:
            if buf:
                months.append((cur, buf))
            cur, buf = m, []
        buf.append(ev)
    if buf:
        months.append((cur, buf))

    body = ""
    for m, evs in months:
        mn = datetime.strptime(m, "%Y-%m").strftime("%B %Y")
        items = ""
        for iso, title, cat, name, st, href, disp in evs:
            d = date.fromisoformat(iso)
            rc = {"live": "live", "next": "next", "upcoming": "next",
                  "cancelled": "alert", "open": "open"}.get(st, "")
            past = d < TODAY
            items += f"""<div class="cal-item">
<span class="rail {'' if past else rc}" aria-hidden="true"></span>
<span class="cal-date mono">{d.day:02d}<small>{d.strftime('%b')}</small></span>
<span class="cal-body"><p class="ev"><a href="{attr(href)}">{e(title)}</a></p>
<p class="mt"><span class="chip">{e(CATEGORIES.get(cat,{}).get('label',cat))}</span>
<span>{e(disp)}</span></p></span></div>"""
        items_count = len(evs)
        body += (f'<div class="cal-month"><h2>{e(mn)}<span>{items_count} '
                 f'event{"s" if items_count != 1 else ""}</span></h2>{items}</div>')

    cb, cld = crumbs([("Home", "/"), ("Calendar", None)])
    out = f"""{head(
        f"Indian competitive exam calendar {TODAY.year}–{TODAY.year+1} — all dates in one list | {CFG['name']}",
        "A single running calendar of every notification, application deadline, exam date, "
        "result and counselling round across JEE, NEET, UPSC, SSC, banking, CAT, CLAT, GATE, "
        "CUET and MHT CET.",
        "/calendar.html", jsonld=cld)}
<section class="exam-hero"><div class="wrap">
<p class="crumb">{cb}</p>
<h1>Exam calendar</h1>
<p class="sub">Every notification, deadline, exam day, result and counselling round we track,
in one running list. Past dates stay visible so you can see where a cycle currently stands.</p>
</div></section>
<div class="section"><div class="wrap">
<div class="finder">
  <div class="search-box">{ICON_SEARCH}
    <label class="sr" for="calq">Search the calendar</label>
    <input type="search" id="calq" placeholder="Filter — try 'NEET', 'mains', 'registration'…" autocomplete="off">
  </div>
</div>
<div id="calendar">{body}</div>
</div></div>
{footer("/calendar.html")}"""
    page("/calendar.html", out, "0.9", "daily")


MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}


def parse_when(s):
    """Best-effort ISO date from the human-written date strings in the data."""
    s = s.strip()
    m = re.search(r"(\d{1,2})\s+([A-Z][a-z]{2})\w*\s+(\d{4})", s)
    if m and m.group(2) in MONTHS:
        try:
            return date(int(m.group(3)), MONTHS[m.group(2)], int(m.group(1))).isoformat()
        except ValueError:
            return None
    m = re.search(r"([A-Z][a-z]{2})\w*\s+(\d{4})", s)
    if m and m.group(1) in MONTHS:
        return date(int(m.group(2)), MONTHS[m.group(1)], 1).isoformat()
    return None


# ================================================================== guides ==
def render_blocks(blocks):
    out = ""
    for b in blocks:
        if "h" in b:
            out += f"<h2>{e(b['h'])}</h2>"
        elif "p" in b:
            out += f"<p>{b['p'] if '<a ' in b['p'] else e(b['p'])}</p>"
        elif "ul" in b:
            out += "<ul>" + "".join(f"<li>{e(i)}</li>" for i in b["ul"]) + "</ul>"
        elif "table" in b:
            out += table(b["table"])
        elif "note" in b:
            out += f'<div class="callout"><p>{e(b["note"])}</p></div>'
        elif "verdict" in b:
            out += '<dl class="verdict">' + "".join(
                f"<div><dt>{e(a)}</dt><dd>{e(c)}</dd></div>" for a, c in b["verdict"]) + "</dl>"
    return out


def build_guide(g):
    cb, cld = crumbs([("Home", "/"), ("Guides", "/guides/"), (g["title"][:40], None)])
    rel = "".join(
        f'<a href="/exams/{attr(s)}.html">{e(EXAM_BY_SLUG[s]["name"])}'
        f'<span>{e(status_of(EXAM_BY_SLUG[s])[1])}</span></a>'
        for s in g.get("related", []) if s in EXAM_BY_SLUG)
    others = "".join(
        f'<a href="/guides/{attr(o["slug"])}.html">{e(o["title"])}<span>{e(o["readTime"])}</span></a>'
        for o in GUIDES if o["slug"] != g["slug"])[:4000]

    ld = {"@context": "https://schema.org", "@type": "Article",
          "headline": g["title"], "description": g["excerpt"],
          "datePublished": g["updated"], "dateModified": g["updated"],
          "inLanguage": "en-IN",
          "author": {"@type": "Organization", "name": CFG["name"]},
          "publisher": {"@type": "Organization", "name": CFG["name"],
                        "logo": {"@type": "ImageObject", "url": CFG["url"] + "/assets/img/og.png"}},
          "mainEntityOfPage": f"{CFG['url']}/guides/{g['slug']}.html"}

    out = f"""{head(f"{g['title']} | {CFG['name']}", g["excerpt"],
                    f"/guides/{g['slug']}.html", jsonld=[cld, ld], og_type="article")}
<section class="exam-hero"><div class="wrap">
<p class="crumb">{cb}</p>
<h1>{e(g['title'])}</h1>
<p class="sub">{e(g['excerpt'])}</p>
<div class="exam-badges"><span class="badge">{e(g['category'])}</span>
<span class="badge">{e(g['readTime'])} read</span>
<span class="badge">Updated {e(fmt_date(g['updated']))}</span></div>
</div></section>
<div class="section"><div class="wrap-narrow">
<article class="article">{render_blocks(g.get('blocks', []))}</article>
{f'<h2 style="margin-top:2.5rem">Exams covered here</h2><div class="prose-links">{rel}</div>' if rel else ''}
<h2 style="margin-top:2.5rem">More guides</h2><div class="prose-links">{others}</div>
</div></div>
{footer("/guides/")}"""
    page(f"/guides/{g['slug']}.html", out, "0.8", "monthly")


def build_guide_index():
    cb, cld = crumbs([("Home", "/"), ("Guides", None)])
    cards = "".join(f"""<a class="card" href="/guides/{attr(g['slug'])}.html"><span class="card-body" style="padding-left:0">
<h3>{e(g['title'])}</h3><p>{e(g['excerpt'])}</p>
<span class="card-meta"><span class="chip">{e(g['category'])}</span>
<span class="chip">{e(g['readTime'])}</span></span></span></a>""" for g in GUIDES)
    out = f"""{head(f"Exam guides — comparisons, careers and counselling advice | {CFG['name']}",
        "Which exam to choose, what you actually earn afterwards, and how to read a cutoff list "
        "without losing a seat. Practical guides for Indian competitive exam aspirants.",
        "/guides/", jsonld=cld)}
<section class="exam-hero"><div class="wrap">
<p class="crumb">{cb}</p><h1>Guides</h1>
<p class="sub">Choosing between exams, what the job actually pays, and the counselling mistakes
that cost people seats every year.</p>
</div></section>
<div class="section"><div class="wrap"><div class="grid g2">{cards}</div></div></div>
{footer("/guides/")}"""
    page("/guides/index.html", out, "0.8", "monthly")


# =================================================================== tools ==
def build_tools_index():
    cb, cld = crumbs([("Home", "/"), ("Tools", None)])
    cards = ""
    for t in TOOLS:
        x = EXAM_BY_SLUG.get(t["exam"])
        cards += f"""<a class="card" href="/tools/{attr(t['slug'])}.html"><span class="card-body" style="padding-left:0">
<h3>{e(t['name'])}</h3><p>{e(t['blurb'])}</p>
<span class="card-meta"><span class="chip open">₹{t['price']} one-time</span>
<span class="chip">{e(x['name']) if x else ''}</span></span></span></a>"""
    out = f"""{head(f"College predictors — MHT CET and NEET | {CFG['name']}",
        "MHT CET and NEET college predictors running on official cutoff data. "
        "One-time unlock per tool — your rank never leaves your browser.",
        "/tools/", jsonld=cld)}
<section class="exam-hero"><div class="wrap">
<p class="crumb">{cb}</p><h1>College predictors</h1>
<p class="sub">Enter your rank or merit number and see which colleges closed at or near it,
using the official cutoff lists. Each tool is a one-time unlock; the calculation runs in your
browser and your rank is never uploaded.</p>
</div></section>
<div class="section"><div class="wrap"><div class="grid g2">{cards}</div>
<div class="callout" style="margin-top:2rem"><p><strong>How to read the results.</strong>
A predictor tells you where last year's cutoffs landed, not where this year's will.
Read <a href="/guides/how-to-read-a-cutoff-list.html">how to read a cutoff list</a> before you
build your choice list — the ordering mistakes described there cost more seats than a low
score does.</p></div>
</div></div>
{footer("/tools/")}"""
    page("/tools/index.html", out, "0.9", "monthly")


def build_cet_tool():
    t = TOOLS[0]
    cb, cld = crumbs([("Home", "/"), ("Tools", "/tools/"), ("MHT CET Predictor", None)])
    ld = {"@context": "https://schema.org", "@type": "WebApplication",
          "name": t["name"], "applicationCategory": "EducationalApplication",
          "operatingSystem": "Any", "url": f"{CFG['url']}/tools/{t['slug']}.html",
          "offers": {"@type": "Offer", "price": str(t["price"]), "priceCurrency": "INR"},
          "description": t["blurb"]}
    out = f"""{head(f"MHT CET College Predictor {TODAY.year} — official CAP Rounds I–III cutoff data | {CFG['name']}",
        "MHT CET college predictor. Enter your Maharashtra State General Merit Number, "
        "category and seat type to see every college and branch that closed at or near it across "
        "CAP Rounds I, II and III.",
        f"/tools/{t['slug']}.html", jsonld=[cld, ld])}
<section class="exam-hero"><div class="wrap">
<p class="crumb">{cb}</p><h1>MHT CET College Predictor</h1>
<p class="sub">Enter your Maharashtra State General Merit Number and see every college and branch
that closed at or near it. Built on the official MHT CET 2025 CAP Rounds I–III cut-off lists.</p>
<div class="exam-badges"><span class="badge open">₹{t['price']} one-time unlock</span>
<span class="badge">Runs in your browser</span><span class="badge">Restore on any device</span></div>
</div></section>
<div class="tool-shell"><div class="wrap">
<div id="cet-app" data-tool="cet">
  <div class="loading"><div class="spin"></div>Loading the CAP cutoff dataset…</div>
</div>
<div class="callout" style="margin-top:2rem"><p><strong>What the bands mean.</strong>
<em>Safe</em> means your merit number is at or better than last year's closing number for that seat.
<em>Moderate</em> is within 10% beyond it, and <em>Reach</em> within 15%. Cutoffs drift year to
year, so a near miss is still worth listing.
Read <a href="/guides/how-to-read-a-cutoff-list.html">how to read a cutoff list</a> before you
lock your choices, and see the <a href="/exams/mht-cet.html">MHT CET exam page</a> for the current
CAP schedule.</p></div>
</div></div>
{footer("/tools/")}"""
    page(f"/tools/{t['slug']}.html", out, "0.9", "monthly")


def build_neet_tool():
    t = TOOLS[1]
    cb, cld = crumbs([("Home", "/"), ("Tools", "/tools/"), ("NEET Predictor", None)])
    ld = {"@context": "https://schema.org", "@type": "WebApplication",
          "name": t["name"], "applicationCategory": "EducationalApplication",
          "operatingSystem": "Any", "url": f"{CFG['url']}/tools/{t['slug']}.html",
          "offers": {"@type": "Offer", "price": str(t["price"]), "priceCurrency": "INR"},
          "description": t["blurb"]}
    out = f"""{head(f"NEET College Predictor {TODAY.year} — MBBS and BDS seat finder on MCC data | {CFG['name']}",
        "NEET college predictor. Enter your All India Rank and category to see the MBBS, "
        "BDS and BSc Nursing seats that closed at or near it in MCC All India Quota counselling.",
        f"/tools/{t['slug']}.html", jsonld=[cld, ld])}
<section class="exam-hero"><div class="wrap">
<p class="crumb">{cb}</p><h1>NEET College Predictor</h1>
<p class="sub">Enter your NEET All India Rank and category to see the MBBS, BDS and BSc Nursing
seats that closed at or near it. Built on MCC All India Quota counselling allotment data,
Rounds 1 to 3.</p>
<div class="exam-badges"><span class="badge open">₹{t['price']} one-time unlock</span>
<span class="badge">Runs in your browser</span><span class="badge">Restore on any device</span></div>
</div></section>
<div class="tool-shell"><div class="wrap">
<div id="neet-app" data-tool="neet">
  <div class="loading"><div class="spin"></div>Loading the MCC counselling dataset…</div>
</div>
<div class="callout" style="margin-top:2rem"><p><strong>This covers All India Quota only.</strong>
MCC counselling handles 15% of government college seats plus AIIMS, JIPMER, deemed and central
universities. The other 85% goes through your state's own counselling with a separate merit list.
Read <a href="/guides/neet-all-india-quota-vs-state-quota.html">AIQ versus state quota</a> before
you plan, and check the <a href="/exams/neet-ug.html">NEET UG page</a> for the current
counselling schedule.</p></div>
</div></div>
{footer("/tools/")}"""
    page(f"/tools/{t['slug']}.html", out, "0.9", "monthly")


# ============================================================ static pages ==
def simple(path, title, desc, h1, body, priority="0.4"):
    cb, cld = crumbs([("Home", "/"), (h1, None)])
    out = f"""{head(f"{title} | {CFG['name']}", desc, path, jsonld=cld)}
<section class="exam-hero"><div class="wrap"><p class="crumb">{cb}</p><h1>{e(h1)}</h1></div></section>
<div class="section"><div class="wrap-narrow"><article class="article">{body}</article></div></div>
{footer()}"""
    page(path, out, priority, "yearly")


def build_static():
    simple("/about.html", "About College Helper", 
        "Who runs College Helper, where the data comes from, and how corrections are handled.",
        "About", f"""
<p>College Helper is an independent site that tracks Indian competitive exams — the dates, the
syllabus, the eligibility rules, the cutoffs, and what actually happens after you clear one.</p>
<h2>Why it exists</h2>
<p>Exam information in India is scattered across dozens of official portals that publish PDFs
with no consistent format, and aggregator sites that bury the answer under advertising. A student
trying to work out whether their MHT CET merit number reaches a particular college, or when the
UPSC Mains actually starts, should not have to open eleven tabs.</p>
<h2>Where the data comes from</h2>
<ul>
<li>Exam dates, patterns and eligibility come from the official notifications published by NTA,
UPSC, SSC, IBPS, the IIMs, the Consortium of NLUs, the Maharashtra State CET Cell and others.</li>
<li>The MHT CET predictor runs on the official MHT CET 2025 CAP Rounds I, II and III cut-off lists
published by the Maharashtra State CET Cell.</li>
<li>The NEET predictor runs on Medical Counselling Committee All India Quota allotment lists for
Rounds 1 to 3.</li>
</ul>
<h2>What this site does not do</h2>
<ul>
<li>It does not sell coaching, courses or counselling services.</li>
<li>The exam pages are free and need no account. The two college predictors are one-time paid
unlocks — that payment funds the site, so there are no ads and no selling of leads.</li>
<li>Your rank or merit number is never uploaded. Even in the paid predictors, the calculation
happens in your browser once the data is unlocked.</li>
</ul>
<h2>Corrections</h2>
<p>Schedules change and mistakes happen. If something here is wrong or out of date,
<a href="/contact.html">tell us</a> and it will be corrected. Include the exam and a link to the
official notice where you can.</p>""")

    simple("/contact.html", "Contact", "Report a correction or get in touch with College Helper.",
        "Contact", f"""
<p>The most useful thing you can send is a correction. If a date has moved, a notification has
dropped, or something on this site does not match the official notice, let us know.</p>
<h2>Email</h2>
<p><a href="mailto:{e(CFG['email'])}">{e(CFG['email'])}</a></p>
<h2>What to include in a correction</h2>
<ul>
<li>Which exam and which page.</li>
<li>What it currently says and what it should say.</li>
<li>A link to the official notification, if you have one. This is the part that lets a correction
go up quickly rather than sitting in a queue.</li>
</ul>
<h2>What we cannot help with</h2>
<ul>
<li>Individual admission decisions, seat allotments or counselling appeals — those go to the
conducting body or counselling authority.</li>
<li>Predicting your rank from your marks before an official answer key is out.</li>
<li>Anything requiring access to your application account.</li>
</ul>""")

    simple("/privacy.html", "Privacy policy", "How College Helper handles your data — briefly, because there is not much of it.",
        "Privacy policy", """
<p>This is a static website. There is no account system, no login, and no database of users.</p>
<h2>What we collect</h2>
<ul>
<li><strong>Nothing you type into the predictors.</strong> Both college predictors download the
cutoff dataset to your browser and do the calculation locally. Your rank, merit number and
category are never sent to any server.</li>
<li><strong>No cookies are set by this site</strong> for tracking or advertising.</li>
<li>Your browser's local storage may be used to remember a saved shortlist inside a predictor.
That data stays on your device and you can clear it at any time from the tool.</li>
</ul>
<h2>Payments</h2>
<p>The college predictors are one-time paid unlocks processed by Razorpay. Your card or UPI
details go to Razorpay directly and never touch this site. We store only the Razorpay payment ID
and an access token, so a purchase can be verified and restored on another device. Because access
to the data is delivered instantly, payments are generally non-refundable — except duplicate or
failed-but-charged transactions, which are returned: <a href="/contact.html">write to us</a> with
the payment ID.</p>
<h2>Hosting and logs</h2>
<p>The site is served by a static hosting provider, which keeps standard server access logs
(IP address, user agent, requested URL) for security and abuse prevention. That is standard for
any website and is governed by the host's own privacy policy.</p>
<h2>Third parties</h2>
<p>Fonts are served from this domain rather than a font CDN, so no third-party request is made
for them. Links to official exam websites are external and are governed by those sites' policies.</p>
<h2>Changes</h2>
<p>If this policy changes, the updated version will appear on this page.</p>""")

    simple("/disclaimer.html", "Disclaimer", "The limits of what College Helper can promise about accuracy.",
        "Disclaimer", """
<p>College Helper is an independent information site. It is not affiliated with, endorsed by, or
connected to the National Testing Agency, the Union Public Service Commission, the Staff Selection
Commission, the Institute of Banking Personnel Selection, the State Bank of India, the Indian
Institutes of Management, the Consortium of National Law Universities, the Medical Counselling
Committee, the Maharashtra State CET Cell, or any other conducting or counselling body.</p>
<h2>Accuracy</h2>
<p>Every effort is made to keep dates, patterns and eligibility rules current, and each page notes
where its information comes from. But notifications get revised, schedules shift and errors are
possible. <strong>Before you act on anything here that affects a deadline, a fee payment or a
counselling choice, verify it against the official website of the conducting body.</strong></p>
<h2>College predictors</h2>
<p>The predictors show what happened in a previous counselling cycle. They are a planning aid,
not a forecast. Cutoffs move every year with the number of candidates, the seat matrix, the
difficulty of the paper and where strong candidates chose to go. A seat shown as "safe" is not a
guarantee, and a seat shown as out of reach may still open up in a later round.</p>
<h2>Career and salary information</h2>
<p>Pay figures follow the applicable pay commission matrix or bipartite settlement at the time of
writing and are indicative. Actual pay varies with city classification, allowance revisions and
department. Placement figures reported by institutes are self-reported and are frequently averages
rather than medians.</p>
<h2>External links</h2>
<p>Links to official sites are provided for convenience. We do not control their content and are
not responsible for it.</p>""")

    # 404
    write("/404.html", f"""{head("Page not found", "That page does not exist on College Helper.", "/404.html")}
<section class="exam-hero"><div class="wrap"><h1>That page does not exist</h1>
<p class="sub">The link may be out of date, or the page may have moved.</p></div></section>
<div class="section"><div class="wrap-narrow"><article class="article">
<p>Try one of these instead:</p>
<div class="prose-links">
<a href="/exams/">All exams<span>{len(EXAMS)} tracked</span></a>
<a href="/calendar.html">Exam calendar<span>Every date</span></a>
<a href="/tools/">College predictors<span>MHT CET and NEET</span></a>
<a href="/guides/">Guides<span>{len(GUIDES)} articles</span></a>
</div></article></div></div>
{footer()}""")


# ================================================================ manifests ==
def build_meta():
    # sitemap
    urls = ""
    for path, pri, freq in sorted(set(PAGES)):
        loc = CFG["url"] + ("/" if path == "/index.html" else path.replace("/index.html", "/"))
        urls += (f"<url><loc>{attr(loc)}</loc><lastmod>{CFG['built']}</lastmod>"
                 f"<changefreq>{freq}</changefreq><priority>{pri}</priority></url>")
    write("/sitemap.xml",
          '<?xml version="1.0" encoding="UTF-8"?>'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls + "</urlset>")

    write("/robots.txt", f"""User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: {CFG['url']}/sitemap.xml
""")

    write("/manifest.webmanifest", json.dumps({
        "name": CFG["name"], "short_name": "CollegeHelper",
        "description": CFG["description"],
        "start_url": "/", "display": "standalone",
        "background_color": "#FFFFFF", "theme_color": "#0B1220",
        "lang": "en-IN",
        "icons": [
            {"src": "/assets/img/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "/assets/img/icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": "/assets/img/icon-512.png", "sizes": "512x512", "type": "image/png",
             "purpose": "maskable"},
        ],
    }, indent=2))

    # Cloudflare Pages headers + redirects
    write("/_headers", """/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()

/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/assets/css/*
  Cache-Control: public, max-age=604800

/assets/js/*
  Cache-Control: public, max-age=604800

/assets/data/*
  Cache-Control: public, max-age=86400

/admin/*
  X-Robots-Tag: noindex, nofollow
""")

    write("/_redirects", """# Trailing-slash and legacy tidy-ups
/exam/*      /exams/:splat   301
/tool/*      /tools/:splat   301
/guide/*     /guides/:splat  301
/index       /               301
""")

    # content JSON — powers the admin panel and any future client-side search
    content = {
        "site": CFG,
        "categories": CATEGORIES,
        "exams": [{k: v for k, v in x.items()} for x in EXAMS],
        "guides": [dict(g) for g in GUIDES],
        "tools": TOOLS,
        "extraEvents": [list(x) for x in EXTRA_EVENTS],
        "boardOrder": BOARD_ORDER,
        "generated": CFG["built"],
    }
    write("/assets/data/site-content.json",
          json.dumps(content, ensure_ascii=False, indent=1))


# ==================================================================== main ==
def main():
    print("Building College Helper…")
    for d in ("exams", "guides", "tools"):
        os.makedirs(os.path.join(SITE, d), exist_ok=True)

    build_home()
    build_exam_index()
    for x in EXAMS:
        build_exam(x)
    build_calendar()
    build_guide_index()
    for g in GUIDES:
        build_guide(g)
    build_tools_index()
    build_cet_tool()
    build_neet_tool()
    build_static()
    build_meta()

    print(f"  {len(PAGES)} pages · {len(EXAMS)} exams · {len(GUIDES)} guides · {len(TOOLS)} tools")
    print(f"  output → {SITE}")


if __name__ == "__main__":
    main()
