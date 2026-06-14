# ⚽ World Cup 2026 — Prediction League

A full-stack web app that replaces the Excel-based FIFA World Cup prediction game.
Players log in, enter score predictions for every match, pick a champion and the
teams they think will reach the knockouts. The admin enters real results and the
leaderboard, points, prize table and scoring breakdown update automatically.

Built with **Next.js (App Router) + TypeScript**, **Tailwind CSS**, **Prisma**,
and **SQLite** (swap to PostgreSQL with one line). Scoring lives in a pure,
unit-tested TypeScript engine — no Excel formulas at runtime.

---

## Features

- 🔐 Email/password login with `PLAYER` and `ADMIN` roles (JWT session cookie, bcrypt hashes)
- 📝 **Self-registration** at `/register` (admin can toggle registration open/closed)
- 🏟️ Group-stage, knockout, champion and knockout-team predictions
- ⏱️ **Per-match lock**: score predictions lock **1 hour before kickoff** (configurable in admin settings)
- 👥 **Match Arena** (`/matches/[id]`): crowd consensus, score heatmap, soulmates & contrarians — click **👥 Crowd** on any fixture
- 🧮 Pure scoring engine with full unit tests (group, knockout, extra time, penalties, qualifiers, champion, tie-breakers, prizes)
- 🏆 Automatic leaderboard with tie-breakers and a prize table
- ⏰ Admin-editable per-phase deadlines with locking, override and reopen
- 👀 Visibility: competitors' picks unlock **1 hour before kickoff** (admin always sees all)
- 🛠️ Admin console: results entry, **user name/password management**, paid status, teams/qualifiers/champion, fixtures, deadlines, settings, JSON export, recalculation
- 📊 Real World Cup 2026 scores applied on seed (see `src/lib/wc-results.ts`)
- 📥 Seed/import script that reads the provided Excel workbook
- 🎨 Dark, stadium-style responsive UI (glass cards, pitch accents, scoreboard inputs)

---

## Quick start

> Requirements: **Node.js 18.18+** (tested on Node 22) and npm.

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env
# (the defaults work out of the box for local development)

# 3. Apply the database migration and seed data from the Excel workbook
npm run setup

# 4. Start the dev server
npm run dev
```

Open http://localhost:3000 and sign in — or **register** at `/register` if registration is open.

### Seeded login credentials

| Role   | Username               | Password      |
| ------ | ---------------------- | ------------- |
| Admin  | `admin.[blank]`        | `admin123`    |
| Player | `henrik.[blank]`       | `password123` |

**All seeded players** use the password `password123`. Usernames are
`firstname.lastname` (or `firstname.[blank]` when no surname is on file):

```
abel.[blank], aleksandr.[blank], henrik.[blank], tigran.tsh.[blank], …
```

> ⚠️ These are development-only credentials. Change `AUTH_SECRET` and all
> passwords before deploying anything publicly.

---

## Environment variables (`.env`)

| Variable      | Description                                                        | Default                      |
| ------------- | ----------------------------------------------------------------- | ---------------------------- |
| `DATABASE_URL`| Prisma connection string (SQLite file for local dev)              | `file:./dev.db`              |
| `AUTH_SECRET` | Secret used to sign session JWTs — use a long random string       | dev placeholder              |
| `TZ`          | Default timezone (the league runs on Asia/Yerevan, UTC+4)         | `Asia/Yerevan`               |

---

## npm scripts

| Script               | What it does                                                    |
| -------------------- | -------------------------------------------------------------- |
| `npm run dev`        | Start the Next.js dev server (http://localhost:3000)           |
| `npm run setup`      | Generate client, apply migrations, seed from the workbook      |
| `npm run db:seed`    | Re-run the seed/import script                                   |
| `npm run db:reset`   | Drop, re-migrate and re-seed the database                       |
| `npm run prisma:migrate` | Create/apply a new dev migration                           |
| `npm run build`      | Production build (`prisma generate` + `next build`)            |
| `npm start`          | Run the production server (after `build`)                       |
| `npm test`           | Run the scoring unit tests (Vitest)                            |
| `npm run lint`       | Run ESLint                                                      |

---

## Running tests

```bash
npm test
```

The scoring engine (`src/lib/scoring.ts`) is covered by `src/lib/scoring.test.ts`
— 21 tests covering outcomes, complicated scores, exact hits, extra time,
penalties, knockout aggregates, team picks, champion points, tie-breakers and
prize allocation.

---

## Importing / seeding from Excel

The seed script reads the admin workbook at
`data/2026-WC-database-group-scores.xlsx` and imports:

- **Players** from the `Names` sheet (+ anyone with predictions)
- **Teams & groups** from the `Group Stage` fixtures (4 teams per group, 12 groups)
- **72 group-stage fixtures** (`Group Stage` rows 4–75), with dates shifted to the
  2026 edition and combined with the kickoff time in Asia/Yerevan
- **Every player's group-stage predictions** from the per-player columns
- **ToR defaults**: 10,000 AMD fee and the 40/20/15/10/7/5/3% prize split

It also creates an admin account, the full **FIFA knockout bracket** (matches 73–104,
Round of 32 through Final) and **open deadlines** for every phase. On each seed run,
actual scores from `src/lib/wc-results.ts` are applied to played fixtures.

To re-import:

```bash
npm run db:seed     # wipes game data and re-imports
```

To add new real-world results, edit `src/lib/wc-results.ts` and re-seed (or enter
them in **Admin → Results**).

If the workbook is missing, the seed falls back to a built-in dataset (same teams,
players and generated fixtures) so setup never fails.

A full **JSON backup** of all data is available to admins at
`/api/admin/export` (also linked from the admin console).

---

## How it works

### Scoring rules (implemented in `src/lib/scoring.ts`)

**Group stage & knockout normal time**

| Result                                   | Points |
| ---------------------------------------- | ------ |
| Actual score missing / wrong outcome     | 0      |
| Correct outcome (1 / X / 2)              | 3      |
| Exact score                              | 5      |
| Exact "complicated" score                | 6      |

A score is **complicated** when total goals ≥ 4 **or** the goal difference ≥ 3
(e.g. `3–0`, `2–2`, `4–1`).

**Extra time & penalties** (knockout): 0 wrong / 1 correct outcome / 2 exact.

**Knockout qualifier bonus**: +1 for predicting the team that advances (from the
aggregate of normal + extra time, then penalties). A prediction can't leave the
advancing team ambiguous.

**Team picks**: +2 per correctly-picked knockout-qualified team.
**Champion**: +8 if your champion wins.

### Leaderboard & tie-breakers

Total = group points + knockout-team points + knockout-stage points + champion
points. Ties are broken by: more exact scores → more complicated scores → more
correct outcomes → alphabetical (deterministic).

### Prizes

`pool = entryFee × (paid players)`, split by configurable rank percentages
(default 40/20/15/10/7/5/3%). Admin sets paid status, fee and percentages.

### Deadlines & visibility

**Match predictions** lock **1 hour before kickoff** (default; change in Admin → Settings).
Phase deadlines still apply as an additional ceiling for champion and team picks.

Competitors' score predictions become visible once the kickoff lock hits (1 hour
before the match). Until then, the Match Arena shows a teaser (how many picks are in).
Admins always see everything.

Each phase also has an admin-editable lock time and open flag. The admin can force-lock
or reopen phases.

---

## Project structure

```
prisma/
  schema.prisma        # data model (User, Tournament, Team, Match, ActualResult,
                       #   Prediction, TeamPick, ActualTeamStatus, Deadline, AuditLog)
  seed.ts              # seed/import entrypoint
  import.ts            # Excel parsing (kept out of the Next.js bundle)
src/
  lib/
    scoring.ts         # pure scoring engine (unit-tested)
    scoring.test.ts    # Vitest tests
    standings.ts       # DB -> scoring -> leaderboard
    deadlines.ts       # phase/lock helpers
    auth.ts            # bcrypt + JWT sessions, role guards
    constants.ts       # phases, rounds, point values, defaults
  app/
    login/             # login page
    (app)/
      dashboard/       # player dashboard
      predictions/     # group / knockout / champion / team picks
      leaderboard/     # rankings + prize table
      matches/[id]/    # match comparison
      admin/           # admin console (results, users, teams, fixtures, deadlines, settings)
    actions/           # server actions (auth, predictions, admin)
    api/admin/export/  # JSON backup route
  components/          # UI kit + feature components
  middleware.ts        # route protection (auth + admin)
```

---

## Moving to PostgreSQL

1. In `prisma/schema.prisma`, change the datasource `provider` to `"postgresql"`.
2. Set `DATABASE_URL` to your Postgres connection string.
3. Run `npx prisma migrate dev` to create fresh migrations, then `npm run db:seed`.

The app code, scoring and queries are database-agnostic.

---

## Admin workflow

1. **Players** → mark who has paid (drives the prize pool).
2. **Settings** → adjust fee, prize split and knockout pick count.
3. **Deadlines** → set lock times per phase (or reopen a phase).
4. **Results** → enter scores, tick *Finalized* and Save → points recalculate.
5. **Teams** → mark knockout qualifiers and the champion as the tournament unfolds.
6. **Fixtures** → add knockout matches (with real teams or seed placeholders).
7. **Export** → download a JSON backup anytime.

---

## Deploy on Render (copa.team)

This app uses **SQLite**, so you need a **Starter** web service with a **persistent disk** (~$7/month). The repo includes a `render.yaml` blueprint.

### Quick deploy

1. Push the repo to GitHub (`henriksergoyan/worldup-2026`).
2. Go to [render.com](https://render.com) → **New** → **Blueprint**.
3. Connect the repo — Render reads `render.yaml` automatically.
4. Approve the blueprint (Starter plan + 1 GB disk).
5. After the first deploy succeeds, open the service **Shell** and run once:
   ```bash
   npm run db:seed
   ```
6. **Settings → Custom Domains** → add `worldcup2026.copa.team`.
7. In **Namecheap → Advanced DNS** for `copa.team`:

| Type | Host | Value |
|------|------|--------|
| **CNAME** | `worldcup2026` | your `*.onrender.com` hostname from Render |

No changes needed at the root `@` — only this subdomain is used.

### Manual setup (without blueprint)

| Setting | Value |
| -------- | ----- |
| Type | Web Service |
| Runtime | Node |
| Plan | Starter |
| Build | `npm install && npm run build` |
| Start | `npx prisma migrate deploy && npm start` |
| Disk mount | `/var/data` (1 GB) |
| `DATABASE_URL` | `file:/var/data/copa.db` |
| `AUTH_SECRET` | long random string |
| `TZ` | `Asia/Yerevan` |

### After go-live

1. Change the admin password (`admin.[blank]`).
2. Disable registration in Admin → Settings when all players have joined.
3. Export JSON backups periodically from the admin console.
4. **Never run `npm run db:seed` on Render after go-live** — it wipes all predictions. Redeploys are safe; data lives on the disk at `file:/var/data/copa.db`.
5. In **Admin → Recalculate**, sync Excel deadlines, apply web-known scores, and fill the knockout bracket automatically.
