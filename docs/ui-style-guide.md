# Golden Years UI Style Guide

Based on the admin home page (管理概览). Apply this guide to align other pages to the same visual language.

---

## Design Philosophy

Warm, organic, non-SaaS. Inspired by Claude Code's UI aesthetic. Surfaces float on a cream background using soft shadows instead of hard borders. Typography is relaxed — no uppercase labels, no letter-spacing. Interactions feel gentle: hover states use warm glows rather than color flips.

---

## Color Tokens

### Core Palette

| Token | Value | Usage |
|-------|-------|-------|
| `page-bg` | `#F5F0EA` | Page background (warm cream) |
| `surface` | `#FFFCF8` | Cards, panels, modals (slightly warm white) |
| `surface-subtle` | `#FAF6F1` | Table header rows, secondary surfaces |
| `line` | `#E8E0D8` | Dropdown borders, input borders (when visible) |
| `line-subtle` | `#EDE7E0` | Dividers inside panels |

### Text

| Token | Value | Usage |
|-------|-------|-------|
| `text` | `#2D2520` | All substantive content: values, table cells, titles, card labels, document body |
| `text-muted` | `#A89E96` | Metadata, timestamps, subtitles, empty states |
| `muted-text` | `#8C8279` | Inactive toggle text |

**Rule: Any text the user needs to read (data, names, labels, document content) must use `text` (#2D2520). Only purely decorative or contextual meta-info uses `text-muted`.**

### Brand

| Token | Value | Usage |
|-------|-------|-------|
| `accent` | `#EB6420` | Primary brand orange. Buttons, active states, links, selected items |
| `accent-soft` | `rgba(235, 100, 32, 0.08)` | Selected folder background, soft highlight |

### AI

| Token | Value | Usage |
|-------|-------|-------|
| `ai-accent` | `#6366F1` | AI-related elements (purple) |
| `ai-accent-soft` | `rgba(99, 102, 241, 0.08)` | AI tag backgrounds |

### Semantic

| Token | Value | Usage |
|-------|-------|-------|
| `success-bg` | `#EDF5EC` | Score badge background (good) |
| `success-text` | `#3D7A40` | Score text (good) |
| `warning-bg` | `#FDF5E8` | Score badge background (caution) |
| `warning-text` | `#C4893A` | Score text (caution) |
| `danger-bg` | `#FDEDED` | Score badge background (bad) |
| `danger-text` | `#B54E34` | Score text (bad) |
| `muted-bg` | `#EDE7E0` | Toggle track background, disabled backgrounds |

---

## Typography

```css
font-family: "Sohne", -apple-system, BlinkMacSystemFont, "SF Pro Text",
  "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
-webkit-font-smoothing: antialiased;
letter-spacing: -0.01em;
```

### Scale

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page title | 22px | 700 | `text` |
| Section title | 16px | 700 | `text` |
| Page subtitle | 13px | 400 | `text-muted` |
| Card label (KPI title) | 12.5px | 500 | `text` |
| Card value (KPI number) | 24px | 700 | `text` |
| Table header | 12.5px | 600 | `text` |
| Table cell | 13px | 400 | `text` |
| Button | 12px | 500 | Depends on variant |
| Badge | 12px | 500 | Semantic color |
| Meta/timestamp | 11-12px | 400 | `text-muted` |

### Rules

- **No `text-transform: uppercase`** anywhere.
- **No `letter-spacing`** on labels (global `-0.01em` only).
- Page title uses `letter-spacing: -0.02em` for tighter display feel.

---

## Borders & Shadows

### Core Principle

**Replace visible borders with shadows.** Elements float on the background rather than being boxed in.

### Shadow Recipes

| Element | Shadow |
|---------|--------|
| Card (resting) | `0 1px 4px rgba(45,37,32,0.06), 0 2px 8px rgba(45,37,32,0.03)` |
| Card (hover) | `0 4px 16px rgba(235,100,32,0.12), 0 2px 6px rgba(45,37,32,0.06)` |
| AI card (hover) | `0 4px 16px rgba(99,102,241,0.12), 0 2px 6px rgba(45,37,32,0.06)` |
| Rail (side) | `2px 0 8px rgba(45,37,32,0.04)` |
| Header (bottom) | `0 2px 8px rgba(45,37,32,0.05)` |
| Dropdown menu | `0 8px 24px rgba(45,37,32,0.08)` |
| Modal | `0 12px 40px rgba(45,37,32,0.12)` |

### When Borders Are Still Used

- **Input fields**: `1px solid {line}` (visible affordance for interaction)
- **Dropdown trigger button**: `1px solid {line}`, hover changes to `accent`
- **Table row dividers**: `1px solid rgba(45,37,32,0.04)` (nearly invisible)
- **Cards and containers**: `1px solid transparent` (reserve space, no visual)

---

## Border Radius

| Element | Radius |
|---------|--------|
| Cards (KPI, SOP, AI) | `16px` |
| Table container | `16px` |
| Modal (large) | `18-20px` |
| Dropdown menu | `14px` |
| Buttons | `10-12px` |
| Input fields | `10-12px` |
| Toggle track | `12-14px` |
| Badges / tags | `8-10px` |
| Avatar / logo | `12px` |
| Chat bubbles | `16px` (with `4px` on anchor corner) |
| Folder items | `8-10px` |

**General rule: containers 16px, interactive elements 10-12px, small chips 8px.**

---

## Hover & Interaction

### Cards

```css
transition: box-shadow 0.25s ease, transform 0.2s ease, background 0.2s ease;

/* hover */
box-shadow: 0 4px 16px rgba(235, 100, 32, 0.12), 0 2px 6px rgba(45, 37, 32, 0.06);
transform: translateY(-1px);
background: #FFFDF9;  /* slightly brighter */
```

### Buttons

```css
transition: opacity 0.2s ease, box-shadow 0.2s ease;
/* hover: opacity 0.88 */
```

### Folder / List Items

```css
transition: background 0.2s ease;
/* hover: background rgba(235, 100, 32, 0.04) */
```

### Table Rows

```css
/* hover: background rgba(235, 100, 32, 0.03) */
```

### All Transitions

Use `0.2s ease` as the default. Card shadows use `0.25s ease` for a slightly more deliberate feel. Never use bare `150ms` — always `ease` easing.

---

## Component Patterns

### KPI Card

```
+-------------------------------+
|  Label (12.5px, 500, text)    |
|  Value (24px, 700, text)      |
|  Trend (12px, semantic color) |
+-------------------------------+

- border: 1px solid transparent
- shadow: resting dual-layer
- hover: orange glow + lift
- padding: 18px 20px
- radius: 16px
```

### Table

```
+-------------------------------------------+
|  Header row (surface-subtle bg)           |
|  th: 12.5px, 600, text                   |
|  border-bottom: rgba(45,37,32,0.06)      |
+-------------------------------------------+
|  td: 13px, 400, text                     |
|  row border: rgba(45,37,32,0.04)         |
|  hover: rgba(235,100,32,0.03) bg         |
+-------------------------------------------+

- Container: surface bg, transparent border, shadow
- radius: 16px, overflow hidden
```

### Dropdown

```
Trigger: 36px height, radius 12px, 1px border line
Menu: radius 14px, shadow 0 8px 24px, padding 6px
Item: radius 10px, padding 9px 14px
Active item: accent color + rgba(235,100,32,0.06) bg
```

### Period Toggle

```
Track: muted-bg background, radius 12px, padding 3px
Button: radius 10px, padding 7px 18px, weight 500
Active: surface bg, accent color, shadow 0 1px 4px
```

### Modal

```
- radius: 18px (large modal: 20px)
- shadow: 0 12px 40px rgba(45,37,32,0.12)
- border: 1px solid rgba(45,37,32,0.06)
- background: surface
- overlay: rgba(0,0,0,0.3)
```

---

## Spacing

| Area | Value |
|------|-------|
| Page content padding | `28px 32px` |
| KPI grid gap | `14px` |
| Card internal padding | `18px 20px` |
| Table cell padding | `14px 18px` (th: `12px 18px`) |
| Section margin-top | `32px` |
| Section title margin-bottom | `16px` |

---

## Checklist for New Pages

1. Set CSS custom properties matching the token table above.
2. Set `font-family` with Sohne fallback chain and `letter-spacing: -0.01em`.
3. Replace all `border` on containers (cards, panels, sidebars) with shadow recipes. Use `border: 1px solid transparent` to keep layout stable.
4. Set all border-radius per the radius table.
5. Ensure all substantive text uses `text` color. Only meta/decorative uses `text-muted`.
6. Remove any `text-transform: uppercase` and `letter-spacing` on labels.
7. Add hover states: cards get orange glow + lift, list items get warm tint.
8. Use `0.2s ease` transitions on all interactive elements.
9. Accent color `#EB6420` for selected states, links, primary buttons.
10. AI elements keep purple `#6366F1` as secondary accent.
