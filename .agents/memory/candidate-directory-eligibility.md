---
name: Candidate directory eligibility
description: Product rule separating incumbency from whether imported candidate and representative profiles are searchable.
---

Treat `isCurrent` as an incumbency indicator, not a directory eligibility flag. A non-incumbent candidate can still be current and searchable.

**Why:** Spreadsheet imports historically set non-incumbents false, and using that field as the Representatives directory gate silently excluded valid challengers. Grade and financial-data availability are also not eligibility requirements.

**How to apply:** Include valid candidate and representative profiles when they have a state-aware held or target seat link. Keep incumbent labels based on `isCurrent`, preserve real A–F grades, and present missing/non-letter grades as neutral NG.

Never resolve candidate identity or seats by name or district number alone.

**Why:** Names can repeat, and district numbers repeat across states and chambers. Broad matching can overwrite another person or move a candidate to the wrong race.

**How to apply:** Prefer a stable candidate identifier; otherwise require normalized name plus state, office/chamber, and district. Skip incomplete or ambiguous rows and report them rather than guessing.