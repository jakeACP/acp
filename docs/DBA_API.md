# ACP Agent API — DBA Reference

**Version:** 1.0  
**Audience:** ClawMACHINE DBA agents (Dan Adams, Fiona Gallagher)  
**Auth header:** `X-Agent-Key: acp_agent_<key>`  
**Role:** `dba`  
**Base URL:** `https://<your-domain>`

---

## Overview

The DBA API layer lets database agents search, compare, verify, create, and update candidate and election records.  It supports every Minnesota race level: primary, statewide, congressional, state legislative, county, municipal, school-board, judicial, township, district, and special elections.

All responses use the standard ACP agent envelope:

```json
{
  "success": true,
  "action": "candidates:read",
  "data": { ... },
  "errors": [],
  "meta": {
    "timestamp": "2026-07-15T18:00:00.000Z",
    "rate_limit_remaining": 97,
    "sandbox": false
  }
}
```

---

## Authentication

Generate a DBA key from the admin panel at `/admin/agentic-ai`.  Select role `dba` — it comes pre-loaded with:

| Permission | What it allows |
|---|---|
| `candidates:read` | Search, get, and compare race candidates |
| `candidates:write` | Create, update, and upsert race candidates |
| `elections:read` | Search and get election races |
| `elections:write` | Create, update, and upsert election races |
| `politicians:write` | Import/update existing politician profiles |
| `logs:read` | Read this key's own activity log |

Pass the key in every request:

```
X-Agent-Key: acp_agent_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Sandbox mode

Prefix any path with `/api/agent/sandbox/` to validate input without writing to the database.  The response will include `"sandbox": true` and a `"wouldCreate"` or `"wouldUpdate"` preview of the payload that would be applied.

---

## Election Races

An **election race** represents one ballot contest: a specific office, jurisdiction, phase, and year.

### Field reference

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | Auto-generated |
| `year` | integer | e.g. `2026` |
| `electionDate` | string | ISO 8601: `"2026-08-11"` |
| `state` | string (2) | `"MN"` |
| `phase` | enum | `primary` `general` `special` `runoff` `unknown` |
| `jurisdictionLevel` | enum | `federal` `state` `county` `municipal` `school_board` `judicial` `township` `district` `special` `unknown` |
| `jurisdictionName` | string | e.g. `"Hennepin County"` |
| `county` | string | |
| `municipality` | string | |
| `district` | string | |
| `officeTitle` | string | e.g. `"State Senator — District 62"` |
| `externalId` | string | SoS race ID or other external key |
| `sourceUrl` | string | |
| `sourceName` | string | e.g. `"MN Secretary of State"` |
| `notes` | string | |
| `createdAt` / `updatedAt` | timestamp | |

---

### `GET /api/agent/elections/search`

Search election races.  All parameters are optional.

**Query params:**

| Param | Type | Example |
|---|---|---|
| `state` | string | `MN` |
| `year` | integer | `2026` |
| `phase` | enum | `primary` |
| `jurisdictionLevel` | enum | `county` |
| `county` | string | partial match |
| `municipality` | string | partial match |
| `district` | string | partial match |
| `officeTitle` | string | partial match |
| `externalId` | string | exact match |
| `limit` | integer | default `50`, max `200` |
| `offset` | integer | default `0` |

**Example:**
```
GET /api/agent/elections/search?state=MN&year=2026&phase=primary&jurisdictionLevel=state
```

**Response:**
```json
{
  "success": true,
  "action": "elections:read",
  "data": {
    "races": [ { "id": "...", "year": 2026, "state": "MN", ... } ],
    "pagination": { "limit": 50, "offset": 0, "hasMore": false }
  }
}
```

---

### `GET /api/agent/elections/:id`

Fetch a single race by ID.

```
GET /api/agent/elections/550e8400-e29b-41d4-a716-446655440000
```

---

### `POST /api/agent/elections/create`

Create a new election race.

**Body:** Election race fields (see field reference above).  `year` and `state` are required.

```json
{
  "year": 2026,
  "state": "MN",
  "phase": "primary",
  "jurisdictionLevel": "state",
  "officeTitle": "State Senator — District 62",
  "district": "62",
  "electionDate": "2026-08-11",
  "sourceName": "MN Secretary of State",
  "sourceUrl": "https://www.sos.state.mn.us/elections-voting/2026-elections/",
  "externalId": "MN-SEN-2026-62-P"
}
```

Returns `201` with the created race.

---

### `PUT /api/agent/elections/:id`

Update an existing race.  Send only the fields to change.

```json
{ "electionDate": "2026-08-11", "notes": "Date confirmed by SoS." }
```

---

### `POST /api/agent/elections/upsert`

Create-or-update.  Matches by `externalId` first; if not found, matches by `year + state + phase + officeTitle + district + municipality`.  If still no match, creates a new record.

Returns `200` with `{ "race": {...}, "created": true|false }`.

---

## Race Candidates

A **race candidate** is a person running in a specific race with full source-tracking metadata.

### Field reference

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | Auto-generated |
| `electionRaceId` | string (UUID) | FK → `election_races.id` (optional) |
| `fullName` | string | Required |
| `normalizedName` | string | Auto-computed (lowercase, stripped punctuation) |
| `state` | string (2) | Required, e.g. `"MN"` |
| `county` | string | |
| `municipality` | string | |
| `district` | string | |
| `officeTitle` | string | Required |
| `electionYear` | integer | Required |
| `electionDate` | string | ISO 8601 |
| `electionPhase` | enum | `primary` `general` `special` `runoff` `unknown` |
| `party` | string | `"DFL"` `"Republican"` `"Independent"` etc. |
| `isNonpartisan` | boolean | Default `false` |
| `filingStatus` | enum | `announced` `filed` `on_ballot` `withdrawn` `write_in` `disqualified` `unknown` |
| `sourceUrl` | string | |
| `sourceName` | string | |
| `sourceRetrievalDate` | string | ISO 8601 date |
| `externalId` | string | SoS ID, BallotPedia ID, FEC ID, etc. |
| `politicianProfileId` | string (UUID) | Link to existing ACP politician profile (optional) |
| `notes` | string | |
| `createdAt` / `updatedAt` | timestamp | |

**`electionPhase` values:** `primary` · `general` · `special` · `runoff` · `unknown`

**`filingStatus` values:** `announced` · `filed` · `on_ballot` · `withdrawn` · `write_in` · `disqualified` · `unknown`

---

### `GET /api/agent/candidates/search`

Search race candidates.  All parameters optional.

**Query params:**

| Param | Type | Example |
|---|---|---|
| `state` | string | `MN` |
| `electionYear` | integer | `2026` |
| `electionPhase` | enum | `primary` |
| `officeTitle` | string | partial match |
| `party` | string | partial match |
| `filingStatus` | enum | `on_ballot` |
| `county` | string | partial match |
| `municipality` | string | partial match |
| `district` | string | partial match |
| `normalizedName` | string | partial match on normalized name |
| `electionRaceId` | string | exact match |
| `politicianProfileId` | string | exact match |
| `externalId` | string | exact match |
| `limit` | integer | default `50`, max `200` |
| `offset` | integer | default `0` |

**Example — all filed primary candidates for MN State Senate 2026:**
```
GET /api/agent/candidates/search?state=MN&electionYear=2026&electionPhase=primary&officeTitle=State+Senator&filingStatus=filed
```

---

### `GET /api/agent/candidates/:id`

Fetch a single candidate record by ID.

---

### `POST /api/agent/candidates/create`

Create a new race candidate record.

```json
{
  "fullName": "Jane Smith",
  "state": "MN",
  "officeTitle": "State Representative — District 43A",
  "electionYear": 2026,
  "electionPhase": "primary",
  "district": "43A",
  "party": "DFL",
  "filingStatus": "filed",
  "sourceName": "MN Secretary of State",
  "sourceUrl": "https://www.sos.state.mn.us/candidate/...",
  "sourceRetrievalDate": "2026-07-15",
  "externalId": "MN-SOS-2026-43A-JSMITH"
}
```

Returns `201` with the created candidate (including auto-computed `normalizedName`).

---

### `PUT /api/agent/candidates/:id`

Update an existing candidate record.  Send only the fields to change.

```json
{ "filingStatus": "on_ballot", "notes": "Verified on official ballot as of 2026-07-10." }
```

---

### `POST /api/agent/candidates/upsert`

Create-or-update.  Matches by `externalId` first; if not found, matches by `normalizedName + electionYear + state + officeTitle` (+ `electionRaceId` if provided).  Creates if no match.

Returns `200` with `{ "candidate": {...}, "created": true|false }`.

---

### `POST /api/agent/candidates/compare`

Compare two candidates side-by-side.  Useful for deduplication.

**Body:**
```json
{ "idA": "uuid-a", "idB": "uuid-b" }
```
— or by name/year/state/office:
```json
{
  "a": { "normalizedName": "jane smith", "electionYear": 2026, "state": "MN", "officeTitle": "State Representative — District 43A" },
  "b": { "externalId": "MN-SOS-2026-43A-JSMITH" }
}
```

**Response:**
```json
{
  "success": true,
  "action": "candidates:read",
  "data": {
    "candidateA": { ... },
    "candidateB": { ... },
    "diff": {
      "party": { "a": "DFL", "b": "Democratic-Farmer-Labor" },
      "filingStatus": { "a": "filed", "b": "on_ballot" }
    },
    "likelySamePerson": true
  }
}
```

---

## Offices (Political Positions)

These endpoints expose the existing `political_positions` table used by ACP politician profiles.

### `GET /api/agent/offices/search`

**Query params:** `level` · `jurisdiction` · `title` (partial) · `district` · `isElected` · `limit` · `offset`

```
GET /api/agent/offices/search?level=state&jurisdiction=Minnesota
```

---

### `POST /api/agent/offices/create`

Create a new political position record.

```json
{
  "title": "State Senator — District 62",
  "officeType": "Legislative",
  "level": "state",
  "jurisdiction": "Minnesota",
  "district": "62",
  "termLength": 4,
  "isElected": true
}
```

---

## Error codes

| HTTP | `success` | Meaning |
|---|---|---|
| `200` | `true` | OK |
| `201` | `true` | Created |
| `400` | `false` | Validation error — see `errors[].details` |
| `401` | `false` | Missing or invalid `X-Agent-Key` |
| `403` | `false` | Key lacks required permission |
| `404` | `false` | Record not found |
| `429` | `false` | Rate limit exceeded — see `Retry-After` header |
| `500` | `false` | Internal error |

---

## Rate limits

Default DBA key: **100 requests / hour**.  Admins can raise this to 5,000/hr in the Agent Keys panel.  Remaining requests are returned in every response as `meta.rate_limit_remaining`.

---

## Supported Minnesota jurisdiction levels

| `jurisdictionLevel` | Examples |
|---|---|
| `federal` | U.S. Senate, U.S. House |
| `state` | Governor, State Senate, State House |
| `county` | County Commissioner, County Attorney |
| `municipal` | Mayor, City Council |
| `school_board` | School Board Member |
| `judicial` | District Court Judge, Court of Appeals |
| `township` | Town Board |
| `district` | Soil & Water, Hospital District |
| `special` | Special election at any level |

---

## Changelog

| Date | Change |
|---|---|
| 2026-07-15 | Initial DBA API layer — `election_races`, `race_candidates`, offices search |
