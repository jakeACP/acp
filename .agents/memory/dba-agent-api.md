---
name: DBA Agent API layer
description: election_races + race_candidates tables and agent gateway permissions for ClawMACHINE DBA agents
---

## What was built
- Two new Drizzle tables in `shared/schema.ts`: `electionRaces` and `raceCandidates` (appended at end of file)
- 15 storage methods in `server/storage.ts` under "DBA Election Races" and "DBA Race Candidates" sections
- 3 new agent permissions: `elections:read`, `candidates:read`, `candidates:write`
- New `dba` role in AGENT_ROLE_DEFAULTS with all 3 new perms + `elections:write` + `politicians:write` + `logs:read`
- 14 production agent routes + 9 sandbox mirrors added before the `app.all("/api/agent/sandbox/*", ...)` catch-all
- API docs at `docs/DBA_API.md`

## Key design decisions
- `normalizedName` auto-computed (lowercase, strip punctuation) to enable fuzzy dedup matching
- Upsert logic: try `externalId` first, then composite key (year+state+phase+officeTitle+district for races; normalizedName+year+state+officeTitle for candidates)
- `electionDate` and `sourceRetrievalDate` stored as `text` (ISO 8601 strings) to match existing schema convention (politicianProfiles uses text for termStart/termEnd)
- `filingStatus` enum: announced · filed · on_ballot · withdrawn · write_in · disqualified · unknown
- `electionPhase` enum: primary · general · special · runoff · unknown
- `jurisdictionLevel` enum: federal · state · county · municipal · school_board · judicial · township · district · special · unknown

## DB migration
`npm run db:push` fails in non-TTY shell (CI/pipes). Use this pattern instead:
```javascript
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query('CREATE TABLE IF NOT EXISTS ...' ).then(() => pool.end()).catch(e => { console.error(e.message); pool.end(); });
"
```

## Files changed
- `shared/schema.ts` — tables appended at EOF
- `server/storage.ts` — import line 4, IStorage interface (after listAgentLogs), DatabaseStorage class (before EOF)
- `server/routes.ts` — import line 34, AGENT_ROLE_DEFAULTS, agentPermissions array, agentPermissionLabels, DBA routes block before sandbox catch-all
- `docs/DBA_API.md` — new API reference
