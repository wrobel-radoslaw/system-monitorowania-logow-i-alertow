# ADR-0008: Tailwind v4 design tokens, theme and responsive layout

- **Status:** Accepted
- **Date:** 2026-11-16

## Context

The design (`src/styles/log-monitor-design-handoff.md`) uses a small, fixed palette in dark and
light themes and has to work on desktop, tablet and phone.

## Decision

- Tailwind CSS v4. Colors are defined with `@theme` in `src/styles/index.css`; the default palette
  is removed, so only the tokens exist (`bg`, `surface`, `text`, `muted`, `accent`, `danger`, ...).
- Theme via `data-theme` on `<html>`. Dark is the default; the choice is saved in `localStorage`
  and applied by an inline script in `index.html` before first paint.
- Shared UI components live in `shared/ui/` (Button, Card, Badge, Table, Tabs, ...).
- Layout by `useDevice` (`shared/lib/useDevice.ts`): ≥1024px sidebar, 768–1023px top bar +
  drawer, <768px top bar + bottom nav, with cards instead of tables. Pure style changes use
  Tailwind's `md:`/`lg:`.

## Consequences

- \+ Colors can't drift from the design; theme switching costs nothing.
- − Every new color must be added as a token first.
