# MindCraft design system

## Product direction

MindCraft is a consumer visual library for one person. It is an original product that supports the same broad need as visual bookmarking apps: quick capture and visual recall. It does not reproduce another product's branding, assets, copy, or proprietary screens.

## Visual system

- **Vibe:** gallery-like personal archive. Cards are the primary object, with an image-forward, responsive board rather than a productivity-dashboard rail.
- **Colours:** paper `#F6F5F1`, ink `#17243A`, cobalt `#3458DB` for primary actions, sea `#D5EEE8`, lavender `#E5DDFB`, apricot `#F7D8BC`. Dark mode uses `#121B2C` with equivalent contrast.
- **Type:** system rounded sans for reliable local rendering. Roles: page title, section title, card title, body, caption, label, keyboard hint.
- **Layout:** top capture bar; visual board below; a compact slide-over filter panel only when needed. No permanent dashboard-style sidebar.
- **Icons:** existing Lucide line icons are used consistently for actions. Icons are never decorative chrome; they identify a card type or action.
- **Motion:** no automatic motion. Dialogs share a short opacity transition; active selection uses colour and border, never position changes.

## Interaction patterns

- `⌘/Ctrl + N` opens capture and `⌘/Ctrl + K` focuses search.
- A card opens its detail sheet; editing and deletion are one step deeper.
- Capture classifies locally with transparent rules. It does not claim AI understanding.
- Browser data is stored locally first. Sync is manual/automatic only after the user configures their own server and private token.

## Accessibility and product rules

- Both themes have first-class tokens and visible focus indicators.
- Labels use sentence case; native selects and colour controls are not used in the product UI.
- One primary action per view; destructive actions use a confirmation step.
- No ads, paywall, tracking, or third-party analytics.
