# AgriPulse — Full Technical Dossier (no code changes)

This is a documentation-only write-up of the system as it exists today: stack, schema, algorithms, modules, UI system, security, and known gaps.

---

## 1. Stack & frameworks

| Layer | Technology |
|---|---|
| UI | React 18 + TypeScript 5, Vite 5 |
| Styling | Tailwind CSS v3 + shadcn/ui (Radix primitives), HSL design tokens |
| Motion | framer-motion (hero, card reveals), custom `TiltCard` 3D hover |
| Routing | react-router-dom v6, `BrowserRouter` |
| Data fetching | @tanstack/react-query (client), direct supabase-js calls |
| Validation | zod (`src/lib/validation.ts`) |
| Icons | lucide-react |
| Charts | recharts (field timeline severity chart) |
| Backend | Lovable Cloud (Postgres + Auth + Storage + Realtime + Edge Functions on Deno) |
| AI | Lovable AI Gateway → `google/gemini-2.5-pro` (vision diagnosis), `gemini-2.5-flash` (planning, chat, translation), `text-embedding-004` (RAG) |
| Vector search | pgvector (`vector` columns + cosine distance) |
| PWA | manifest + install prompt (`InstallPrompt`), offline banner, local cache |

Provider order in `App.tsx`: QueryClient → LanguageProvider → AuthProvider → TooltipProvider → Router. Two components (`OfflineBanner`, `InstallPrompt`) were deliberately decoupled from `useLang` after crashes caused by rendering outside the language context.

---

## 2. Route map

Public: `/` (Landing), `/auth`, `/reset-password`, `/about`, `/privacy`, `/terms`, `*` (404).

Auth-gated via `RequireAuth`: `/dashboard`, `/scan/new`, `/scan/:id`, `/field/:id`, `/tickets`, `/tickets/new`, `/tickets/:id`, `/plan`, `/mixed-crops`, `/methods`, `/methods/:slug`, `/spray`, `/admin`.

`/admin` is additionally gated by role (`has_role`) and by TOTP step-up (`aal2`) through `MfaGate`.

---

## 3. Database schema (Postgres, all RLS-enabled)

**Identity & access**
- `profiles` — user_id, display_name, preferred_language, avatar_url, account_status (`active|suspended|banned`), moderation_reason/moderated_at, suspicious/suspicious_reason/suspicious_at, last_login_at. Auto-created by trigger `on_auth_user_created` → `handle_new_user()`.
- `user_roles` — separate table (never a column on profiles, to prevent privilege escalation), enum `app_role = admin|user`. Seeded by `handle_new_user_role()`: the two owner emails get `admin`, everyone gets `user`.

**Farm data**
- `fields` — name, crop, location, latitude/longitude, owner `user_id`.
- `scans` — crop, interview (jsonb), image_urls[], diagnosis (jsonb), disease_name, confidence, severity, language, optional field_id.
- `crop_samples` — N, P, K, temperature, humidity, ph, rainfall, label. The k-NN training set.
- `mixed_crop_rules` — primary/companion crop, soil_types[], weather, min_land_acres, compatibility_score, benefits[], principles[], notes, source.
- `farming_methods` + `farming_method_images` — category, title, slug, description, benefits[], example_crops[], use_cases[], cover image, ordered gallery images.

**Knowledge / RAG**
- `disease_reference` — crop, disease_key, name_en/hi/te, description, visual_signs, typical_severity, source.
- `disease_reference_images` — labelled reference photos per disease_key.
- `rag_documents` — crop, disease_key, source_url, title, chunk, lang, `embedding vector`.
- `rag_image_embeddings` — crop, disease_key, image_url, `embedding vector`.

**Support & governance**
- `tickets` / `ticket_messages` — enums for category (bug, wrong_diagnosis, feature, other), priority, status (open → in_progress → resolved → closed); screenshot_url, optional scan_id; messages are append-only (no update/delete).
- `announcements` — title, message, audience (all|users), show_as_popup, active, expires_at.
- `ads` — admin-managed promo cards with internal links only (no external redirect surface).
- `audit_log` — actor, action, target, meta, ip, user_agent. Insert/update/delete denied to clients.
- `user_activity_log` — per-action telemetry (action, endpoint, status, meta, ip).
- `login_attempts` — email, ip, ua, success. Written only by the service role.
- `rate_limits` — key + window_start + count, unique per bucket.

**Storage buckets:** `scan-images` (private), `disease-references`, `farming-gallery`, `ads`, `ticket-screenshots` (public read, unguessable UUID paths).

---

## 4. Database functions (security-definer where needed)

- `has_role(user_id, role)` — the single RBAC primitive; security-definer so RLS policies can call it without recursion.
- `is_account_active(user_id)` — used to block suspended/banned users at the data layer.
- `handle_new_user()` / `handle_new_user_role()` — provision profile + roles on signup.
- `check_rate_limit(key, max, window_seconds)` — atomic upsert-and-count into `rate_limits`; returns false when the bucket exceeds `max`.
- `evaluate_suspicious(user_id)` — heuristics: >60 actions in 5 min, or >15 error responses in 10 min → flags the profile with a reason.
- `touch_last_login(user_id)`.
- `protect_profile_moderation_fields()` — trigger raising an exception if a non-admin tries to alter account_status / moderation / suspicious fields. This is what makes banning admin-only even if a client crafts its own request.
- `validate_profile_account_status()` / `validate_announcement()` — value validation via triggers rather than immutable CHECK constraints.
- `recommend_crops_knn(...)` — the crop recommendation engine (below).
- `match_rag_documents(...)` / `match_rag_images(...)` — cosine-similarity top-k retrieval.
- `update_updated_at_column()` — shared timestamp trigger.

---

## 5. Algorithms

**5.1 Crop recommendation — deterministic k-NN in SQL**
1. Compute per-feature ranges over `crop_samples` (min/max for N, P, K, temperature, humidity, ph, rainfall).
2. Min-max normalise the farmer's input and every sample, then compute Euclidean distance in 7-dimensional space.
3. Take the 25 nearest samples, group by crop label.
4. Score each label as `avg(1 / (1 + distance))`; suitability = score normalised to the best label × 100, rounded to 0.1.
5. Return the top 3 with vote counts and the ideal NPK/pH centroid of the neighbourhood.

AI never decides the ranking — Gemini Flash only *explains* the already-ranked results (why, risks, fertiliser, water need, profit range in INR/acre, rotation note), in the user's language, via a forced tool call.

**5.2 Disease diagnosis — RAG-grounded vision**
1. Rate-limit check (10 scans/hour per user, IP fallback).
2. Load the crop's `disease_reference` rows and render them as a constrained taxonomy.
3. Embed "crop + interview answers" with `text-embedding-004`.
4. Retrieve top-5 text passages and top-4 similar reference images via pgvector cosine search.
5. Call `gemini-2.5-pro` with the photos + taxonomy + retrieved passages, forcing the `report_diagnosis` tool schema: disease_name, localized names (en/hi/te), confidence 0–1, severity none|low|medium|high, summary, affected_regions, remedies {chemical[], organic[]}, warnings[], sources_used[].
6. Map `sources_used` indexes back to real passages and attach them plus similar images, so every result is citable in the UI.
7. Log the activity and return.

Anti-hallucination levers: forced tool schema (no free text), closed taxonomy, retrieval grounding, explicit "healthy → severity none, no remedies" rule, and source citation.

**5.3 Mixed cropping** — rule-matching over `mixed_crop_rules` on primary crop, soil type, weather, and land size, ranked by compatibility_score, with benefits/principles surfaced as cards.

**5.4 Suspicious-activity detection** — the SQL heuristics in `evaluate_suspicious`, invoked after every logged edge-function action; plus the 5-failed-logins-in-10-minutes rule in `track-auth-attempt`.

**5.5 Localisation of generated output** — static UI strings come from the i18n dictionary; already-generated AI text is re-translated on language switch through the `translate-text` edge function, so stored results follow the chosen language.

---

## 6. Edge functions

| Function | Role | Limit |
|---|---|---|
| `diagnose-crop` | RAG + Gemini Pro vision diagnosis | 10/hour/user |
| `recommend-crop` | k-NN + Gemini Flash enrichment | 15/hour/user |
| `rag-ingest` | chunk + embed text and image references into the vector tables | admin only |
| `agri-chat` | scoped in-app assistant (navigation + explaining results) | rate-limited |
| `translate-text` | on-demand translation of stored AI output | rate-limited |
| `track-auth-attempt` | records login successes/failures, flags brute force | service role |
| `_shared/security.ts` | `getServiceClient`, `getUserIdFromAuthHeader`, `rateLimit`, `logActivity`, `clientIp`, `rateLimitedResponse` | — |

---

## 7. Design system

**Tokens** (`index.css`, HSL, light + dark):
- background `#F9FAF7` (90 18% 97%), foreground deep green-black (140 30% 12%)
- primary `#2E7D32` (123 46% 34%), primary-glow (123 38% 50%)
- secondary `#A5D6A7` (122 39% 75%), accent amber (38 90% 55%)
- destructive/danger `#E53935` (1 77% 55%), success (123 46% 38%), warning (38 92% 52%)
- radius `1rem`; gradients `--gradient-hero` (135° green) and `--gradient-soil` (vertical cream); shadows `--shadow-soft`, `--shadow-elevated`

**Typography:** Plus Jakarta Sans for display/headings, Inter for body; headings get `tracking-tight`.

**Utilities:** `.bg-hero`, `.bg-soil`, `.shadow-soft`, `.shadow-elevated`, `.story-link` (underline sweep), `.hover-scale`, `.perspective`, `.menu-row` (48px-min touch rows).

**Buttons:** shadcn variants — primary solid green pill (`rounded-full px-7`) for the main CTA, `ghost` for secondary/back, `destructive` for ban/suspend/sign-out. Minimum 44–48px touch targets, `active:scale-[0.98]` press feedback, 200–300ms transitions.

**Layout & alignment:** `container` centred with 1.5rem padding, max 1400px. Landing hero is full-bleed (`min-h-[calc(100vh-4rem)]`) with the agritech photo as an absolute cover image, a `bg-foreground/65` scrim for contrast, and left-aligned stacked layers: pill badge → app name (5xl→7xl extrabold) → tagline (2xl→4xl) → subtitle → CTA row with inline Telugu/Hindi/English switcher. Features below are a 4-column grid collapsing to 1 on mobile, each a tilt card with a 40px rounded icon chip.

**Navigation:** `AppHeader` with logo + slide-in account drawer (hamburger) containing profile, language, key destinations, Join WhatsApp Community, admin entry (hidden for non-admins), and sign-out. `BackButton` on inner pages guarantees a return path. `ChatbotFAB` floats bottom-right on authed pages.

---

## 8. Features

Landing & onboarding · email/password auth with show-hide password, forgot-password and `/reset-password` · dashboard with quick actions, alerts, recent scans · camera capture with blur guidance · 3-step scan interview → diagnosis with confidence, severity badge, chemical/organic remedies tabs, warnings, cited sources, similar reference images, voice readout (chunked TTS with stop) · field timeline with severity chart · crop planner · mixed-crop planner · farming methods gallery · spray calculator · tickets with threaded admin replies and auto-attached account/scan context · admin announcements with dynamic popups · ads · PWA install + offline mode · full Telugu/Hindi/English localisation including generated output.

**Admin console tabs:** Users (suspend/ban/clear), Suspicious, Activity, Scans, Tickets, Disease library, RAG ingest, Farming methods, Mixed-crop rules, Announcements, Ads, Audit log.

---

## 9. Authentication & security

- Email/password only (Google OAuth removed on request). Signup requires full name, validated by zod; passwords ≥8 chars with HIBP leaked-password checking enabled.
- Session: `onAuthStateChange` listener registered before `getSession`; 30-minute idle auto-logout (`useIdleLogout`); "sign out everywhere" (global scope).
- Authorisation: RLS on every table + `has_role()`; roles in a dedicated table; admin routes gated in UI *and* at the data layer; TOTP/`aal2` step-up for `/admin`.
- Moderation: suspended/banned users are blocked immediately by `RequireAuth` and by the `protect_profile_moderation_fields` trigger server-side.
- Abuse control: Postgres rate limiter per user/IP per function; brute-force detection on login; `evaluate_suspicious` heuristics with realtime admin toasts via `useAdminAlerts`.
- Input handling: zod schemas, `sanitizeText` HTML stripping, no `dangerouslySetInnerHTML`, length caps, parameterised queries only (PostgREST/RPC — no string-built SQL).
- Audit: `audit_log` (client-immutable) + `user_activity_log` + `login_attempts`.
- Secrets: service role key and DB password are never exposed to the client; the AI key lives only in edge functions.

**Failure handling:** 429 → friendly "usage limit reached" toast; 402 → AI credits message; 502 → "AI did not return a structured diagnosis"; offline → banner + queued capture; every list has an empty state; logging is best-effort and never blocks UX.

---

## 10. Honest gaps (not built / weak today)

1. **No server-side CAPTCHA** on signup/login — brute force is detected and logged, not blocked.
2. **Rate limiting is advisory** — a Postgres counter, not an edge-level WAF; a distributed attacker rotating IPs and accounts can still spend AI credits.
3. **Offline sync is partial** — capture queues locally, but conflict resolution and background sync are simplistic.
4. **`track-auth-attempt` flags profiles by matching `display_name` to an email**, which will rarely match a real row — the brute-force flagging path is effectively inert.
5. **CORS is `*`** on edge functions.
6. **No automated test coverage** beyond a placeholder; no CI gate.
7. **Deferred by design:** video diagnosis, soil PDF OCR, disease heatmap, weather push notifications, phone OTP login, email notifications for tickets.
8. **Lint debt** — several `any` casts around Supabase typed clients.

---

## Suggested next step

If you want action rather than documentation, the highest-value fixes are (4) the broken brute-force flagging, (1) CAPTCHA on auth, and (6) a real test + CI gate. Say the word and I will plan those as an implementation task.
