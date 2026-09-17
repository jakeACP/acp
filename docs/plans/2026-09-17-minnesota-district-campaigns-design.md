# Minnesota district selection and campaigns

Approved: selecting a district shows only campaigns for that office and district.

- Retain the large, margin-centered map and address sidebar, without hover centering transforms.
- Use a dated local snapshot of the official May 2026 Minnesota Secretary of State precinct GeoJSON. Keep attribution, retrieval date, and checksum; do not fetch a live source on every visitor request.
- Offer Minnesota House, Senate, congressional, and county-commissioner selectors. House 30A and Senate SD30 are distinct canonical keys. County-commissioner keys also include county.
- Default to the address's House district when exactly one precinct matches. Support changing layers, searching districts, map clicks, boundary highlights, and returning to the address.
- Render only selected-district campaigns below the map, with loading, error, and honest empty states. Never substitute statewide candidates or incumbents without evidence they are campaigning for the selected seat.
- Keep nationwide/non-Minnesota election behavior unchanged.
- Verify canonical matching, sample official polygons and address matching, rapid selection changes, mobile layout, and Patriot Mode hover stability.