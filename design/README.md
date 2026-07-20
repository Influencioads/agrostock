# AgroStock — Global Agriculture Trading Platform

A self-contained interactive design implementation, imported from a Claude Design
project (`AgroStock.dc.html`) and reconstructed into a clean, editable, runnable file.

## Run it

**Option A — just open the file**
Double-click `AgroStock.dc.html` (opens in any modern browser).

**Option B — local server** (recommended; some browsers restrict `fetch` on `file://`)
```bash
node serve.js
# → http://localhost:4178
```

> Needs an internet connection on first load: React 18 and the Google Fonts
> (Manrope / Inter / IBM Plex Sans) are pulled from a CDN.

## What's inside

A single React app (no build step) that packs **8 views**, switched from the left
icon dock, fully bilingual **English / Русский** (🌐 toggle, bottom-left):

| View | Description |
|------|-------------|
| **Hub** | Landing index — platform stats + 9 navigation cards |
| **Website** | Public marketplace: hero, Buy/Sell toggle, categories, offers-of-the-day (live countdowns), live auctions, international products, transport & loader services, market insights, community, Safe-Deal flow, global offices, footer |
| **Market** | Product listing with filter sidebar and verified / Safe-Deal / offer / auction badges |
| **Product** | Detail page — gallery, spec table, quality bars, reviews, seller trust, sticky purchase actions |
| **Offices** | World map with 8 positioned office pins + office cards |
| **Boards** | 6 role dashboards (Buyer · Seller · Transporter · Loader Co · Worker · Admin) — KPIs, charts, tables, widgets |
| **Mobile** | iOS app frame, 5-role switcher, bottom nav, quick actions, activity feed |
| **System** | Design system — color tokens, type scale, components |

### Design tokens
- **Greens:** `#0B3D2E` Deep Evergreen → `#146B3A` Primary → `#249653` Fresh Leaf → `#53B86A` Bright Accent → `#DFF3E4` Soft Mint
- **Gold:** `#C99B3B` · **Status:** success `#249653`, warning `#D99A20`, error `#C94343`, info `#2E7FA8`
- **Surfaces:** bg `#F6FBF7`, text `#14251A`, secondary `#647268`, border `#D7E6DA`
- **Type:** Manrope (display/headings), Inter (body), IBM Plex Sans (numerals)

## Files

| File | Role |
|------|------|
| `AgroStock.dc.html` | The design. `<x-dc>…</x-dc>` holds the markup template; the `<script data-dc-script>` at the bottom holds the `Component extends DCLogic` logic (data + render values). |
| `dc-runtime.js` | The Claude Design runtime — parses the template language (`{{ … }}`, `<sc-for>`, `<sc-if>`), loads React UMD, and mounts the app into `#dc-root`. |
| `serve.js` | Tiny static dev server. |

## Editing

- **Content / data** (products, offices, dashboards, copy, EN/RU strings): edit the
  `class Component extends DCLogic` script at the bottom of `AgroStock.dc.html`.
- **Layout / markup**: edit the template inside `<x-dc>…</x-dc>`. The template uses
  `{{ expression }}` interpolation, `<sc-for list="{{ items }}" as="item">` loops and
  `<sc-if cond="{{ … }}">` conditionals, bound to the values returned by `renderVals()`.
- `dc-runtime.js` is generated framework code — treat it as a dependency, not source.
