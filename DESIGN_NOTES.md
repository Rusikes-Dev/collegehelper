# Design notes

Why the site looked unfinished, and the decisions taken to fix it.

## The real problem

The old design was not careless — the token file, the 44px tap targets, the
reduced-motion block and the "never guess a figure" rule in the data file were
all deliberate. Three things made it *read* as unfinished anyway:

1. **The Search tab had one college in it.** `src/data/colleges.ts` held a
   single hand-written record (VJTI). Meanwhile `data/` carried 386 institutes,
   2,330 programs and 90,289 official CAP cutoff rows that the site never
   touched. No amount of styling fixes a directory with one entry.
2. **Every surface was the same surface.** White card, 1px `#E4E7EC` border,
   12px radius, everywhere, for every kind of content. With no elevation or
   colour hierarchy, a page of facts and a page of results looked identical.
3. **Nothing rewarded scrolling.** The home tab was a bare three-step form.
   Once you had your answer there was no second thing to do, so nobody stayed.

## Audience

Maharashtra students aged 17–18 and their parents, on mid-range Android over
patchy 4G, during the CAP season. They arrive anxious with one question — "with
my percentile, where do I actually stand?" — and then want to browse and
compare. Mobile is the primary target, not a fallback.

## Direction: "the merit list, redrawn"

The object at the centre of this process is the CAP merit list: a dense,
official, printed table every student squints at. The site should feel like
that document redrawn by someone competent. Authoritative and numeric, but
legible and calm. Not a government PDF, not a startup landing page.

### Colour

The three chance bands (good / possible / reach) carry meaning, so green, amber
and red are reserved for them and used for nothing else. That rule was already
in the old token file and it is a good one — it is kept.

That puts the brand colour outside those hues. It is a deep indigo-violet drawn
from Paithani silk, the textile woven at Paithan in Maharashtra, whose peacock
motifs sit in indigo and violet against gold. Specific to the place, outside the
reserved hues, and distinct from the interchangeable corporate navy it replaces.

    ink        #14121F   near-black, violet cast
    ink-muted  #5B5670
    ink-faint  #8E89A3
    brand      #4C3AA8   indigo-violet
    brand-deep #2E2270
    brand-tint #F0EDFB
    wash       #F7F6FB   violet-tinted off-white
    line       #E5E2EF
    good       #0A6B4A   |  possible #8A5200  |  reach #A3231B

Neutrals carry a warm violet cast so the palette resolves as one family rather
than colour-on-grey.

### Type

One family and one mono, not three.

**Archivo** for everything textual. A grotesque with enough grit to hold a
headline at weight 700 and enough discipline to set a paragraph at 400, and it
stays legible at 13px on a cheap phone — which matters more here than novelty.
Display sizes get tightened tracking rather than a second typeface.

**IBM Plex Mono** for figures only, kept from the old build. Tabular numerals
are the reason: a column of closing percentiles is only comparable by eye if the
digits line up. Mono is not used for labels or decoration.

### Layout

Home keeps the predictor first — the old code was right that nothing should
stand between arriving and using it — but frames it with a strip of dataset
evidence above and browsable sections below, so there is a reason to keep
scrolling once the answer arrives.

    ┌──────────────────────────┐
    │ 386 colleges · 3 rounds  │  evidence, not marketing
    ├──────────────────────────┤
    │  ①──②──③   the flow      │  unchanged in substance
    ├──────────────────────────┤
    │ Browse by district       │
    │ Largest colleges         │  reasons to stay
    │ How seat types work      │
    └──────────────────────────┘

Content is left-aligned throughout. Centred text is used nowhere: every screen
is a list of facts and lists read from the left edge.

### The one bold element

**The percentile bar on each cutoff row.** A closing percentile of 98.9878776
is four decimal places of noise to a nervous 17-year-old. A short horizontal
scale showing where that cutoff sits, and where *you* sit against it, turns a
number into a distance. This is the memorable element, and it is functional.

Everything else stays quiet: no gradient washes, no shadow under every card, no
entrance animation on each section. Elevation is used only where something
genuinely floats (the tab bar, the sticky section nav).

### Deliberately avoided

Tracked-out all-caps eyebrow labels; meta strings joined with middle dots
(the old college row used `code · city · type` — restructured); arrows appended
to button text; one border-radius on every element regardless of hierarchy;
per-card hover transitions; numbered markers on content that is not a sequence.
CAP Round I / II / III *is* a sequence, so it is the one place numbering earns
its place.

## Data architecture

Generated base + hand-written overlay.

`scripts/build_college_pages.py` reads the four CSVs and writes a JSON file per
institute plus a light search index. The page template reads those at build
time, so all 386 colleges get a real page from official data.

`src/data/college-notes.ts` holds the hand-written layer — about text, website,
fees, placements, hostel — keyed by institute code. The honesty rule from the
old data file is preserved exactly: an unchecked field stays `null` and renders
as "not added yet" rather than being filled with a guess.

City and district come from `institutes_with_location.csv`, where every row is
`location_verified = false` because the hints were derived from institute names
by a script. The UI never presents them as confirmed.
