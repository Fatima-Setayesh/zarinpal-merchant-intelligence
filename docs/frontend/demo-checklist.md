# Frontend Demo Checklist

Use this checklist before a judged desktop or mobile demonstration. Check an item only after verifying it in the build being presented.

## Build and environment

- [ ] Install from the committed lockfile with the documented pnpm command.
- [ ] Run the actual format check, lint, typecheck, test, and production-build scripts.
- [ ] Record and resolve warnings that could affect the demo.
- [ ] Serve the production build or the explicitly documented demo environment.
- [ ] Confirm the expected API/environment configuration without exposing secrets.
- [ ] Verify that the demo does not depend on an uncommitted local file or cache.
- [ ] Prepare a truthful fallback for unavailable network or teammate-owned services.

For the planned workspace scripts, the expected verification sequence is:

```sh
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

This document does not claim that these commands have been executed; report actual results separately.

## Product narrative

- [ ] Introduce the product as a Merchant Decision Intelligence Platform, not a generic analytics dashboard.
- [ ] Demonstrate the path from evidence to insight, business impact, recommended action, and traceability.
- [ ] Lead with “What happened?”, “Why does it matter?”, and “What should I do?”
- [ ] Keep the primary merchant story concise enough to understand without analytical training.
- [ ] Ensure every chart shown has a stated decision purpose.
- [ ] Avoid a generic chatbot or decorative AI claim; describe AI only if a genuine implemented feature improves the decision experience.

## Truthfulness and ownership

- [ ] Label foundation-only or illustrative content **Demo / Placeholder**.
- [ ] Do not present invented merchants, metrics, insights, or recommendations as analytical output.
- [ ] Confirm that the frontend does not calculate backend-owned business metrics.
- [ ] Confirm teammate approval for the contracts used by the demonstrated build.
- [ ] Obtain teammate confirmation of demonstrated numerical definitions and analytical correctness.
- [ ] Do not imply that planned backend, analytics, data, or AI features are implemented.

## Correctness-sensitive content

- [ ] Distinguish payment sessions from payment attempts in every applicable label and explanation.
- [ ] Never label `adjusted_fee` as Zarinpal's real fee.
- [ ] Explain the confidential transformation and limit claims to analytically justified relative comparisons.
- [ ] Show missing-data handling and material limitations.
- [ ] State date range, units, sample size, and comparison groups near important claims or in one direct disclosure step.
- [ ] Avoid causal wording unless the approved methodology supports it.
- [ ] Check that merchant concentration and relevant confounders are not hidden in comparisons.

## Traceability path

- [ ] Open traceability from each important demonstrated insight or metric.
- [ ] Verify that the evidence corresponds to the exact originating claim.
- [ ] Show formula or method, filters, date range, sample size, unit of analysis, compared groups, missingness, and limitations—or explicitly state what is unavailable.
- [ ] Keep a critical limitation visible before the recommendation is acted upon.
- [ ] Verify loading, partial, unavailable, stale, and error evidence states as applicable.
- [ ] Close the evidence surface and confirm focus and scroll context return correctly.

## Desktop presentation

- [ ] Verify the target projector/display resolution and browser zoom.
- [ ] Confirm hierarchy remains clear at a distance and text is not overly dense.
- [ ] Check navigation, filters, cards, tables, charts, and evidence panels for clipping or overflow.
- [ ] Verify keyboard navigation and visible focus through the primary story.
- [ ] Check loading and transitions for disruptive layout shifts.

## Mobile presentation

- [ ] Test at 320 and 375 CSS-pixel widths and one landscape viewport.
- [ ] Confirm there is no page-level horizontal overflow.
- [ ] Verify touch targets, readable typography, and non-hover access.
- [ ] Open, apply, reset, and close the filter sheet.
- [ ] Open and close the traceability disclosure and verify focus return.
- [ ] Ensure dense tables and charts remain understandable without tiny labels.
- [ ] Confirm the finding, impact, action, and critical limitation retain their order and meaning.

## Accessibility

- [ ] Navigate the complete primary path using only a keyboard.
- [ ] Verify semantic landmarks, heading order, control names, and form labels.
- [ ] Check focus trapping and focus return for dialogs and sheets.
- [ ] Confirm sufficient contrast and non-color cues for status and comparison.
- [ ] Test 200% zoom/reflow and long content.
- [ ] Verify reduced-motion behavior.
- [ ] Confirm essential chart content has an accessible text or tabular alternative.

## Resilience and polish

- [ ] Demonstrate or inspect loading, empty, filtered-empty, partial, error, and recovery states.
- [ ] Preserve the last trustworthy result during background refresh and label the refresh.
- [ ] Verify retry actions are safe and understandable.
- [ ] Check browser console and network panel for unexpected errors or failed assets.
- [ ] Confirm no secrets or sensitive raw data appear in the client bundle, UI, logs, or screenshots.
- [ ] Check content for typos, inconsistent units, ambiguous dates, and placeholder text.
- [ ] Confirm performance is acceptable on a representative mobile device or throttle profile.

## Final handoff

- [ ] Record the exact branch and commit demonstrated.
- [ ] Record the exact commands run and their results.
- [ ] List known issues and limitations rather than hiding them.
- [ ] Keep a short, ordered desktop path and an equally truthful mobile path.
- [ ] Identify which claims require teammate explanation during questions.
- [ ] Confirm that planned features are described as planned.
