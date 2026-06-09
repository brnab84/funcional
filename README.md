# Functional WOD / Swim Session

Multi-sport workout generator SaaS. Two disciplines (Functional & Swimming) with intelligent, self-improving workout generation.

## Stack

- **Backend**: Node.js + Express + MongoDB (Mongoose)
- **Frontend**: Vanilla JS PWA (no framework)
- **AI**: Anthropic Claude API
- **Deploy**: Railway (auto-deploy from `main`)

## Architecture

```
backend/
  server.js              Express app, security middleware, static serving
  generator.js           Functional workout algorithm
  swim-generator.js      Swimming workout algorithm (zone-based: A1/A2/A3)
  models/
    User.js              Auth, settings (theme, pool length, rest times)
    Workout.js           Workouts with source tracking
    ExerciseLibrary.js   Per-user, per-sport exercises
    TrainingStats.js     Self-learning frequency data
  routes/
    auth.js              Register, login, settings, password reset
    workouts.js          CRUD, regenerate, approve (+learn), import
    exercises.js         CRUD, seed defaults per sport
    upload.js            Photo/text -> AI -> structured workout
  middleware/
    auth.js              JWT verification
  utils/
    asyncHandler.js      Async error wrapper
    ApiError.js          Structured HTTP errors
    constants.js         Sport categories/modalities
frontend/
  index.html, landing.html, sw.js, manifest.json
  css/   base.css, components.css, responsive.css
  js/    state, session, ui, theme, api, auth, render, today, manual,
         import, edit, history, library, settings, admin, coach, assigned, main
```

## Key Concepts

### Per-sport data isolation
Every exercise, workout, and stat is keyed by `{ user, sport }`. Functional and swimming never mix.

### Intelligent generation
On each approval, `TrainingStats` records exercise/modality/category/pattern frequencies. Generators weight selection by these frequencies, so the more a user approves, the more personalized generation becomes. AI-approved workouts also feed the local algorithm.

### Workout sources
`local` (algorithm), `ai` (Claude), `manual` (user-built), `imported` (photo/text parsed by AI).

## Environment Variables

See `.env.example`. Required: `MONGO_URI`, `JWT_SECRET`. Optional: `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `PORT`.

## API Endpoints

### Auth (`/api/auth`)
- `POST /register` — create account
- `POST /login` — returns JWT
- `GET /me` — current user
- `PUT /settings` — update preferences
- `POST /reset-password` — reset password
- `POST /add-sport` — enable a sport

### Workouts (`/api/workouts`)
- `GET /today?sport=` — today's suggestions (read-only)
- `POST /regenerate` — generate 3 new options
- `PUT /:id/approve` — approve + update learning stats
- `PUT /:id/reject` — reject suggestion
- `PUT /:id/edit` — edit workout
- `POST /manual` — create manually (accepts source)
- `GET /history?sport=` — approved history (paginated)
- `DELETE /:id` — delete
- `POST /ai` — AI-generated variant
- `GET /learning?sport=` — view learning data

### Exercises (`/api/exercises`)
- `GET /?sport=` — list exercises
- `GET /categories?sport=` — categories
- `POST /seed` — seed defaults (nuclear: wipes + recreates per sport)
- `POST /` — add exercise
- `DELETE /:id` — remove

### Upload (`/api/upload`)
- `POST /photo` — extract exercises from image to library
- `POST /import` — parse photo/text into structured workout

## Security

- `helmet` for HTTP headers
- `express-rate-limit`: 300 req/15min general, 20 req/15min for auth
- JWT auth on all data endpoints
- bcrypt password hashing

## Versioning

Version lives in `package.json` (single source of truth). Server injects `?v=VERSION` into asset URLs for cache-busting. Frontend forces reload + logout on version change.
