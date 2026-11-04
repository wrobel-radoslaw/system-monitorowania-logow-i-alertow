# Log Monitor — design handoff

Reference prototype: `log-monitor-prototype.dc.html` (built in a design canvas; treat it as a
visual/behaviour reference, not as code to copy — it uses a custom runtime, `<x-dc>`, `<sc-for>`, etc.).

Goal: update the existing app's UI to match the prototype. Keep the current stack, routing and data
layer; change styling, navigation behaviour and add the theme toggle. Placeholder content in the
prototype is sample data — wire real data where the app already has it, otherwise keep empty states.

## 1. Color tokens (CSS variables)

Put these on the app root. Dark is the default; light applies when the root has class `light`
(or `[data-theme="light"]` — pick whichever fits the codebase).

| token | dark | light | used for |
|---|---|---|---|
| `--bg` | `#000000` | `#ffffff` | page background |
| `--surface` | `#0b0b0b` | `#fafafa` | cards, tables |
| `--surface2` | `#141414` | `#f2f2f2` | progress tracks, assistant bubbles |
| `--border` | `#222222` | `#e4e4e7` | dividers, card borders |
| `--text` | `#ffffff` | `#0a0a0a` | primary text |
| `--muted` | `#a3a3a3` | `#52525b` | secondary text, inactive nav/tabs |
| `--hover` | `#121212` | `#f4f4f5` | hover background |
| `--accent` | `#22c55e` | `#15803d` | active underline, primary buttons, charts |
| `--accent-soft` | `rgba(34,197,94,.12)` | `rgba(21,128,61,.10)` | active pill bg, user chat bubble |
| `--on-accent` | `#000000` | `#ffffff` | text on primary button |
| `--success` | `#4ade80` | `#15803d` | OK / Resolved / Stable |
| `--danger` | `#f87171` | `#b91c1c` | errors, critical |
| `--warn` | `#fbbf24` | `#a16207` | warnings |
| `--info` | `#60a5fa` | `#1d4ed8` | info level |

All text pairs meet WCAG AA (4.5:1) in both themes.

Font: `'Segoe UI', system-ui, -apple-system, sans-serif`; mono for log lines:
`ui-monospace, SFMono-Regular, Consolas, monospace` at 13px.

## 2. Navigation — active indicator is a horizontal underline under the label

**Remove** the vertical green bar on the left of the active sidebar item.
**Both** the sidebar items and the top tabs (Summaries / Anomalies / Root Cause / Assistant) use the
same pattern: the label sits in an inline-block span with a 2px bottom border; only the active item's
border is accent-colored, so the line is exactly as wide as the text.

```css
/* Sidebar */
.nav-item{display:block;width:100%;padding:10px 14px;border-radius:8px;cursor:pointer;
  color:var(--muted);font-size:17px;background:none;border:0;text-align:left;
  transition:background .15s,color .15s}
.nav-item:hover{background:var(--hover);color:var(--text)}
.nav-item .lbl{display:inline-block;padding-bottom:6px;border-bottom:2px solid transparent;
  transition:border-color .2s}
.nav-item.active{color:var(--text)}
.nav-item.active .lbl{border-bottom-color:var(--accent)}

/* Tabs (tab bar has border-bottom:1px solid var(--border)) */
.tab{padding:8px 12px 0;border-radius:8px 8px 0 0;cursor:pointer;color:var(--muted);
  font-size:17px;background:none;border:0;transition:background .15s,color .15s}
.tab .lbl{display:inline-block;padding-bottom:12px;border-bottom:2px solid transparent;
  transition:border-color .2s}
.tab:hover{color:var(--text);background:var(--hover)}
.tab.active{color:var(--text)}
.tab.active .lbl{border-bottom-color:var(--accent)}
```

Markup: `<button class="nav-item active"><span class="lbl">AI Analysis</span></button>`.
Use real `<button>`s (or router links), `role="tablist"`/`role="tab"` + `aria-selected` on tabs,
and a visible focus ring: `:focus-visible{outline:2px solid var(--accent);outline-offset:2px}`.

## 3. Subtle hover everywhere

- nav items, tabs, buttons, pills, chips: background → `var(--hover)`, text → `var(--text)`, 150ms.
- cards (`.card.hov`): border → `var(--muted)` on hover.
- table rows: background → `var(--hover)`, 120ms.
- primary button: `filter:brightness(1.08)` on hover.

## 4. Theme toggle

- 40×40 icon button with 1px `var(--border)` border, radius 8px, right of the "Log Monitor" title
  in the sidebar header.
- Dark theme shows a **sun** icon (switch to light); light theme shows a **moon** icon.
  Inline stroke SVG, 18px, `stroke="currentColor"`, `stroke-width="2"`.
- `aria-label` = "Switch to light theme" / "Switch to dark theme".
- Persist the choice (localStorage), default dark; transition `background .2s, color .2s` on root.

## 5. Layout

- Row: sidebar `flex:1 1 240px` with `border-right:1px solid var(--border)`, content
  `flex:999 1 560px; min-width:0`, `flex-wrap:wrap` so the sidebar stacks on phones.
- Content padding `32px 40px 48px`, max-width 1200px.
- Cards: `background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px`.
- Page title 30px bold, subtitle muted, 6px gap.
- Sidebar footer: small green dot + "Ingest live · N sources".

## 6. Screens (content to implement / replace the "No data yet" state)

- **Dashboard** — time-range pills (1h / 24h / 7d); 4 KPI cards (log entries, error rate, open
  alerts, services reporting); "Errors per hour" bar chart (24 bars, accent color); "Top services by
  errors" with progress bars; "Recent alerts" list with "View all" → Alerts.
- **Logs** — search input; level filter pills (All / Errors / Warnings / Info); table
  Time · Level badge · Service · Message (mono, ellipsis), horizontally scrollable on small screens;
  footer "Showing X of Y entries · auto-refresh".
- **Alerts** — "New alert rule" primary button; cards with severity badge
  (Critical=danger, Warning=warn, Info=info), title, service · rule · time, status
  (Open / Acknowledged / Resolved) and an "Acknowledge" button on open alerts.
- **Reports** — "Generate report" primary button (shows a confirmation banner); grid of report cards
  (schedule, name, description, last run, "Download PDF").
- **AI Analysis**
  - *Summaries*: "Regenerate" button; cards per period (Last hour / 24h / 7d) with a health badge,
    a paragraph and 3 bullet points.
  - *Anomalies*: table Signal+description · Service · Score (bar + number) · Detected ·
    "Investigate" (opens Root Cause for that incident).
  - *Root Cause*: incident pills; left card = vertical timeline (dot + line, mono time · service,
    text); right = "Probable cause" card (accent border, confidence badge) and "Suggested fix"
    numbered list with "Ask Assistant" / "Create ticket".
  - *Assistant*: chat (user bubble right, `--accent-soft` bg + accent border; bot bubble left,
    `--surface2`), suggestion chips (dashed border), input + Send, Enter sends.

Badges: `font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;border:1px solid currentColor`.
