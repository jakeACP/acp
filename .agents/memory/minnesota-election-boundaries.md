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