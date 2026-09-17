---
name: Minnesota election boundary scope
description: Product and accuracy constraints for official precinct selection and campaign filtering.
---

District selection means one office and one district, not all overlapping offices.

**Why:** The user explicitly chose House 30A campaigns only for House 30A and Senate 30 campaigns only for SD30. Displaying nearby or overlapping campaigns would undo that choice.

**How to apply:** Preserve chamber-aware, exact district matching when expanding maps, imports, or candidate sources. County-commissioner identifiers also require county context.

Treat the Secretary of State GeoJSON as a basic district-location resource, not a certified ballot or proof that an incumbent is running.

**Why:** The source recommends its Polling Place Finder for the most accurate assignments, and campaign records can have different coverage or no election year. Boundary availability does not imply candidate coverage.

**How to apply:** Keep source dates and official verification links visible, handle boundary uncertainty explicitly, and show honest empty or unconfirmed-year campaign states instead of filling results with unrelated incumbents.

District numbers are not nationally unique, so matching a seat by number alone imports other states' politicians.

**Why:** Politician profiles and held positions are stored nationwide. Congressional districts 1-8 exist in most states, and letter-suffixed legislative districts (42B) exist in Maryland and elsewhere too, so a number-only match silently produces out-of-state candidates and corrupts party colouring.

**How to apply:** Any query that draws on nationwide profile or position rows must also require Minnesota jurisdiction and the right government level. Only rows from an explicitly state-scoped query may skip that check.

Personalised framing requires a successful precinct match.

**Why:** When address matching fails the API still returns statewide offices; labelling that "Your Ballot" claims a personalisation that was never established.

**How to apply:** Gate "Your Ballot" wording on a matched address and otherwise say plainly that the address was not matched and only statewide offices are listed.