---
name: Mobile overlay z-index floor
description: Stacking rule for full-screen overlays/bottom-sheets in the mobile app
---
The mobile bottom nav (`.bottom-nav` in `client/src/mobile/mobile-theme.css`) is `position: fixed; z-index: 100`. The create-post modal uses `z-index: 200`.

**Why:** A bottom-sheet overlay (e.g. PostCommentsOverlay) rendered at z-index 60 was visually below the nav, so the nav covered the sheet's input footer and the bottom of its scroll list — the sheet looked open but you couldn't type a comment or scroll to the last items.

**How to apply:** Any full-screen mobile overlay or bottom sheet must use z-index > 100 (use ~120, staying under the 200 create modal). Don't assume `fixed inset-0` is enough — the sibling fixed nav still wins on equal/lower z-index.
