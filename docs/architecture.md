# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision:
  Implement the React route components using the shared API client and preserve the existing routing structure. Each page should provide consistent loading, empty-state, and accessible error-state handling while keeping API calls outside UI components whenever possible.

- Logic tier decision:
  Implement missing business logic in `octofitService.ts` and keep route handlers thin. Validation, leaderboard calculations, workout recommendation rules, and domain-specific behavior should reside in the service layer.

- Data tier decision:
  Add and enforce required Mongoose schema validation for Users, Teams, Activities, and Workouts. Preserve the existing model relationships and seed behavior while ensuring invalid documents are rejected before persistence.

- Activity tracking approach:
  Validate submitted user and team identifiers before creating activities. Reject invalid or non-existent references with deliberate 4xx responses and calculate derived fields such as points and occurredAt during activity creation.

- Team management approach:
  Allow creation and retrieval of teams while enforcing required team names. Team creation should return a 400 response for invalid requests rather than allowing database or cast errors to surface.

- Leaderboard approach:
  Aggregate activity points by team, sort teams by total points in descending order, and generate a 1-based rank field for each leaderboard entry.

- Workout suggestions approach:
  Generate recommendations using the selected user's goal and recent activity history. Ensure suggestions are personalized to the requested user and return an appropriate 4xx response when no matching user exists.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
  - Expected baseline: validation-related failures for User, Team, Activity, and Workout models.
  - Success criteria: required-field validation passes while existing seed behavior remains unchanged.

- API command: `npm run test:api --prefix octofit-tracker/backend`
  - Expected baseline: failures in activity creation, team creation, leaderboard generation, and workout suggestion behavior.
  - Success criteria: endpoints return expected responses, validation errors produce deliberate 4xx status codes, and leaderboard and recommendation results match contract requirements.

- Frontend command: `npm test --prefix octofit-tracker/frontend`
  - Expected baseline: route components display placeholder content and fail rendering assertions.
  - Success criteria: all views render correctly and support loading, empty, and error states using the shared API client.

- Backend build command: `npm run build --prefix octofit-tracker/backend`
  - Success criteria: TypeScript compilation completes with no build errors.

- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
  - Success criteria: Vite production build completes successfully with no build errors.
