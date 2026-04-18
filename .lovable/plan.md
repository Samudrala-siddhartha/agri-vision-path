
The user uploaded dataset metadata (chili leaf disease images + rice disease dataset reference) but sent only "@". They likely want me to incorporate these datasets into AgriPulse. Let me plan a focused next step that uses these datasets meaningfully without scope creep.

# Next Step — Foundation + Dataset Integration

Build the **foundation of AgriPulse** and wire in the uploaded dataset metadata as a reference layer the AI can use for higher-accuracy diagnosis.

## What the uploads give us
- **Chili leaf dataset (1,515 images)** — classes include Anthracnose and other chili diseases, with sharpness scores and image dimensions
- **Rice diseases dataset** — Kaggle reference (Huy Minh Do, MIT license), schema metadata only

These won't be uploaded as images (12 GB rice dataset is too large), but the **class taxonomy + characteristics** become a curated "known diseases" reference that grounds Gemini's responses.

## Phase 1 build (this turn)

### 1. Backend setup (Lovable Cloud)
- Enable Cloud (auth + DB + storage + edge functions + AI gateway)
- Auth: Email + Google
- Tables: `profiles`, `fields`, `scans`, `disease_reference`
- Storage bucket: `scan-images` (private, RLS per user)
- Seed `disease_reference` with the chili classes from your CSV + common rice/wheat diseases

### 2. Frontend shell
- Material 3-inspired design system in `index.css` + `tailwind.config.ts` (earthy green primary, semantic tokens, light/dark)
- Routes: `/` (landing + language pick), `/auth`, `/dashboard`, `/scan/new`, `/scan/:id`, `/field/:id`, `/outbreaks`
- i18n provider with EN / हिं / తె translation maps
- Reusable components: `LanguageSwitcher`, `CropCard`, `SeverityBadge`, `DiagnosisCard`

### 3. Core scan flow (end-to-end)
- **Software Interview**: crop pick → age slider → rain toggle → growth stage
- **Capture**: photo upload (multi-file) with client-side sharpness scoring to keep top 5 frames
- **Diagnose** edge function `diagnose-crop`:
  - Pulls relevant `disease_reference` rows for the chosen crop
  - Calls Gemini 2.5 Pro multimodal with images + interview + reference taxonomy
  - Returns structured JSON via tool calling: `{ disease, confidence, severity, affected_regions[], remedies: { chemical, organic }, warnings[] }`
  - Saves to `scans` table with image URLs
- **Result screen**: localized diagnosis, severity badge, image with overlay boxes, tabbed remedies, TTS readout button

### 4. Google Journey (history)
- `/dashboard` lists fields + recent scans
- `/field/:id` shows vertical timeline + simple severity-over-time chart (Recharts)

### 5. Upload chili dataset metadata
- Copy `dataset_image_metadata_summary.csv` into project, parse server-side, insert distinct classes into `disease_reference` with characteristics for AI grounding

## Deferred to Phase 2
Outbreak heat map, weather advisory, PDF export, expert escalation, phone OTP — confirmed in last plan, will add after core flow is verified.

## Tech notes
- AI: `google/gemini-2.5-pro` for diagnosis (multimodal + reasoning), `gemini-2.5-flash` for translation helpers
- Structured output via tool calling (not "return JSON" prompt)
- All secrets server-side; LOVABLE_API_KEY auto-provisioned
- RLS on every table; `disease_reference` is public-read

After this phase you'll have a fully working scan → diagnose → save → review loop with real AI, ready to test on a real chili or rice photo.
