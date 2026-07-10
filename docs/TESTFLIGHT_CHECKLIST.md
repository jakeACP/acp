# ACP Democracy — TestFlight Manual QA Checklist

**Version**: 1.0  
**Platform**: iOS (Capacitor — com.acp.democracy)  
**Test builds**: TestFlight internal + external  
**Reviewer**: _______________  Date: _______________

Mark each item ✅ Pass · ❌ Fail · ⏭ N/A · ⚠️ Note

---

## 1. First Launch

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1.1 | App installs and launches without crashing | | |
| 1.2 | Splash / launch screen displays ACP branding | | |
| 1.3 | App requests **no** permissions on cold launch (camera/mic/location deferred until needed) | | |
| 1.4 | Privacy Policy link is accessible before login | | |
| 1.5 | Terms of Service link is accessible before login | | |
| 1.6 | "Sign in with Apple" button is visible on the auth screen | | |
| 1.7 | "Sign in with Google" button is visible on the auth screen | | |
| 1.8 | Username/password login form is present | | |

---

## 2. Authentication

| # | Test | Result | Notes |
|---|------|--------|-------|
| 2.1 | Register with email + password succeeds | | |
| 2.2 | Login with email + password succeeds | | |
| 2.3 | Login with username + password succeeds | | |
| 2.4 | Invalid credentials show a clear error (not a crash) | | |
| 2.5 | **Sign in with Apple** completes end-to-end (requires APPLE_* env vars) | | |
| 2.6 | **Sign in with Google** completes end-to-end | | |
| 2.7 | Session persists after backgrounding the app | | |
| 2.8 | Session persists after device restart | | |
| 2.9 | Logout clears session and returns to auth screen | | |
| 2.10 | 2FA (if enabled) prompts correctly at login | | |
| 2.11 | "Forgot password" flow sends reset email | | |

---

## 3. Signal Video Feed (TikTok-style)

| # | Test | Result | Notes |
|---|------|--------|-------|
| 3.1 | Signal feed loads within 3 seconds on Wi-Fi | | |
| 3.2 | Videos play automatically when scrolled into view | | |
| 3.3 | Only one video plays at a time | | |
| 3.4 | Video pauses when app is backgrounded | | |
| 3.5 | Video resumes when app is foregrounded | | |
| 3.6 | Like/unlike button updates count optimistically | | |
| 3.7 | Comment sheet opens and loads comments | | |
| 3.8 | Posting a comment succeeds | | |
| 3.9 | Deleting own comment succeeds | | |
| 3.10 | Report button appears on 3-dot menu | | |
| 3.11 | Reporting a signal submits without crash | | |
| 3.12 | Feed refreshes on pull-to-refresh | | |
| 3.13 | Empty state shown when no signals exist | | |
| 3.14 | Signal detail page opens via deep link `/mobile/signals/:id` | | |

---

## 4. Create a Signal (Camera)

| # | Test | Result | Notes |
|---|------|--------|-------|
| 4.1 | Tapping "Create" requests camera permission with clear purpose string | | |
| 4.2 | Tapping "Create" requests microphone permission with clear purpose string | | |
| 4.3 | Hold-to-record records video (up to 60 s) | | |
| 4.4 | Multiple clips can be recorded in sequence | | |
| 4.5 | Filters can be applied and previewed | | |
| 4.6 | Caption can be entered (keyboard does not cover input) | | |
| 4.7 | Upload progress indicator is shown | | |
| 4.8 | Successful upload appears in the creator's signal list | | |
| 4.9 | Cancelling mid-record does not crash | | |
| 4.10 | Video from camera roll can be selected and uploaded | | |

---

## 5. Feed (Main / Social)

| # | Test | Result | Notes |
|---|------|--------|-------|
| 5.1 | "All" feed loads posts and polls | | |
| 5.2 | "Following" feed shows only followed accounts | | |
| 5.3 | "My Reps" feed shows posts from matched representatives | | |
| 5.4 | Liking a post updates the like count | | |
| 5.5 | Commenting on a post works | | |
| 5.6 | Poll voting records and shows results | | |
| 5.7 | Ranked Choice Voting (RCV) modal opens for RCV polls | | |
| 5.8 | Pinch/scroll does not cause UI glitches | | |

---

## 6. Civic Hub

| # | Test | Result | Notes |
|---|------|--------|-------|
| 6.1 | Groups list loads | | |
| 6.2 | Joining a group succeeds | | |
| 6.3 | Leaving a group succeeds | | |
| 6.4 | Events list loads | | |
| 6.5 | Registering for an event succeeds | | |
| 6.6 | Petitions list loads | | |
| 6.7 | Signing a petition increments the count | | |
| 6.8 | Politician search finds results | | |
| 6.9 | Politician profile shows corruption grade | | |
| 6.10 | Filing a trading flag submits without crash | | |

---

## 7. Inbox / Messaging

| # | Test | Result | Notes |
|---|------|--------|-------|
| 7.1 | Inbox loads conversations | | |
| 7.2 | Sending a DM succeeds | | |
| 7.3 | Messages appear in real time (WebSocket) | | |
| 7.4 | Notification badge increments on new message | | |
| 7.5 | Push notification arrives when app is backgrounded | | |

---

## 8. Profile & Settings

| # | Test | Result | Notes |
|---|------|--------|-------|
| 8.1 | Profile page loads with correct user info | | |
| 8.2 | Avatar builder opens and saves a custom avatar | | |
| 8.3 | Profile photo upload works (selects from photo library — triggers permission prompt) | | |
| 8.4 | Bio and name edits save correctly | | |
| 8.5 | Privacy settings (profile visibility) save correctly | | |
| 8.6 | Political Compass quiz can be taken and result saved to profile | | |
| 8.7 | Issue Survey responses save and show on profile | | |
| 8.8 | Civic Activity Tracker shows correct stats | | |
| 8.9 | Economic Simulator can be completed and saved | | |

---

## 9. Safety / Moderation (UGC — App Store §1.2)

| # | Test | Result | Notes |
|---|------|--------|-------|
| 9.1 | Any post/signal has a "Report" option accessible within 2 taps | | |
| 9.2 | Report form submits with a reason and shows confirmation | | |
| 9.3 | Blocking a user removes their content from feeds | | |
| 9.4 | Unblocking a user restores their content | | |
| 9.5 | Blocked users list shows in Settings → Privacy | | |
| 9.6 | Muting a user hides their posts without blocking | | |

---

## 10. Account Deletion (App Store §5.1.1)

| # | Test | Result | Notes |
|---|------|--------|-------|
| 10.1 | "Delete Account" option is accessible from Settings | | |
| 10.2 | Deletion flow requires typing "DELETE MY ACCOUNT" to confirm | | |
| 10.3 | After deletion the session ends and user is redirected to auth | | |
| 10.4 | Deleted account's username/email are anonymised (not reusable for 24 h) | | |
| 10.5 | Data deletion note clearly states that account data will be removed | | |

---

## 11. Subscriptions / In-App Purchase (App Store §3.1.1)

| # | Test | Result | Notes |
|---|------|--------|-------|
| 11.1 | Subscription paywall is shown to free users for premium features | | |
| 11.2 | StoreKit purchase sheet appears (native iOS) | | |
| 11.3 | Sandbox purchase completes and entitlement is granted immediately | | |
| 11.4 | Restore Purchases button restores an existing subscription | | |
| 11.5 | Expired subscription revokes access on next app launch | | |
| 11.6 | Auto-renew cancellation is reflected within 24 hours | | |
| 11.7 | No external payment links are shown to iOS users | | |

---

## 12. Push Notifications

| # | Test | Result | Notes |
|---|------|--------|-------|
| 12.1 | Notification permission prompt is shown at an appropriate moment (not on cold launch) | | |
| 12.2 | Device token is registered with `POST /api/push/register` | | |
| 12.3 | Like notification arrives when another user likes your post | | |
| 12.4 | DM notification arrives when a message is received | | |
| 12.5 | Tapping a notification deep-links to the correct screen | | |
| 12.6 | Notification settings page respects system-level permission changes | | |

---

## 13. Offline / Error States

| # | Test | Result | Notes |
|---|------|--------|-------|
| 13.1 | No crash when app launches without internet | | |
| 13.2 | Clear "no connection" error shown on feed load failure | | |
| 13.3 | Retry button / pull-to-refresh works after reconnecting | | |
| 13.4 | Video upload shows error (not silent failure) when offline | | |
| 13.5 | Draft content is preserved if upload fails | | |

---

## 14. Accessibility

| # | Test | Result | Notes |
|---|------|--------|-------|
| 14.1 | All interactive elements have VoiceOver labels | | |
| 14.2 | Minimum touch target size ≥ 44×44 pt on bottom nav | | |
| 14.3 | Text scales correctly with Dynamic Type (up to Accessibility Extra Large) | | |
| 14.4 | Reduce Motion: video auto-play stops, transitions become cuts | | |
| 14.5 | High Contrast: all text meets AA contrast ratio | | |
| 14.6 | Focus rings visible for keyboard/switch-control navigation | | |

---

## 15. Performance

| # | Test | Result | Notes |
|---|------|--------|-------|
| 15.1 | Cold launch to interactive < 3 s on iPhone 12 (or equivalent) | | |
| 15.2 | Signal feed scroll is smooth (≥ 60 fps) | | |
| 15.3 | App does not exceed 150 MB memory in normal use | | |
| 15.4 | Battery usage < 5% per hour during video playback | | |
| 15.5 | No ANR / watchdog kill during heavy feed scroll | | |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| iOS Dev | | | |
| Product | | | |

**Build approved for App Store submission**: YES / NO

---
*Checklist template v1.0 — ACP Democracy iOS*
