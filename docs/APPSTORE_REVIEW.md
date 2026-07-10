# ACP Democracy — App Store Review Compliance

**App ID**: com.acp.democracy  
**Platform**: iOS (Capacitor)  
**Status legend**: ✅ Compliant · ⚠️ Needs Action · ❌ Blocking · 📝 Documentation required

---

## Guideline 1 — Safety

### 1.1 Objectionable Content
| Item | Status | Implementation |
|------|--------|----------------|
| Profanity filter on UGC (posts, comments, captions) | ⚠️ Needs Action | Moderation queue exists; add automated filter or manual review SLA |
| No graphic violence / explicit content | ✅ | Political content platform; community guidelines restrict this |
| Community guidelines published | ✅ | Accessible at `/terms` |

### 1.2 User-Generated Content
| Item | Status | Implementation |
|------|--------|----------------|
| Report mechanism on every piece of UGC | ✅ | 3-dot menu → Report on all posts, signals, and comments |
| Block user feature | ✅ | `POST /api/user/block/:id` · Settings → Privacy & Blocked |
| Mute user feature | ✅ | `POST /api/user/mute/:id` |
| Moderation review queue | ✅ | `/admin/flagged-content` admin panel |
| Response to reports within 24 h | 📝 | Define SLA in App Review Information notes |

### 1.5 Developer Information
| Item | Status | Implementation |
|------|--------|----------------|
| Support URL | ✅ | Set in App Store Connect |
| Privacy Policy URL | ✅ | `/privacy` route |
| Contact email for App Review team | 📝 | Set in App Store Connect |

---

## Guideline 2 — Performance

### 2.1 App Completeness
| Item | Status | Implementation |
|------|--------|----------------|
| No placeholder / Lorem Ipsum content | ✅ | Real data from DB |
| All navigation paths functional | ✅ | Covered by TestFlight checklist |
| Demo credentials provided to reviewer | 📝 | Add in App Review Notes: `demo@acp.test` / `AcpDemo2024!` (create before submission) |

### 2.3 Accurate Metadata
| Item | Status | Implementation |
|------|--------|----------------|
| Screenshots match actual app | 📝 | Generate from TestFlight build |
| App description matches features | 📝 | Review against current feature set |

---

## Guideline 3 — Business

### 3.1.1 In-App Purchase
| Item | Status | Implementation |
|------|--------|----------------|
| Digital subscriptions use StoreKit | ✅ | `POST /api/subscriptions/apple/validate` + `apple_iap_transactions` table |
| Server-to-Server notifications configured | ✅ | `POST /api/subscriptions/apple/notify` (CSRF bypassed for Apple servers) |
| No external payment links shown to iOS users | ⚠️ Needs Action | Audit: ensure no Stripe payment links visible on iOS (Stripe is for web only) |
| Free tier available without payment | ✅ | Core civic features free; premium is optional |
| Subscription terms clearly described before purchase | 📝 | Add pricing & cancellation info to paywall screen |

### 3.2 Other Business Models
| Item | Status | Implementation |
|------|--------|----------------|
| Crowdfunding flows reviewed | ✅ | Political donations — not a digital good, IAP not required |

---

## Guideline 4 — Design

### 4.2 Minimum Functionality (no thin wrapper)
| Item | Status | Evidence |
|------|--------|---------|
| Native camera recording (multi-clip) | ✅ | `MobileSignalCamera.tsx` — Capacitor camera |
| Native push notifications | ✅ | FCM/APNs via `POST /api/push/register` |
| Offline caching | ✅ | TanStack Query `gcTime` + `refetchOnWindowFocus: false` |
| Native sharing | ✅ | Capacitor Share API on signal share button |
| Biometric auth (if 2FA enabled) | 📝 | Consider Face ID for 2FA confirmation |
| Not a simple website wrapper | ✅ | Camera, video compositing, offline cache, push, native navigation |

### 4.8 Sign in with Apple (REQUIRED — app offers third-party login)
| Item | Status | Implementation |
|------|--------|----------------|
| Sign in with Apple button present on login screen | ✅ | `AppleSignInButton` component in `auth-page.tsx` |
| Sign in with Apple button present on register screen | ✅ | Both login and register tabs |
| Backend strategy implemented | ✅ | `passport-apple` in `server/auth.ts` (guarded by `APPLE_*` env vars) |
| `apple_id` stored in users table | ⚠️ Needs Migration | Schema field added; run `npm run db:push` before submission |
| Callback route: `POST /auth/apple/callback` | ✅ | Uses POST (Apple requirement) |
| **Required secrets to configure** | ❌ Must Set | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` |

#### Apple Developer Console steps (one-time):
1. Create a **Services ID** (e.g., `com.acp.democracy.web`) — this is `APPLE_CLIENT_ID`
2. Enable **Sign in with Apple** on your App ID
3. Generate a **Sign in with Apple** private key (.p8 file) → `APPLE_PRIVATE_KEY`
4. Note your **Team ID** and **Key ID**
5. Add `https://<your-domain>/auth/apple/callback` as a Return URL in the Services ID config

---

## Guideline 5 — Legal

### 5.1.1 Privacy — Data Collection & Storage
| Item | Status | Implementation |
|------|--------|----------------|
| Privacy Policy accessible in-app | ✅ | Settings → Help → Privacy Policy → `/privacy` |
| Privacy Policy accessible before login | 📝 | Add link to auth screen footer |
| App Privacy labels filled in App Store Connect | 📝 | Complete Data Used to Track You / Data Linked to You sections |

#### Data types collected (for App Privacy labels):
| Data Type | Purpose | Linked to User |
|-----------|---------|----------------|
| Name, Email | Account creation | Yes |
| Profile photos / avatars | Profile display | Yes |
| User-generated posts/videos | Social features | Yes |
| Location (zip code only) | Rep lookup | Yes |
| Device token | Push notifications | Yes |
| IP address | Fraud prevention | Yes (logged, not shown) |
| Purchase history | Subscription | Yes |
| Political opinions (survey) | Platform features | Yes |

### 5.1.2 Privacy — Data Use & Sharing
| Item | Status | Implementation |
|------|--------|----------------|
| No data sold to third parties | ✅ | Platform policy |
| Data shared with Apple (IAP) | ✅ | Disclosed in privacy policy |
| Data shared with Stripe (web billing) | ✅ | Disclosed in privacy policy |

### 5.1.1 Data Deletion
| Item | Status | Implementation |
|------|--------|----------------|
| In-app account deletion | ✅ | Settings → Account → Delete Account → `DELETE /api/user` |
| Confirmation step required | ✅ | Must type "DELETE MY ACCOUNT" |
| User data anonymised on deletion | ✅ | username/email/PII fields zeroed in-place |
| Deletion takes effect immediately | ✅ | Session terminated on success |
| Deletion accessible without contacting support | ✅ | Self-serve in-app |

---

## Age Rating

Recommended rating: **17+** (Frequent/Intense Political Content)

| Content | Rating Reason |
|---------|--------------|
| Political discussions | May include mature themes |
| UGC (user videos/posts) | Cannot be fully moderated in advance |
| No adult sexual content | Restricted by community guidelines |
| No graphic violence | Restricted by community guidelines |

---

## Required Info for App Review Notes

Copy this block into **App Review Information → Notes** in App Store Connect:

```
Demo account for review:
  Username: acpreviewer
  Password: AcpReview2024!
  (Create this account before submission with citizen role)

The app is a civic democracy platform. Key features:
- Social feed with posts, polls, and short civic videos ("Signals")
- Politician corruption grading (uses public FEC data)
- In-app voting, petitions, and group organisation
- Subscription managed via StoreKit (in-app) and Stripe (web — not surfaced on iOS)

Sign in with Apple and Sign in with Google are both available on the login screen.

Account deletion is available at Settings → Account → Delete Account.
Content reporting is available via the 3-dot menu on any post, signal, or comment.

The app uses camera (signal recording) and microphone (signal audio) — permissions
are requested only when the Create Signal flow is initiated, not on launch.

No web browsing capability. Not a thin wrapper — includes native camera, video
compositing (FFmpeg server-side), offline caching, and push notifications.
```

---

## Pre-Submission Checklist

Run through this list before clicking "Submit for Review":

- [ ] All TestFlight checklist items marked ✅
- [ ] Demo account created with correct credentials
- [ ] `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` set in production env
- [ ] `npm run db:push` run to add `apple_id` column to production DB
- [ ] Sign in with Apple tested end-to-end on device
- [ ] Screenshots generated from TestFlight build (not simulator)
- [ ] App Privacy labels complete in App Store Connect
- [ ] Support URL and privacy policy URL set in App Store Connect
- [ ] Stripe payment flow **not** accessible from iOS app (web-only)
- [ ] Age rating set to 17+
- [ ] Export compliance: app uses HTTPS (standard) — no custom crypto → answer "No" to encryption question
- [ ] App Review Notes populated (see above)
- [ ] TestFlight external review passed with ≥ 3 testers
