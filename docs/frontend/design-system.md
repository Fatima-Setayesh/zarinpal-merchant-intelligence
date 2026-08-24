# Frontend Design System

## Purpose

The design system should make analytical findings understandable and actionable for a non-technical merchant. It is a product language, not a gallery of dashboard components.

The implementation foundation is **shadcn/ui**, Tailwind CSS v4, and semantic CSS-variable tokens. Component source lives in the repository and is adapted through product-aware composition.

## Reference systems, not runtime libraries

The team may study established systems for specific strengths:

| Reference       | Use it to study                                                                        | Do not do                                          |
| --------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Ant Design      | Dense analytics, filters, tables, and enterprise dashboard patterns                    | Install Ant components alongside shadcn/ui         |
| IBM Carbon      | Information architecture, data visualization, accessibility, and analytical interfaces | Copy Carbon styling or APIs indiscriminately       |
| Material Design | Hierarchy, layout, responsive behavior, and interaction feedback                       | Turn the product into a generic Material dashboard |
| Fluent 2        | Navigation, information structure, interaction, and purposeful motion                  | Mix Fluent components into the implementation      |

These are design references only. shadcn/ui remains the single component implementation foundation so behavior, tokens, and accessibility do not fragment.

## Product design principles

1. **Insight before instrumentation.** Lead with what happened, why it matters, and what the merchant can do.
2. **Evidence near the claim.** Important values always provide a discoverable path to methodology and limitations.
3. **Action over decoration.** A chart or visual accent must improve a decision, not merely fill space.
4. **Calm hierarchy.** Reserve strong emphasis for the highest-value finding, warning, or action.
5. **Honest uncertainty.** Missing, partial, delayed, or methodologically limited evidence must look different from confirmed evidence.
6. **Accessible by default.** Keyboard, contrast, focus, semantics, readable type, and touch behavior are component acceptance criteria.

## Tokens

Use semantic tokens rather than raw palette values in product components. The initial token families should cover:

- page background and foreground;
- surface/card and surface foreground;
- primary action and primary foreground;
- secondary and muted content;
- borders, inputs, and focus rings;
- destructive/error, warning, success, and informational states;
- chart series and comparison states when charts are introduced.

Token names express purpose, not a fixed hue. Status tokens require text or icons in addition to color. Chart tokens must be distinguishable under common color-vision deficiencies and in monochrome or low-quality projection.

Tailwind utilities may compose layout and state styles, but repeated product semantics should become tokens or variants. Avoid arbitrary one-off colors, spacing, and shadows that erode hierarchy.

Light and dark themes are implemented with semantic tokens. The query-string preference takes precedence over guarded local storage, both themes preserve chart/state semantics, and reduced-motion behavior remains independent of theme.

## Typography and number presentation

- Use a restrained type scale with an obvious page title, section heading, insight title, body, label, and supporting-text hierarchy.
- Keep body text comfortable on narrow screens and avoid dense uppercase labels.
- Align tabular numerals where comparison benefits from it.
- Display units, time periods, and comparison bases beside important numbers.
- Do not rely on abbreviations that a merchant must decode.
- Never format missing values as zero.
- Preserve enough precision to be truthful while avoiding spurious precision; the backend owns the value and definition, while the frontend owns approved display formatting.

`adjusted_fee` must use language such as **adjusted fee** or another teammate-approved display label and include its confidentiality limitation where relevant. It must never be labeled as Zarinpal's real fee or used for unsupported absolute-pricing claims.

## Layout and density

- Use a consistent responsive container, spacing rhythm, and alignment grid.
- Keep the main narrative column easy to scan; evidence may use denser layouts after disclosure.
- Group controls by task rather than by data-field type.
- Prefer whitespace and section boundaries over excessive borders.
- Allow dense tables only when comparison is the task and provide a mobile-safe alternative.
- Do not make every card equally prominent. Hierarchy should reveal the next decision.

## Component strategy

Keep source-owned UI primitives only when production code consumes them. The current low-level set is Button, Card, Badge, Input, and Select; accessible product drawers, tabs, charts, errors, and loading states are feature components. Unreachable prototype primitives were removed.

Component responsibilities:

- `components/ui` contains low-level shadcn source components and semantic variants.
- `features/merchant-intelligence/components` contains product patterns such as insight, evidence, scope, error, and filter experiences.
- analytical definitions never live inside visual components.

Every interactive component needs hover, focus-visible, active, disabled, loading, and error behavior where applicable. A disabled control should explain why it is unavailable when that reason is not obvious.

## State language

Use explicit, distinct states:

- **Loading:** preserve layout and identify what is loading when useful.
- **Empty:** explain whether no data matched, data is unavailable, or the feature is not yet configured.
- **Partial:** show available information and name what is missing.
- **Error:** state the failed operation, preserve safe user input, and offer recovery.
- **Invalid response:** reject the section and offer recovery rather than partially rendering an untrusted payload.

Never present illustrative numbers, merchants, insights, or recommendations as live analytical output.

## Visualization rules

Before adding a chart, record the decision question it answers, why the chosen form is appropriate, and what action or interpretation it supports. The backend owns correct series and analytical calculations; the frontend owns visual encoding and explanation.

Charts must provide:

- a plain-language title and takeaway;
- labeled units, periods, and comparison groups;
- accessible text or tabular alternatives for essential information;
- non-color cues for important differences;
- responsive resizing without clipped labels;
- a direct traceability affordance;
- visible caveats when missingness, concentration, or confounders affect interpretation.

Do not use three-dimensional effects, decorative gauges, unexplained dual axes, or animation that changes interpretation.

## Motion

Motion should explain continuity, disclosure, or system feedback. Keep it short and interruptible. Honor `prefers-reduced-motion`, avoid auto-playing analytical stories, and never delay access to evidence or actions for animation.

## Accessibility baseline

- Prefer native semantic elements and correct labels.
- Maintain logical DOM and keyboard order even when the visual layout changes.
- Use a visible focus indicator with adequate contrast.
- Target at least 44 by 44 CSS pixels for primary touch controls where practical.
- Associate errors and help text with their controls.
- Announce consequential asynchronous state changes without excessive live-region noise.
- Test zoom, text reflow, keyboard-only operation, and common screen-reader paths.

## Component provenance

`components.json` records shadcn/ui-compatible project conventions, while the
small primitives in `components/ui` are reviewed source code committed with the
application. No runtime component-system dependency or installation claim is
required. Accessibility and product behavior are verified in this repository.
