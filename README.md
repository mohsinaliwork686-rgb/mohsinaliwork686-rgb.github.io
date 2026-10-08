# The Portfolio Console

Personal site for Mohsin Ali, software engineer. A photographed mechanical-switch case with
real, clickable keycaps placed over its switch wells and a terminal screen that types.

**Live:** https://mohsinaliwork686-rgb.github.io

---

## Run it

No build step and no framework — open it with any static file server:

```bash
python3 -m http.server 4173
# then visit http://localhost:4173
```

## Check it

The design brief's verification list runs as browser tests at 1440, 768 and 390px wide:

```bash
npm install
npx playwright test
```

They check that the page never scrolls sideways, every key stays at its photo coordinates
at every width, every screen title fits inside the screen, all sections open from mouse
and keyboard, Escape closes and hands focus back, switching keys mid-typing never mixes two
titles, and reduced-motion settings stop all movement.

## How the keys line up

Every overlay is positioned in the photo's own 1536 × 1024 pixel coordinates, carried on
each key in the markup:

```html
<button class="key" style="--cx:379; --cy:590; --w:156; --h:130; ...">
```

and converted to percentages in CSS with the placement formula from the design brief:

```css
left: calc((var(--cx) - var(--w) / 2) / 1536 * 100%);
```

Because the photo and every key share one coordinate system and scale together, nothing
can drift apart at any screen size. Sizes inside the device use container units (`cqw`),
so the screen text, the keys and their motion all scale with the photo.

The lower row's centres were re-measured against the photo; the brief's original values
sat a few pixels high and showed each switch's contact below its cap. Both sets are
recorded in a comment in `index.html`.

## Structure

```
index.html                 the page, the device, and the four sections
styles.css                 layout, keycaps, motion
script.js                  screen typing, the idle wave, the section dialogs
assets/device-reference.*  the case photograph (PNG original, WebP for speed)
tests/                     the verification suite
```

## Still to confirm

- **LinkedIn link** — taken from the CV as `linkedin.com/in/Mohsinali`. Check it opens the
  right profile.
- **Client names** — the healthcare work is described without naming the clients. Add them
  only once you are sure you are allowed to name them publicly.
