# KINGS ONLY — DESIGN.md

The visual source of truth for the KINGS ONLY guild platform. Every UI decision follows this document. If something in the codebase contradicts it, the codebase is wrong.

---

## 1. Design philosophy

KINGS ONLY is a **Free Fire guild command center**. The interface is a tactical HUD for a squad that actually shows up — dense, precise, competitive, and quietly confident. It is a gaming community product first: playful copy, rank/rarity language, esports framing. It is a premium product second: dark disciplined surfaces, restrained motion, no noise.

Three words govern every screen:

- **COMPETITIVE** — ranks, K/D, XP, and wins are the heroes. Numbers lead, labels follow.
- **TACTICAL** — information is arranged like mission data: compact, hierarchical, legible at a glance, with HUD-style framing.
- **OURS** — the content is the guild itself. Players, missions, trophies, and shared history. No stock heroes, no borrowed aesthetics.

### 1.1 Brand personality

| Trait | Expression |
|---|---|
| Competitive | Rank tiers and stats are color-coded. Numbers are the biggest text on the page. |
| Playful | Copy speaks in drops, lobbies, intel, missions: "READY TO DROP?", "LOCK IN", "WHO'S RUNNING THE LOBBY?", "YOU GOT FLANKED". |
| Disciplined | One primary accent. Sparse gradients. A clear grid. |
| Confident | Large editorial headlines. No apologies, no decoration. |
| Social | Activity, names, avatars, achievements are the texture of every page. |
| Honest | Demo data is labeled DEMO DATA. Sync timestamps are real. |

### 1.2 Anti-generic-AI rules (non-negotiable)

1. No purple-blue AI gradients. Purple (`secondary`) and cyan (`electric`) are restrained status/rarity accents, never the identity.
2. No generic SaaS dashboard look: no identical card-grid-everywhere. Lists, rows, and tables are the default; cards hold one meaningful unit (a mission, a trophy, an event, a squad).
3. No cheesy neon: no glow blobs, no over-saturated gradients, no glassmorphism on content panels. Subtle `backdrop-blur` on sticky top bars only.
4. No pill-shaped buttons everywhere. Primary buttons are angular (clipped corners) or 8px radius. Pills only for status/rarity chips.
5. No emoji as the visual language. Icons come from Lucide. Reactions are typographic (`+1`, `FIRE`, `GG`, `BOOYAH`).
6. No stock "gamer" clip art: no skulls, flames, neon swords, particle bursts. Identity comes from typography, statistics, tier colors, angular shapes, and layout.
7. No decorative icons. Every icon earns its place by labeling a real action or stat.
8. No excessive border-radius. Max 12px on large panels; 8px default; angular clips reserved for primary CTAs, brand marks, and pedestals.
9. No drop-shadow elevation. Depth comes from layered dark surfaces and 1px borders.
10. No repetition without purpose. Asymmetric compositions are preferred; a 3-up grid is used only where the content is naturally a trio (podium, key stats).

---

## 2. Color

### 2.1 Base palette

| Token | Value | Usage |
|---|---|---|
| `bg` | `#07080C` | App canvas |
| `bg-2` | `#0B0D12` | Input wells, alt page bands |
| `panel` | `#10131A` | Card gradient bottom, deep panels |
| `surface` | `#12151D` | Cards, sidebars, sheet surfaces |
| `elevated` | `#171B24` | Hover fills, chips, skeletons |
| `elevated-2` | `#1D222D` | Raised chips, popovers |
| `accent` | `#FF6B35` | PRIMARY action, active nav, top performer, mission progress, CTAs |
| `accent-2` | `#FF8A5C` | Hover/derived accent |
| `secondary` | `#7C5CFF` | Secondary emphasis, EPIC rarity, practice events |
| `electric` | `#00D9FF` | Live/active states, RARE rarity, live brackets |
| `text` | `#F7F8FA` | Primary text |
| `muted` | `#8B93A3` | Secondary text, meta, labels |
| `faint` | `#5C6470` | Disabled/placeholder, never for real content |
| `border` | `rgba(255,255,255,0.08)` | Hairlines, dividers |
| `border-strong` | `rgba(255,255,255,0.16)` | Stronger dividers, focus-ish states |
| `success` | `#35E58C` | Wins, online, live data, completed, OPEN slots |
| `warning` | `#FFC857` | Pending, near-deadline, scheduled |
| `danger` | `#FF4D6D` | Errors, destructive, cancelled, restricted |
| `on-accent` | `#0B0B0D` | Dark text on accent fills (buttons, badges, brand) |

### 2.2 Rank tiers

| Tier | Token |
|---|---|
| BRONZE | `#CD7F32` |
| SILVER | `#C0C7D1` |
| GOLD | `#FFD166` |
| PLATINUM | `#7FD8F5` |
| DIAMOND | `#8B7BFF` |
| HEROIC | `#FF6B35` (accent) |
| GRANDMASTER | `#FF4D6D` (danger) |

### 2.3 Rarities

| Rarity | Token |
|---|---|
| COMMON | `#8B93A3` (muted) |
| RARE | `#00D9FF` (electric) |
| EPIC | `#8B7BFF` (secondary-adjacent) |
| LEGENDARY | `#FFD166` (gold) |

### 2.4 Rules

- The interface is mostly dark/neutral. Orange is the single primary accent: primary actions, active navigation, mission progress, the most important number.
- One primary accent per view. Secondary/electric appear only as semantic/rarity accents, never to compete with orange.
- Never put orange text on an orange background; use `on-accent` for dark text on accent fills.
- Success/warning/danger carry semantic meaning only — never decoration.
- Text contrast: `text` on `bg` ≥ 13:1; `muted` on `bg` ≥ 5:1; `faint` only for disabled/placeholder. Labels are never `faint`.

---

## 3. Typography

### 3.1 Families

| Family | Source | Used for |
|---|---|---|
| Space Grotesk | `@fontsource/space-grotesk` | Display headings, page titles, hero, brand, card titles |
| Inter | `@fontsource/inter` | Body, UI, forms, buttons |
| Geist Mono | `@fontsource/geist-mono` | All statistics, numbers, codes, timestamps, UIDs, rank labels |

### 3.2 Scale

| Token | Size / Weight / Leading | Usage |
|---|---|---|
| `display-xl` | 42–64 / 700 / 0.98, -0.03em | Landing hero headline |
| `display-lg` | 34 / 700 / 1.05 | Landing section titles |
| `display` | 28–34 / 700 / 1.05 | Page titles (PageHeader) |
| `title` | 22 / 700 / 1.2 | Section headers |
| `subtitle` | 17 / 700 / 1.3 | Card titles, nav |
| `body` | 15 / 400 / 1.55 | Default text |
| `body-small` | 13 / 400 / 1.5 | Meta, captions |
| `label` | 11–12 / 700 / 0.08em uppercase | Kickers, section eyebrows, table headers |
| `stat` | 28 / 700 / 1, Geist Mono | Hero statistics |
| `stat-sm` | 18 / 600 / 1, Geist Mono | Compact statistics |
| `stat-lg` | 44 / 700 / 1, Geist Mono | The single dominant number |

### 3.3 Number-first rule

```
4.21            ← stat (Geist Mono, 28px, text or accent)
K/D RATIO       ← label (Inter, 11px, uppercase, muted)
```

A number is never smaller than its label. This is the signature of the product.

---

## 4. Gaming visual language

Beyond tokens, the look is defined by a small set of **HUD utilities** in `globals.css`. Use them sparingly — one per view, not everywhere.

| Utility | What it does | Where it shines |
|---|---|---|
| `bg-grid` | Faint 32px grid overlay | Hero, command-center header, profile heroes, restricted zone |
| `corner-brackets` | 8px tactical corner brackets | Hero panels, trophies, event briefings, CTAs, empty-state icon |
| `hud-divider` | Hairline with centered accent diamond | Section separators, sheet headers, achievement strips |
| `clip-notch-sm` | 8px angular clipped corner | Primary buttons, brand mark, accent tiles |
| `clip-pedestal` | Trapezoid pedestal | Leaderboard top-3 podium |
| `scanline` | Subtle CRT scan overlay | Hero/briefing backdrops |

Principles:

- Angularity is an accent, not a surface. Bodies stay rectangular; corners are cut on primary CTAs, brand marks, and pedestals.
- Backgrounds stay flat; depth is layered dark tones, not shadows or glows.
- Motion is brief and ease-out; nothing loops except status pings (success/live dots) which are dimmed for `prefers-reduced-motion`.

---

## 5. Spacing & layout

### 5.1 Scale (Tailwind spacing)

- **4px base**: `2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`.
- Page gutters: `16px` mobile, `24px` ≥768px, `32px` ≥1280px.
- Section rhythm: `48px` mobile, `80px` desktop between landing sections.
- Dense stat lists: `12px` rhythm. Editorial sections: `24–40px`.

### 5.2 Grid

- Desktop content column: `max-w-[1200px]`, 12-col grid with `24px` gaps.
- Mobile: single column. Two-column stat grids allowed ≥480px.
- Tables never exceed viewport; on mobile they become stacked rows.
- Podium is a strict 3-col `items-end` row; the only sanctioned symmetric trio.

### 5.3 Radii & clips

| Surface | Shape |
|---|---|
| Primary buttons, brand mark | Angular (clip-notch-sm) |
| Inputs, chips, secondary/ghost/danger buttons | 8px |
| Cards, panels, sheets | 12px |
| Avatars | 8px (square, gaming identity — not circles) |
| Status dots, pings | 999px |

---

## 6. Components

### 6.1 Buttons

| Variant | Style |
|---|---|
| Primary | `bg-accent` → `accent-2` hover, `text-on-accent`, 700 weight, uppercase tracking, angular clip. Height 36/44/48px (sm/md/lg). Active: translateY(1px). |
| Secondary | 1px `border-strong`, `text`, hover `border-accent/60` + `text-accent`. |
| Ghost | Text-only, hover `surface` fill + `text-accent`. |
| Danger | `bg-danger/10`, 1px `danger/40` border, `danger` text, hover `danger/20`. |

- Touch targets ≥44px; primary mobile actions ≥48px.
- Focus: 2px accent outline, offset 2px.
- Icons 16–18px, gap 8px. `loading` swaps children for a spinner.

### 6.2 Forms

- Inputs: `bg-2` fill, 1px `border`, 8px radius, 44px height, 15px Inter, placeholder `faint`.
- Focus: `border-accent/50` + 2px `accent/25` ring.
- Labels: 12px `muted` uppercase, tracking 0.06em. Errors: 12px `danger` below the field.
- Selects styled to match (`appearance-none`).

### 6.3 Cards & panels

Cards hold **one meaningful unit**. Anatomy: gradient `surface → panel`, 1px `border`, 12px radius, padding 16/20px, no shadow. Hover: `border-strong`. Cards may carry `corner-brackets` when they are the hero unit of the view (event briefing, trophy, active mission).

Allowed: challenge/mission card, achievement/trophy card, event briefing card, team/squad card, CTA panel.
Not allowed: wrapping every stat in a card.

### 6.4 Stat blocks

- **Hero stat**: `stat-lg` number + uppercase label beneath (CountUp animated).
- **Stat row**: horizontal `stat-sm` numbers with `muted` labels, 1px `border` dividers.
- **Stat table**: label column (muted, uppercase) + Geist Mono number column, right-aligned.

### 6.5 Tables & rows

- Desktop: real tables — 12px uppercase muted header, 52px rows, 1px separators, `surface` hover. No zebra stripes.
- Mobile: stacked rows (label left, value right), never horizontal scroll.
- Player rows: `[avatar 40px] name + meta / badges | rank + stat`. Position shown `#N`, orange for top 3.

### 6.6 Badges

- **RankBadge**: tier-colored (see 2.2) chip, 11px bold uppercase mono, rotated diamond marker. HEROIC/GRANDMASTER get a 2px accent left edge.
- **RarityBadge**: rarity-colored (see 2.3) chip, same anatomy.
- **RoleBadge / GuildRoleBadge**: neutral text chip, `border`, 11px.
- **StatusDot**: 6px dot (`success` online / `faint` offline).
- **Status chips** (Live/Scheduled/Completed/Cancelled): semantic color tint + bold uppercase mono label. Live uses a ping animation.

### 6.7 Navigation

- **Desktop sidebar**: fixed left 232px, `panel` bg, 1px right border. Brand with angular clipped tile. Section eyebrows with rotated diamond markers. Active item: `accent/10` fill + left accent diamond + accent icon. Bottom profile: avatar, name, guild role + XP, mini animated XP bar, sign-out.
- **Mobile bottom bar**: fixed bottom, 60px + safe-area, `bg/95` + subtle backdrop blur, 1px top border. 5 primary tabs + More sheet. Active tab: accent icon + top bar + bold label. Touch targets ≥48px.
- **Mobile top bar**: sticky, `bg/95`, notification bell with accent count badge, settings avatar.

### 6.8 Sheets

Mobile: slides from bottom, 12px top radius, drag handle, max-height 85vh, backdrop `black/60`, Esc closes, body scroll locked. Desktop ≥1024px: centered, angular-clipped, max-w 480px, hud-divider under the header.

### 6.9 Progress bars

- Track `elevated` 6px, fill gradient `accent → accent-2`, animated width via framer-motion (600ms ease-out). Complete: `success`.
- Mission/challenge bars carry the mono fraction to the right.

### 6.10 Charts

Recharts, dark-aware tokens only: grid `border`, axis `muted` 11px, bars `accent`, secondary series `border-strong`. No gradients, no glow. Tooltips: `elevated` bg, 1px border, 12px mono values.

---

## 7. Motion

- Durations: 150ms (hovers/micro), 220–320ms (reveals, sheets, page transitions) — ease-out, no overshoot.
- Page transition: fade + 8px upward, 220ms (AppShell wrapper keyed by pathname).
- Numbers count up via `CountUp` (spring, 900ms, no bounce) when entering view.
- List/feed items stagger in via `Reveal` (delay capped at 450ms).
- Progress bars animate width over 600ms.
- Status pings (live/success) are the only looping animation.
- `prefers-reduced-motion: reduce` disables all transform/opacity animation (global CSS + `useReducedMotion` guards).

---

## 8. States

### 8.1 Loading

Skeleton blocks mirror final layout (shape-matched, e.g. `ChallengeSkeleton`, `TrophySkeleton`, `ProfileSkeleton`), `elevated` fill, 8px radius, pulse. Spinners only inside buttons.

### 8.2 Empty

Intentional, not errors. Structure: icon in a corner-brackets tile, title 16px bold, one line of guidance, optional action. Copy stays in-voice: "NO POSTS YET — BREAK THE ICE", "NO INTEL ON THAT NAME", "ALL CLEAR. NOTHING TO REPORT.", "NO MISSIONS ON THE BOARD."

### 8.3 Error

`danger/10` panel, 1px `danger/30` border, 15px text, [TRY AGAIN]. Never raw network strings.

### 8.4 Demo data labeling

Any Free Fire stats surface a `SyncChip`: `DEMO DATA · last synced 3m ago` (warning tint) or `LIVE DATA · last synced 3m ago` (success tint). Honest readout, not a warning banner.

---

## 9. Accessibility

- Semantic landmarks: `<main>`, `<nav>`, `<header>`, `<section>`.
- All interactive elements keyboard-operable with visible focus (2px accent offset ring).
- Labels on every input (never placeholder-only).
- Touch targets ≥44px; primary ≥48px.
- No color-only signaling: states carry icons/labels/dots.
- Screen readers get full text; icons are `aria-hidden` when decorative.

---

## 10. Responsive behavior

| Breakpoint | Behavior |
|---|---|
| <768px | Bottom nav, single column, compact rows, 2-up stat grids, sheets, horizontal chip filters |
| 768–1023px | Icon-rail or collapsed sidebar, two-column sections allowed |
| ≥1024px | Full sidebar, 12-col grid, real tables, centered dialogs |

Design mobile-first at 360px, then 375/390/412/430. Final QA checks 360/375/390/412/768/1024/1440 for zero horizontal overflow.

---

## 11. Copy voice

The interface speaks like a squad leader with a sense of humor. Words: drop, drop in, lobby, intel, mission, briefing, roster, loadout, lock in, squad up, take the crown, trophy case, flanked, radio silence, no intel. Copy is short, uppercase-leaning for labels/CTAs, and never corporate. Every empty state and CTA has personality.

---

## 12. Page inventory

| Page | Frame |
|---|---|
| Landing | Hero "PLAY TOGETHER. DOMINATE TOGETHER." + ladder HUD panel + count-up stat band + mission/calendar/feed + trophy strip + "READY TO RUN WITH KO?" CTA |
| Auth | "WELCOME BACK, SOLDIER" / "CLAIM YOUR SPOT", HUD test-account panel |
| Dashboard | Command center: grid hero, live feed, top-this-week, next-event "LOCK IN", mission card, announcements, trophies |
| Leaderboard | Season header, category tabs, top-3 podium (clip-pedestal), ranked table from #4 |
| Players / Profile | Roster rows / loadout hero + combat record + medal case + match log |
| Events / Detail | Briefing cards / briefing room + "WHO'S GOING?" + LOCK IN |
| Challenges / Achievements | Mission board / trophy case with rarity legend |
| Teams / Tournaments | Squad rosters / bracket watch with live states |
| Community / Notifications / Search | The lobby / intel feed / search the roster |
| Settings / Admin / 404 | Command profile / restricted zone / "YOU GOT FLANKED" |

---

## 13. Do's and Don'ts

**Do**: let numbers lead · use rows and tables · keep orange primary · color-code tiers and rarities · label demo data · make empty states fun · design 360px first · respect safe areas · use mono for stats · cut corners on CTAs only · animate once, ease-out.

**Don't**: card-grid everything · pill buttons everywhere · purple-blue AI gradients · neon glow · glass panels (except sticky bars) · emoji icons · decorative icons · tiny touch targets · horizontal page overflow · hide content under the bottom bar · animate loops (except status pings).