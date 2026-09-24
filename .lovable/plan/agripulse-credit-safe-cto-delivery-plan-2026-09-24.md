# AgriPulse — Credit-Safe CTO Delivery Plan

## Outcome
Extend the existing AgriPulse intelligence platform into a secure farmer-to-consumer marketplace without replacing or weakening diagnosis, crop recommendations, RAG, tickets, localization, PWA/offline support, or admin security.

## Delivery rules
- Build one phase at a time and stop at a verified milestone.
- Reuse existing routes, providers, design tokens, auth, RLS helpers, activity logging, storage patterns, and admin console.
- Add database migrations only when required; every new public table gets grants, RLS, policies, indexes, and server-side validation.
- Keep sensitive actions in protected edge functions or database functions; never trust client payment, inventory, role, approval, or order state.
- Use existing English/Hindi/Telugu translations and touch-friendly mobile UI.
- Validate with targeted tests and a production build after each phase; do not spend credits on broad rewrites or optional polish.

## Phase 0 — Baseline and safety gate
**Purpose:** establish a safe starting point before new work.

- Verify the existing Phase 1 marketplace schema, grants, RLS, triggers, seeded categories/products, and admin role protections.
- Record the current route and feature baseline.
- Confirm existing auth, diagnosis, crop planning, RAG, tickets, PWA/offline, and admin/TOTP flows remain untouched.
- Add only the minimum shared types, query helpers, and translated labels needed by later phases.

**Milestone:** baseline checks pass; no user-facing behavior changes.

## Phase 1 — Account onboarding and farmer approval UI
**Purpose:** make the already-created account and farmer tables usable.

- Add farmer/consumer choice during signup or first authenticated setup.
- Add farmer profile setup for required name, locality, production method, and optional farm details.
- Add protected farmer location and payment settings screens for UPI/QR information.
- Add admin Marketplace tab for pending farmer review: Review, Approve, Reject, Suspend.
- Show approval state clearly and gate seller tools to approved farmers only.
- Audit all admin approval and sensitive payment-profile changes.

**Milestone:** consumer onboarding works; farmer application can be submitted and approved; non-admins cannot approve; unapproved farmers cannot access seller controls.

## Phase 2 — Marketplace discovery and listings
**Purpose:** provide safe, useful product browsing before commerce.

- Add farmer marketplace home, product creation/editing, image upload validation, listing status, and inventory fields.
- Add consumer marketplace with categories, search, server-side filters, pagination, production method, availability, and farmer profile summaries.
- Add nearby list discovery using approximate location only; provide a list fallback if map capability is unavailable.
- Add public-safe farmer/listing views without exact residential coordinates.
- Add admin management for categories, products, listings, and inappropriate content.
- Add server-side authorization so farmers can edit only their own listings.

**Milestone:** an approved farmer can publish a listing; consumers can find it efficiently; inventory and privacy rules hold.

## Phase 3 — Cart, checkout, orders, and fulfillment
**Purpose:** add commerce only after listing and authorization are stable.

- Implement one-farmer cart for version one.
- Add server-authoritative inventory reservation with atomic conflict handling and no overselling.
- Add checkout for pickup or farmer delivery.
- Integrate payment creation and server/webhook verification through the approved payment connector; never confirm from frontend state.
- Add controlled order lifecycle, pickup code verification, seller actions, consumer tracking, and cancellation/error states.
- Store settlements and earnings server-side.

**Milestone:** payment verification, reservation, order transitions, pickup, and delivery remain safe under retries and conflicts.

## Phase 4 — Trust, support, and notifications
**Purpose:** make the marketplace accountable and understandable.

- Add completed-order-only reviews with quality, freshness, communication, and comment fields.
- Extend tickets with optional order context and marketplace issue types without breaking existing tickets.
- Add farmer and consumer notifications for relevant order, payment, dispute, and stock events.
- Add admin dispute investigation, resolution, audit trail, seller reliability indicators, and moderation actions.
- Add realtime only to high-value changes such as approval, order status, inventory, and notifications.

**Milestone:** users can resolve marketplace problems; reviews cannot be fabricated or posted before completion.

## Phase 5 — Real market intelligence
**Purpose:** measure real activity without inventing demand or exposing homes.

- Record minimal marketplace events: search, view, save, add-to-cart, purchase, listing, and quantity update.
- Aggregate production and demand separately by protected geographic cells.
- Add admin-only analytics for listings, quantities, orders, revenue, disputes, and activity.
- Add separate production/demand map controls with list fallback and defined aggregation baselines.
- Add product labels based only on real aggregated activity; never promise profitability or merge supply with demand.

**Milestone:** dashboards and heatmaps use real, separate, privacy-safe aggregates.

## Phase 6 — Farmer weather and alerts
**Purpose:** add weather context without leaking locations or changing listings automatically.

- Add a protected weather provider function with cache, source, timestamp, and stale status.
- Add farmer-only dashboard for temperature, rainfall, humidity, wind, forecast, and official warnings.
- Add severe rainfall, wind, and cyclone alerts targeted only to relevant farmers.
- Support offline cached weather with explicit stale/cached wording.
- Optionally notify a farmer to review a listing when weather affects harvest context; never change price or availability automatically.

**Milestone:** farmers see trustworthy current or clearly cached weather; consumers cannot access farmer weather controls or location data.

## Phase 7 — Assisted workflows
**Purpose:** connect existing intelligence to marketplace work without replacing deterministic decisions.

- Extend the existing AI/chat patterns with a voice-assisted listing draft flow.
- Extract product and quantity, ask for price, show a review step, and require explicit publish confirmation.
- Link soil recommendation to production planning and marketplace listing creation without changing crop ranking.
- Add weather-to-marketplace contextual suggestions only with farmer approval.
- Keep structured outputs, rate limits, localized text, and safe failure handling.

**Milestone:** voice and AI reduce typing while users retain control over listings and decisions.

## Quality gate for every phase
- Preserve existing routes and feature behavior.
- Run targeted unit/security tests for the changed flow.
- Run TypeScript/build validation and inspect the relevant live UI.
- Check mobile touch targets, loading, empty, offline, unauthorized, conflict, and failure states.
- Re-read the migration for grants, RLS, policy scope, and server-side authorization.
- Do not start the next phase until the current milestone is verified.

## Explicitly deferred
Video processing, soil PDF OCR, fabricated heatmap data, client-only payment confirmation, exact public farmer addresses, multi-farmer checkout, automatic weather-based price/listing changes, and unrelated visual rewrites.
