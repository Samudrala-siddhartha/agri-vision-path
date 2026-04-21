

# AgriPulse — Gap-Closing Build

Most of the spec you sent is already shipped (diagnosis flow, k-NN crop planning, ticket system, chatbot, PWA, voice, 3 languages, profile menu, spray calc, severity badges). This plan **only builds what's missing or weak** and rewrites the hero to be product-first.

## 1. Product-first Landing hero
Rewrite `src/pages/Landing.tsx`:
- Headline: "Scan your crop. Get treatment in seconds." + localized strings.
- Primary CTA: large green **"Scan your crop now"** button with camera icon → `/scan/new` (routes via `/auth` if logged out).
- Secondary chips: 📸 Scan Crop · 🌾 Plan Crop.
- **Diagnosis Preview Card** (right): dominant elevated card with a sample paddy leaf, animated scan-line sweep, pulsing "Analyzing…" micro text, infected-area highlight overlay, then reveals Disease name + severity badge + 1-line treatment preview. Pure CSS/framer-motion, no WebGL.
- Subtle gradient + parallax background (already have `bg-soil`); reduce decorative blobs.
- **Trust strip** under hero: "Used by farmers · Powered by real crop datasets · Telugu / Hindi / English".
- Trim feature cards to 4, bigger icons, less text, hover-lift only.

## 2. Weather auto-fetch in Crop Planning
- Add edge function `weather-fetch` calling **OpenWeather** (`/data/2.5/weather`) — requires user-supplied `OPENWEATHER_API_KEY` secret. Will request via add_secret tool.
- In `CropPlan.tsx`, add a "Use my location" button → `navigator.geolocation` → call function → prefill temperature, humidity, rainfall (last-3h estimate) sliders. Falls back gracefully to manual sliders.

## 3. Capture quality (blur detection + retake)
- New util `src/lib/blurDetect.ts`: Laplacian variance on a downscaled canvas. If variance < threshold, show retake toast inside `CameraCapture` and `NewScan` upload step before submit.

## 4. Offline scan queue + sync
- New `src/lib/offlineQueue.ts` using **IndexedDB** (idb-keyval) to store pending scans (crop, interview, image blobs, language).
- In `NewScan.submit`: if `!navigator.onLine`, enqueue + toast "Saved offline — will sync when online".
- New `src/components/OfflineSync.tsx` mounted in `App.tsx`: listens for `online` event, drains queue by uploading images + invoking `diagnose-crop` + inserting `scans`, shows pending-count badge next to existing `OfflineBanner`.

## 5. Alerts + unread ticket badge
- Add unread counter in `AppHeader` profile button: query `tickets` where `status in ('open','in_progress')` and latest `ticket_messages` is admin and newer than user's last visit (store `last_tickets_seen_at` in `localStorage`). Red dot on avatar + count in dropdown next to "Support".
- Admin: same logic for tickets where latest message is from a non-admin user.

## 6. My Farm timeline upgrades
- `FieldDetail.tsx`: vertical timeline cards with image, disease, date, **trend arrow** (↑/↓ vs previous scan severity).
- Filter chips by crop and disease; infinite scroll via `IntersectionObserver` (page size 10).

## 7. Admin Advertisement system
- New table `ads`: `id, title, description, image_url, cta_label, internal_link (text, must start with '/'), expires_at, active boolean, created_at`. RLS: public read of active+non-expired; admin write.
- Storage bucket `ads` (public).
- Admin: new "Ads" tab in `/admin` to create/edit/delete with image upload.
- User side: `src/components/AdModal.tsx` mounted inside authed routes — fetches one active ad, shows once per session via `sessionStorage` flag, X to close, CTA uses `<Link to={internal_link}>` with strict `/`-prefix validation (no external URLs).

## 8. Result screen polish (small)
- Already strong. Add **Cost per acre** line (read from diagnosis JSON if present, else hide) and a **"View similar cases"** link that filters `/dashboard` recent scans by `disease_name`.

## 9. i18n
- Add new keys to `src/i18n/translations.ts` for hero, weather button, blur retake, offline sync, ads close/CTA — in en/hi/te.

## Technical notes
- New deps: `idb-keyval` for offline queue.
- New edge function: `weather-fetch` (verify_jwt default).
- New secret: `OPENWEATHER_API_KEY` (user must provide via add_secret).
- New table + bucket: `ads`.
- Files touched: `Landing.tsx`, `CropPlan.tsx`, `NewScan.tsx`, `CameraCapture.tsx`, `FieldDetail.tsx`, `Admin.tsx`, `AppHeader.tsx`, `App.tsx`, `translations.ts`, `index.css` (minor).
- New files: `lib/blurDetect.ts`, `lib/offlineQueue.ts`, `components/OfflineSync.tsx`, `components/AdModal.tsx`, `components/HeroDiagnosisCard.tsx`, edge function `weather-fetch/index.ts`, migration for `ads` table + bucket.

## Out of scope (per your instructions)
Video processing, soil PDF OCR, disease heatmap.

## Diagram
```text
Landing hero → CTA → /scan/new (auth-gated)
                       ↓
              capture (blur check) → diagnose-crop → ScanResult
                       ↓ offline?
              IndexedDB queue ← OfflineSync drains on 'online'

CropPlan → "Use location" → weather-fetch → prefill → recommend-crop

Admin → Ads tab → ads table → AdModal (once/session) → internal /route
```

