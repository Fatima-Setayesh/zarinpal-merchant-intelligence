# Responsive Strategy

## Goal

The desktop and mobile demos must communicate the same decision narrative. Responsive design is not a compressed desktop dashboard; it is a deliberate reprioritization of insight, action, and evidence for the available space and interaction mode.

## Approach

Build mobile-first with content-driven breakpoints. Tailwind's default breakpoints are implementation starting points, not assumptions about particular devices. Add a custom breakpoint only when real content fails between established ranges.

Design and test from 320 CSS pixels upward. No page-level horizontal overflow is acceptable. A deliberately scrollable data region may be used only when preserving a table's comparison structure is more understandable than transforming it, and it must be labeled and keyboard accessible.

## Layout behavior

| Surface            | Narrow viewport                                                    | Medium viewport                                 | Wide viewport                                              |
| ------------------ | ------------------------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------- |
| Application shell  | Compact header; secondary navigation in a sheet when needed        | Header with prioritized controls                | Full navigation and contextual actions                     |
| Main content       | Single narrative column                                            | One or two columns based on content             | Constrained multi-column layout with readable line lengths |
| Insight cards      | Stacked; action and critical caveat visible                        | Flexible grid                                   | Prioritized grid, not equal-density tiles                  |
| Filters            | Summary plus full-height filter sheet                              | Wrap or use a popover/sheet based on complexity | Persistent or inline controls when space improves scanning |
| Traceability       | Full-height sheet or dedicated page-like disclosure                | Sheet with contextual summary                   | Side sheet or anchored evidence panel                      |
| Comparisons/tables | Essential fields as stacked rows/cards, or labeled local scrolling | Selective columns with detail disclosure        | Full approved comparison table                             |
| Charts             | Full-width with simplified labels and text takeaway                | Responsive chart with controlled legend         | Chart plus adjacent explanation/evidence when useful       |

Do not change analytical meaning between breakpoints. Responsive variants may change layout, density, or disclosure, but must preserve the active scope, values, limitations, and action.

## Cards and narrative hierarchy

- Put the finding, impact, and next action before secondary metadata on all sizes.
- Keep critical limitations visible; do not hide them solely to save mobile space.
- Avoid fixed card heights that clip translated, zoomed, or evidence-rich content.
- Use container-aware composition where it is supported and simpler than viewport-specific overrides.
- Prevent equal-height grids from creating large dead areas or pushing actions below the fold unnecessarily.

## Filters

- Always show an understandable summary of active filters and a clear way to modify or reset them.
- On mobile, use a labeled trigger with an active-filter count and a sheet with explicit Apply and Reset actions when filters are staged.
- Keep target sizes touch-safe and ensure native keyboard behavior.
- Preserve staged choices if validation fails.
- When a filter changes analytical scope, communicate loading and the updated scope together.
- Never perform frontend-side metric recomputation to simulate filtering.

## Tables and dense comparisons

First ask whether a table is essential. If the user needs row-by-row comparison:

- prioritize columns and move secondary detail behind disclosure on narrow screens;
- keep row identity available while reading values;
- include units in headers or values;
- avoid tiny text and compressed tap targets;
- label any horizontal scroll region and provide visible overflow cues;
- provide a text/card alternative when the table structure is not essential.

Do not truncate material limitations or metric names without an accessible path to the complete text.

## Charts

- Size charts from their container, not fixed viewport dimensions.
- Recalculate visual layout, never business metrics, at responsive changes.
- Simplify tick density and reposition legends without hiding essential series.
- Provide a plain-language takeaway and accessible data summary outside the canvas/SVG.
- Make hover-only detail available through focus and touch.
- Avoid horizontal chart panning for the primary insight unless the time range genuinely requires exploration.
- Test long labels, large values, no-data states, and projected-demo conditions.

## Navigation and disclosures

The one-page product does not need React Router. Native modal dialogs prevent background interaction, establish focus on entry, support Escape/close controls, and return focus to the originating filter, metric, trend, or evidence trigger.

Evidence disclosure must preserve the originating insight. A user closing evidence should return to the same scroll and focus context rather than the top of the page.

## Typography, touch, and motion

- Use a readable mobile base size and limit line length on wide screens.
- Permit text wrapping; do not reduce important copy until it becomes unreadable.
- Support browser zoom and text-only zoom without loss of content or operation.
- Aim for at least 44 by 44 CSS pixels for primary touch targets and sufficient separation between adjacent actions.
- Do not require hover, precise dragging, or multi-touch gestures.
- Respect reduced-motion preferences and avoid motion that causes content to move away from the user's focus.

## Accessibility across breakpoints

Keep DOM order aligned with the reading and focus order; CSS reordering must not create a different keyboard story. Use landmarks consistently, keep focus visible against every surface, and retain accessible names when visible labels shorten. Status, selection, and chart distinctions require non-color cues.

## Performance considerations

- Keep initial JavaScript and CSS small enough for a typical mobile connection and device.
- Keep evidence and visualization components dependency-light; introduce lazy loading only when a measured secondary bundle warrants it.
- Avoid loading desktop-only assets on mobile.
- Reserve layout space for asynchronous content to prevent disruptive shifts.
- Avoid raster assets when typography, CSS, and semantic SVG already communicate the product.

## Verification matrix

At minimum, manually inspect representative widths near 320, 375, 768, 1024, and 1440 CSS pixels, plus a landscape mobile view. Also verify:

- no page-level horizontal overflow;
- 200% browser zoom and text reflow;
- keyboard-only operation and visible focus;
- touch-sized controls and non-hover access;
- long titles, labels, values, and limitations;
- loading, empty, partial, error, and stale states;
- filter and evidence sheets, including focus return;
- chart resizing and accessible alternatives when charts exist;
- reduced-motion behavior.

Automated viewport checks can prevent regressions, but they do not replace inspection on a real or emulated touch viewport.
