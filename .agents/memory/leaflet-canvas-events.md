---
name: Leaflet preferCanvas event pitfalls
description: Why hover/click silently stops working on canvas-rendered Leaflet layers, and how map-level clicks really behave there
---

With `preferCanvas: true` (or any `L.Canvas` renderer), vector layers have no DOM
element and all mouse handling goes through the renderer's single `<canvas>`.

**Rule 1 — never give a vector layer a different `pane`.**
`map.getRenderer(layer)` creates one canvas *per pane*. A `circleMarker` with
`pane: "markerPane"` therefore spawns a second full-size canvas that stacks
above the overlay pane and intercepts every pointer event, so the layers in the
overlay canvas stop firing `mouseover`/`click` entirely — silently, with no
console error. Symptom: tooltips work for the marker only, and clicks land on a
`CANVAS` element but nothing happens. Use a DOM marker (`L.marker` +
`L.divIcon`) when something must sit above canvas vectors.

**Rule 2 — a map-level click is not a fallback for canvas layers.**
`L.Canvas._initEvents` sets `container._leaflet_disable_events = true`, so
`Map._handleDOMEvent` ignores clicks whose target is the canvas. The map only
hears about them because the renderer re-dispatches a *hit* through
`map._fireDOMEvent`, which adds the map itself as a co-target. Net effect: when
a layer is hit, both the per-layer handler and `map.on("click")` run (so
registering both selects twice); when no layer is hit, neither runs. Keep
selection in the `onEachFeature` handlers and register nothing on the map.

**Why:** both failures look identical to "the map is broken" and cost several
debugging rounds; neither produces an error, and the plausible-looking
map-level fallback is both dead on misses and duplicated on hits.

**How to apply:** when canvas-rendered features stop responding, check pane
assignment first and count the canvases in the DOM before suspecting the
geometry, the data, or the hit test.
