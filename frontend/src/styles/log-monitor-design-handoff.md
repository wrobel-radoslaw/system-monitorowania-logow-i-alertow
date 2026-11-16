# Log Monitor — design handoff

The design lives in the team's claude.ai design canvas ("Log Monitor – AI Analysis": desktop, tablet
and mobile boards). In the repo, this doc plus the components in `src/shared/ui` are the reference;
the old `.dc.html` prototype export was removed once every element had a React component (section 8).

Placeholder content in the design is sample data: wire real data where the app already has it,
otherwise keep the `fake-data.ts` mocks or empty states.

## 1. Color tokens (CSS variables)

Put these on the app root. Dark is the default; light applies when the root has class `light`
(or `[data-theme="light"]` — pick whichever fits the codebase).

| token           | dark                  | light                 | used for                                  |
| --------------- | --------------------- | --------------------- | ----------------------------------------- |
| `--bg`          | `#000000`             | `#ffffff`             | page background                           |
| `--surface`     | `#0b0b0b`             | `#fafafa`             | cards, tables                             |
| `--surface2`    | `#141414`             | `#f2f2f2`             | progress tracks, assistant bubbles        |
| `--border`      | `#222222`             | `#e4e4e7`             | dividers, card borders                    |
| `--text`        | `#ffffff`             | `#0a0a0a`             | primary text                              |
| `--muted`       | `#a3a3a3`             | `#52525b`             | secondary text, inactive nav/tabs         |
| `--hover`       | `#121212`             | `#f4f4f5`             | hover background                          |
| `--accent`      | `#22c55e`             | `#15803d`             | active underline, primary buttons, charts |
| `--accent-soft` | `rgba(34,197,94,.12)` | `rgba(21,128,61,.10)` | active pill bg, user chat bubble          |
| `--on-accent`   | `#000000`             | `#ffffff`             | text on primary button                    |
| `--success`     | `#4ade80`             | `#15803d`             | OK / Resolved / Stable                    |
| `--danger`      | `#f87171`             | `#b91c1c`             | errors, critical                          |
| `--warn`        | `#fbbf24`             | `#a16207`             | warnings                                  |
| `--info`        | `#60a5fa`             | `#1d4ed8`             | info level                                |

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
.nav-item {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--muted);
  font-size: 17px;
  background: none;
  border: 0;
  text-align: left;
  transition:
    background 0.15s,
    color 0.15s;
}
.nav-item:hover {
  background: var(--hover);
  color: var(--text);
}
.nav-item .lbl {
  display: inline-block;
  padding-bottom: 6px;
  border-bottom: 2px solid transparent;
  transition: border-color 0.2s;
}
.nav-item.active {
  color: var(--text);
}
.nav-item.active .lbl {
  border-bottom-color: var(--accent);
}

/* Tabs (tab bar has border-bottom:1px solid var(--border)) */
.tab {
  padding: 8px 12px 0;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  color: var(--muted);
  font-size: 17px;
  background: none;
  border: 0;
  transition:
    background 0.15s,
    color 0.15s;
}
.tab .lbl {
  display: inline-block;
  padding-bottom: 12px;
  border-bottom: 2px solid transparent;
  transition: border-color 0.2s;
}
.tab:hover {
  color: var(--text);
  background: var(--hover);
}
.tab.active {
  color: var(--text);
}
.tab.active .lbl {
  border-bottom-color: var(--accent);
}
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
  - _Summaries_: "Regenerate" button; cards per period (Last hour / 24h / 7d) with a health badge,
    a paragraph and 3 bullet points.
  - _Anomalies_: table Signal+description · Service · Score (bar + number) · Detected ·
    "Investigate" (opens Root Cause for that incident).
  - _Root Cause_: incident pills; left card = vertical timeline (dot + line, mono time · service,
    text); right = "Probable cause" card (accent border, confidence badge) and "Suggested fix"
    numbered list with "Ask Assistant" / "Create ticket".
  - _Assistant_: chat (user bubble right, `--accent-soft` bg + accent border; bot bubble left,
    `--surface2`), suggestion chips (dashed border), input + Send, Enter sends.

Badges: `font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;border:1px solid currentColor`.

## 7. Responsive (tablet 834 / mobile 390 boards)

Implemented in `app/layout/AppLayout.tsx`; `shared/lib/useDevice.ts` picks the layout
(mobile < 768px, tablet < 1024px, matching Tailwind `md` / `lg`).

- **Desktop (≥1024)**: sidebar layout from section 5.
- **Tablet + mobile**: the shell is a full-height column (`100dvh`); only the content scrolls.
  - **Top bar**: menu button (40×40 icon button, `aria-expanded`), "Log Monitor" 18px bold,
    "Live" dot, theme toggle. `border-bottom: 1px solid var(--border)`.
  - **Drawer**: slides in from the left, 300px (max 85%), `transform .28s cubic-bezier(.2,.8,.2,1)`,
    scrim `rgba(0,0,0,.55)`. Sections "Monitoring" (main nav) and "Workspace" (Data sources, Alert
    rules, Settings, Help: disabled until those pages exist), footer card "Production · Ingest live"
    with the theme toggle. Closes on link click, scrim click, close button and Esc.
- **Tablet only**: horizontal main nav under the top bar, same underline tabs as the AI tabs.
- **Mobile only**: bottom nav, 5 items (20px icon + 12px label, ≥56px tall, short label "AI"),
  active label underlined. Content padding 20/16/24; page title 24px; cards padding 16px;
  KPIs 2 columns; two-column grids collapse to one; AI tabs don't wrap, they scroll;
  chat bubbles max 88%.
  Logs and Anomalies render **cards instead of tables** (level + time, service, mono message /
  signal + time, service · description, score bar, Investigate).

## 8. Components (design element → React)

Build screens from these; don't copy raw class strings between pages.

| Design element                                      | Component                                                               |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| card, hover card, accent card, confirmation banner  | `shared/ui/Card` (`hoverable`, `flush`, `variant="accent" \| "notice"`) |
| card section heading (17px bold)                    | `shared/ui/CardTitle`                                                   |
| button / primary button / link styled as button     | `shared/ui/Button` (`variant="primary"`), `LinkButton`                  |
| 40×40 icon button (theme, menu, close)              | `shared/ui/IconButton`                                                  |
| filter / range pill, labelled pill row              | `shared/ui/Pill`, `shared/ui/PillGroup`                                 |
| severity / health badge                             | `shared/ui/Badge`, `features/logs/components/SeverityBadge`             |
| score / share bar                                   | `shared/ui/ProgressBar`                                                 |
| search field                                        | `shared/ui/Input`                                                       |
| table with scroll box, header row, hover rows       | `shared/ui/Table`, `TableRow`, `tableCell`                              |
| underlined active label (sidebar, tabs, bottom nav) | `shared/ui/UnderlineLabel`                                              |
| route tabs (AI Analysis)                            | `shared/ui/Tabs`                                                        |
| page title + subtitle + actions                     | `shared/ui/PageHeader`                                                  |
| status dot + text ("Ingest live")                   | `shared/ui/StatusDot`                                                   |
| loading / error / empty                             | `shared/ui/Loading`, `ErrorState`, `EmptyState`                         |
| sidebar, top bar, drawer, tablet nav, bottom nav    | `app/layout/Sidebar`, `TopBar`, `Drawer`, `MainNav` (`variant`)         |

Kept inside their one feature (single use): KPI tile and errors chart (Dashboard), timeline
(Root Cause), chat bubbles and suggestion chips (Assistant).
