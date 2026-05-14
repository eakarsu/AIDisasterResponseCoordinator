# Audit Apply Notes — AIDisasterResponseCoordinator

Source: `/Users/erolakarsu/projects/_AUDIT/reports/batch_02.md` (lines 1437-1492).

## Original audit recommendations

### Existing AI features
aiRoutes.js: analyze-threat, generate-evacuation-plan, assess-damage,
predict-weather, optimize-resources, generate-report, triage-medical,
search-strategy.
aiNew.js: ai-analyses, after-action-report, resource-match,
volunteer-deployment.

### Missing AI counterparts
- `supplyRoutes.js` lacks `/optimize-supply-distribution`.
- `donationRoutes.js` lacks `/match-donation-to-need`.
- `shelterRoutes.js` lacks `/optimize-shelter-assignments`.

### Missing non-AI features
- Real-time crisis command center dashboard (likely implied by
  briefingRoutes).
- Mobile app for first responders.
- Emergency-services integration (911, FEMA, Red Cross).
- Social-media monitoring for crisis information.

### Custom feature suggestions
- Real-time impact forecasting.
- Resource-constrained optimization.
- Vulnerability analysis.
- Supply-chain prediction.
- Recovery trajectory modeling.

## Implemented in this pass (mechanical)

1. `POST /api/ai/optimize-supply-distribution` — closes audit gap for
   `supplyRoutes.js`.
2. `POST /api/ai/match-donation-to-need` — closes audit gap for
   `donationRoutes.js`.
3. `POST /api/ai/optimize-shelter-assignments` — closes audit gap for
   `shelterRoutes.js`.

All three are stateless, follow the existing `callOpenRouter` + `auth` +
`aiRateLimiter` pattern in `routes/aiNew.js`, and validate input arrays. No
DB writes, no schema changes. Verified with `node --check`.

Note: `aiNew.js` is mounted under `/api`, so the new endpoints expose at
`/api/ai/optimize-supply-distribution`, `/api/ai/match-donation-to-need`, and
`/api/ai/optimize-shelter-assignments` (matching the existing
`/api/ai/after-action-report` style in this file).

## Backlog (not implemented this pass)

### Mechanical, low-risk
- `/api/ai/vulnerability-analysis` — identify vulnerable populations.
- `/api/ai/recovery-trajectory` — recovery-timeline modeling.
- `/api/ai/impact-forecast` — pre-event forecast.

### Needs product decision
- Live command-center dashboard architecture.
- Trusted-data integrations (which feeds, which jurisdictions).

### Needs credentials / external SDK
- 911 / FEMA / Red Cross integrations.
- NOAA, USGS feeds.

### Too risky / large refactor
- Mobile app for first responders (frontend constraint).
- Auto-execution of resource-allocation plans.

## Apply pass 3 (frontend)

FE already wired. `frontend/src/pages/AINewTools.js` provides a card-based UI for the three new AI endpoints (`/ai/optimize-supply-distribution`, `/ai/match-donation-to-need`, `/ai/optimize-shelter-assignments`) with JSON-array textarea inputs and result display. Route registered in `App.js` at `/ai-new-tools`. No frontend changes this pass.

## Apply pass 4 (mechanical backlog)

Three more mechanical backlog items implemented (the three "mechanical, low-risk" items from the previous backlog):

1. `POST /api/ai/vulnerability-analysis` — rank population groups by vulnerability for a hazard.
2. `POST /api/ai/recovery-trajectory` — project recovery phases, durations, dependencies, and risks.
3. `POST /api/ai/impact-forecast` — pre-event impact forecast (casualties, displacement, economic).

All three reuse the existing `callOpenRouter` + `aiRateLimiter` + `auth` pattern in `backend/src/routes/aiNew.js`. New `requireKey()` helper returns **503** with `{"error":"AI service not configured"}` when `OPENROUTER_API_KEY` is unset.

FE: three new tool cards added to `frontend/src/pages/AINewTools.js` with sample presets, JSON-array and plain-text fields. The existing JWT-bearer flow via `services/api.js` is reused; 503 errors surface through the existing error toast/inline banner.

Files touched:
- `backend/src/routes/aiNew.js`
- `frontend/src/pages/AINewTools.js`

Syntax check: `node --check` (BE) PASS; Babel JSX parse (FE) PASS. All previous-backlog "mechanical, low-risk" items are now closed.

## Apply pass 5 (all backlog)

Three additive endpoints (mixed categories) appended to `backend/src/routes/aiNew.js`:

1. `POST /ai/social-media-monitoring` — **NEEDS-CREDS** (`TWITTER_BEARER_TOKEN`). Returns `503 {missing:"TWITTER_BEARER_TOKEN"}` when unset. When set, LLM triages caller-supplied sample posts (no live Twitter ingestion — would require SDK install).
2. `POST /ai/emergency-dispatch-packet` — **NEEDS-CREDS** (`EMERGENCY_DISPATCH_URL`, `EMERGENCY_DISPATCH_TOKEN`). Returns 503 + comma-joined missing list when either is unset. LLM produces a structured 911/FEMA/Red-Cross packet; no outbound HTTP performed.
3. `POST /ai/command-center-summary` — **PRODUCT-DECISION**: synchronous aggregation endpoint chosen over WebSocket-driven feed (latter would be a separate, larger refactor). Comment documents the choice.

All reuse existing `callOpenRouter` + `aiRateLimiter` + `auth` + `requireKey` pattern.

Files touched:
- `backend/src/routes/aiNew.js`

Syntax check: `node --check` PASS.

Smoke test: skipped — backend `node_modules` missing `helmet` (and likely other deps); `npm install` is forbidden by apply-pass policy. This is a pre-existing environment issue, not introduced by these changes. All edits are additive (new endpoints only) and pass syntax check.
