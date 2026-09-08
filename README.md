# PRIME-CAE — website

The public site for **PRIME-CAE**, an AI-native computer-aided engineering
platform for aerospace structures.

---

## Run it

**Double-click `START_PRIME_WEBSITE.command`.**

A local server starts in this folder and your browser opens the site. Nothing is
installed, nothing leaves the machine, and no developer setup is needed. Close
the terminal window (or press Ctrl-C) to stop it.

The first time macOS may ask you to confirm the file is safe to open.

If you prefer a terminal:

```bash
python3 -m http.server 8080
```

then open `http://localhost:8080`.

### Opening `index.html` directly

Double-clicking `index.html` works. The site is authored as ES modules, which
browsers refuse to load from a `file://` page, so `build.py` flattens the module
graph into one classic script (`js/prime.bundle.js`) that runs from disk and from
a server alike. That is the only script the page loads.

A local server is still the better way to run it — some browsers restrict other
things on `file://` pages, and only a server gives you HTTP range requests for
the hero video — but nothing is broken without one.

If the page ever genuinely fails to load (stylesheets blocked, script blocked), a
self-contained launch screen appears with instructions. Its CSS is inline and its
logo is an embedded data URI, so it holds even when every external file is
blocked. A working page never shows it — the check is a real capability probe,
not a guess based on the URL scheme.

### Rebuilding after a source change

```bash
python3 build.py
```

Edit the modules under `js/`, then rebuild. The bundler resolves the import
graph, refuses on cycles, missing targets or bare specifiers, and fails loudly on
duplicate top-level names rather than letting one silently clobber another.

It also refuses when a `'` or `"` string is left open at the end of a line —
always a syntax error, and usually a pasted value that lost its closing quote.
The bundle is one script, so a single bad token stops every module and the page
falls back to the launch gate. On that failure the bundle is **not** rewritten,
so the previous working one stays in place.

---

## Architecture

Semantic HTML, design-token CSS and ES modules, flattened to one classic script
by a 60-line bundler so the page works from disk. No toolchain, no dependencies.

```
index.html                  one document · inline critical CSS · file:// gate
START_PRIME_WEBSITE.command macOS launcher (finds Python, picks a free port,
                            serves with Range support, opens the browser)

css/
  tokens.css                colour, type, space, radius, shadow, motion
  base.css                  reset, type scale, progressive-enhancement reveal
  layout.css                12-column field, section chrome, spacing
  components.css            buttons, panels, controls, readouts, modal
  hero.css                  welcome sequence + compressor environment
  sections.css              per-section art direction
  mobile.css                the phone — loaded last, and only phone queries
                            live in it, so the desktop sheets are never edited
                            to serve a handset

build.py                    flattens the ES modules into js/prime.bundle.js

js/
  prime.bundle.js           generated — the only script index.html loads
  app.js                    entry; every section behind safeInit()
  core/
    dom.js                  DOM + math helpers, seeded RNG, one shared rAF ticker
    canvas.js               DPR-capped canvas sizing, on-screen-only draw loops
    color.js                the field ramp used by every figure
    bracket.js              the reference structure — one compact three-interface
                            structural bracket: geometry, extrusion, response
                            field, element mesh, sample population
    content.js              the six systems and the one line each of them gets
    motion.js               reveal, magnetic buttons, range painting
  hero/
    media.js                hero sequence registry — add an entry, it joins
    sequence.js             the hero state machine
    welcome.js              coordinate-field ground for the welcome
    film.js                 crossfading video loop + autoplay fallbacks
  sections/                 nav, about, layer, products, access

media/                      compressor films, poster
assets/                     brand lockups, sub-brand wordmarks, favicons
my_files/                   the first supplied compressor source, kept untouched
                            (the page does not request it)
```

### Why not React

The brief asked for React + Tailwind + Framer Motion + R3F. Node is not
installed on this machine, so that stack could not have been built or verified —
it would have shipped as an unbuildable folder. The site is written as modular
ES modules with the same separation of concerns; each `init*()` maps almost
one-to-one onto a component if the stack is added later.

### Why no WebGL

Three.js was vendored in an earlier pass and has been removed. The hero is a
real LES solution, and every figure is a genuine 2D engineering construction:
one structural bracket, drawn as a layered extrusion with real bore walls, and
carrying a response field, an element mesh, a sample population and a structural
optimisation — all from one parametric definition. None of it needed a GPU
scene, and none of it pays for one.

---

## The hero

```
PHASE A  welcome  ─▶  PHASE B  compressor  ─▶  PHASE C  the site
             └──────── skip / fallback ────────┘
```

**Phase A (~6 s, once per load).** A graphite field wakes up: a coordinate grid
resolves, frame linework traces the viewport, the PRIME-CAE lockup is revealed by
a wipe, the descriptor settles under it, and the statement takes its place.
Corner instrumentation and a progress rule run throughout.

**Phase B (loops forever).** The compressor LES becomes the environment. Two
video elements share one source and hand over to each other 1.15 s before the
end of a pass, so the loop crossfades instead of cutting to black.

The sequence is an explicit state machine (`js/hero/sequence.js`) with one timer
table and one exit path. Every route out — natural end, **Skip intro**, Escape,
a wheel or touch gesture, `prefers-reduced-motion`, blocked autoplay, a missing
asset, a 12 s watchdog — lands in the same terminal state, releases the scroll
lock exactly once, and removes the overlay from the tree so it can never
intercept a pointer.

Adding media is a data change, not a code change: append to `HERO_SEQUENCE` in
`js/hero/media.js`.

---

## Supplied assets

| Asset | Treatment |
|---|---|
| PRIME-CAE lockup | keyed off its white ground and re-valued for dark backgrounds (navy → white, brand blue kept). Used in the nav, the footer, the favicon and — as an embedded data URI — the `file://` gate. |
| Compressor recording (`~/Downloads/REC-20260908143853.mov`, HEVC 1732×840, 59 s, supplied second) | **enhanced**: Lanczos scale to 1920×932, unsharp mask `5:5:0.85:5:5:0.15`, H.264 High CRF 21 with `+faststart`. Measured acutance (variance of the Laplacian) rose from 89.6 to 174.8 — roughly +95% — with no visible haloing and no highlight clipping. A 1280-wide variant is served to narrow viewports and to `saveData` clients. |
| Sub-brand wordmarks | trimmed, used in the platform brand line. |

The colour grade lives in CSS, not in the file, so the footage stays neutral and
the site's look is adjustable in one place.

---

## What is actually interactive

Every control is real DOM. No screenshots of interfaces anywhere on the page.

The site is five moments — hero, about, what PRIME-CAE is, the product family,
contact — and one engineering object runs through all of them.

- **About** — the landing out of the hero. The cinematic environment is held
  one section longer, over a drifting coordinate field: seventeen streamlines
  under a disturbance that dies away at both edges, read against twelve station
  lines, at 5–12% alpha. Reduced motion stops it.
- **What PRIME-CAE is** — six systems on a dashed elliptical route around one
  structural bracket. A light travels the route in one direction; whichever
  system it has reached is the one acting on the model, and the model changes
  to show it: clean machined geometry, a high-fidelity response field over an
  element mesh, engineering samples across the part, a smoother learned field,
  a structural optimisation that actually moves material, and a split
  comparison of the two responses. Clicking any system takes the light there
  and holds it. The camera, the centre, the scale and the three interfaces
  never change — that is the point of the section.
- **The product family** — four canvases, one idea each: a design space of
  variants of the same bracket, a lug and clevis carrying load in double shear,
  damage accumulating against a limit, and a question answered against the
  structure it is about.
- **Contact** — an address, stated plainly. See below.

## Contact

The section is an address and nothing else: an eyebrow, a heading, one line,
and `info@prime-cae.com` as a `mailto:` link. There is no form, no endpoint, no
submission and no state.

The only behaviour left is the affordance that reaches it: every
`[data-open-access]` control (the header's **Contact PRIME-CAE** button) scrolls
the section under the header with its content at the top of the frame.

## Conventions

- The phone is a design, not a narrower desktop: the radial diagram becomes a
  snapping rail under one large model, the four product tiles become full cards,
  and the header sheds everything but the mark and the menu. It lives in
  `css/mobile.css`; nothing in it applies to a pointer device.
- Vertical space is measured in the viewport's height, not only its width. The
  section rhythm, the seams, the display type and every figure's height carry a
  `vh` term, so a wide-but-short laptop is not handed the spacing a tall screen
  would get. Each content section is sized to fit one screen.
- Content is hidden for reveal **only after JS proves it can reveal it again**
  (`html.js`), so the page is legible with scripting off.
- One `safeInit` guard per section: a failure is logged and skipped, never fatal.
- Canvas figures use seeded RNG, so a figure is identical on every visit.
- Figures paint one frame on entry and only animate while on screen and visible.
- Device pixel ratio is capped at 2; one shared rAF ticker drives every loop.
- Numbers presented as platform behaviour are labelled conceptual, not validated
  programme performance. Module status (Live / Beta / In development) is stated
  plainly.

## Browser support

Evergreen Chrome, Safari, Firefox and Edge. Requires ES modules,
`IntersectionObserver` and `ResizeObserver`. Without JavaScript the page stays
styled, readable and navigable, and the hero holds its poster frame.
