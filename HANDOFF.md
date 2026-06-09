# HANDOFF — Functional WOD / Swim Session

> Multi-sport workout generator SaaS. Production app with active users. Last session: clean-code refactor + admin module. Current version: **v7.7.0**

## Quick Facts

- **Production URL**: `funcional-production.up.railway.app`
- **Repo**: `github.com/brnab84/funcional`
- **Deploy**: Railway auto-deploys from `main`. Workflow: write code → upload via GitHub REST API → Railway redeploys.
- **Stack**: Node.js + Express + MongoDB (Mongoose) + Vanilla JS PWA + Anthropic Claude API
- **Admin/root account**: `brnab84@gmail.com` (auto-granted `admin` role on login; configurable via `ADMIN_EMAIL` env)
- **CI**: GitHub Actions runs tests on every push to `main`

## Railway Environment Variables

```
MONGO_URI = mongodb+srv://funtional:ajo2323@cluster0.anapkyj.mongodb.net/funcional-workouts?appName=Cluster0
JWT_SECRET = FuncionalWOD2024_SecretKey_MinLength32chars
ANTHROPIC_API_KEY = (set in Railway)
CLAUDE_MODEL = (optional; defaults to claude-haiku-4-5-20251001)
ADMIN_EMAIL = brnab84@gmail.com (optional; defaults to this)
PORT = 3000
```

## Two Disciplines (NEVER mix)

| | Functional (⚡ yellow) | Swimming (🏊 cyan) |
|---|---|---|
| Categories | lower, upper, core, conditioning, power | stroke, kick, drill, pull, sprint, endurance, rest |
| Modalities | EMOM, OTM, AMRAP, ROUNDS, FOR TIME, TABATA | A1-A2, A2-A3, A3 SPRINT, A3 QUEBRADO, TECHNIQUE, ENDURANCE, PROGRESSIVE, DESCENDING, INTERVALS, RECOVERY |
| Generator | `backend/generator.js` | `backend/swim-generator.js` |

All data keyed by `{ user, sport }`. Single source of truth for these constants: `backend/utils/constants.js`.

## Architecture

```
backend/
  server.js              Express, helmet, rate-limit, env validation, error handler, version injection
  generator.js           Functional algorithm (smartPick weights exercises by approval freq)
  swim-generator.js      Swimming algorithm (zone-based A1/A2/A3, pool-size aware, real coaching patterns)
  models/
    User.js              auth, settings (theme, poolLength, swimRestTimes, blockCount), role, lastLogin, loginCount
    Workout.js           source enum: ['ai','local','manual','imported']
    ExerciseLibrary.js   per-user per-sport exercises
    TrainingStats.js     self-learning frequency maps (exercise/modality/category/pattern/reps)
    LoginActivity.js     login event log (admin monitoring)
  routes/
    auth.js              register/login(+tracking+admin grant)/me/settings/reset/add-sport
    workouts.js          today/regenerate/approve(+learn)/reject/edit/manual/history/delete/ai/learning
    exercises.js         list/categories/seed(nuclear per sport)/add/delete
    upload.js            photo(->library) / import(photo|text -> AI -> structured workout)
    admin.js             stats/users/activity (role=admin only)
  middleware/
    auth.js              JWT verification
    admin.js             role=admin guard
  utils/
    asyncHandler.js, ApiError.js, constants.js
frontend/
  index.html
  css/  base.css, components.css, responsive.css   (loaded in order, cascade preserved)
  js/   state, session, ui, theme, api, auth, render, today, manual, import, edit, history, library, settings, admin, main
        (16 files loaded in order, shared global scope — onclick handlers depend on this)
  sw.js, manifest.json
tests/  generator.test.js, swim-generator.test.js, constants.test.js  (13 tests, node --test)
.github/workflows/ci.yml   runs npm test + frontend syntax validation
```

## Key Systems

### Intelligent generation (self-learning)
On every approve, `TrainingStats` records frequency of exercises/modalities/categories/patterns/reps per user+sport. Generators weight selection by these frequencies. AI-approved workouts also feed the local algorithm. More approvals → more personalized. The `stats` object flows: workouts.js regenerate → loads TrainingStats → passes to generator → `smartPick()` (functional) / session-type weighting (swimming).

### Swimming generator (v7, coaching-based)
Session types: A1-A2, A1-A3, A2-A3, Técnica-Velocidad, A1-A2-A3, Endurance, Técnica. Uses real patterns from Bernardo's coach: progressive sets (1->4), broken sets (QUEBRADO), fins/paddles/snorkel, send-off times (c/1:10), always ends with recovery. All distances are multiples of pool length (25m/50m setting). Total meters calculated and displayed.

### Import (photo/text -> workout)
`/api/upload/import` sends photo or text to Claude with sport-specific parsing rules (swimming notation explained: "4x"=repeat block, "cada 1:10"=send-off, A1/A2/A3 zones, Aletas/Manoplas). Returns structured workout. Frontend shows preview before saving. Source tagged `imported`.

### Workout sources (badges shown top of card)
`local` (no badge), `ai` (yellow "AI Generated"), `manual` (blue), `imported` (green).

### Admin module (v7.7.0)
`/api/admin/stats|users|activity`, role=admin only. Login tracking (lastLogin, loginCount, LoginActivity log). brnab84@gmail.com auto-granted admin on login. Frontend: 📊 Admin nav (hidden for non-admins) -> dashboard with stats cards, recent logins, all accounts.

## Versioning & Cache Busting

Version in `package.json` is single source of truth. Server injects `?v=VERSION` into all `/js/*.js` and `/css/*.js` URLs. Static files served with no-cache headers. Frontend: on version change -> force logout + clear caches + reload. Session timeout: 5 min inactivity -> logout.

## Safety Discipline (IMPORTANT)

- A function `loadToday` was once accidentally deleted during a patch -> app hung forever. Now there's a validator: before every `app.js`-style frontend upload, run a check for syntax + presence of critical functions + min file size. Prefer commenting out code over deleting.
- When splitting files, verify concatenation is byte-for-byte identical to the original.
- Validate JS syntax (`node -c`) before every upload.
- Production has active users — test before applying, never break.

## Clean Code Status (completed this session)

✅ helmet + rate limiting (300/15min general, 20/15min auth)
✅ env validation + centralized error handler
✅ ESLint config, .gitignore, .env.example
✅ shared utils (asyncHandler, ApiError, constants)
✅ README + API docs
✅ frontend modularized (16 JS files)
✅ CSS modularized (3 files)
✅ 13 tests passing (node --test)
✅ CI/CD (GitHub Actions)
✅ admin module

## Known Issues / Pending

- Minor behavior issue mentioned by user, not yet diagnosed (needs more testing in production).
- Generators use hardcoded English exercise names in some swim templates mixed with Spanish — could standardize.
- No TypeScript yet (optional future).
- Test coverage is for pure logic only (generators, constants); no integration/DB tests.
- Inline onclick handlers throughout frontend — modular JS works because all files share global scope (NOT ES6 modules). Keep this in mind: do not convert to `type="module"` without exposing handlers to `window`.

## GitHub Token Note

Classic token with `repo` scope required for writes. Fine-grained tokens (github_pat_) need explicit Contents:Read-write AND Workflows:Read-write permissions. Several tokens were exposed in chat this session and should be rotated.

## Preferences (Bernardo)

Spanish, concise/direct. Wants production stability (SaaS, no acceptable bugs). Wants Claude to handle code + git autonomously. Prefers commenting out over deleting code. Wants genuinely intelligent self-improving algorithm fed by both AI and user behavior, separate per discipline.
