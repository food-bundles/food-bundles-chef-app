# E4 Implementation: Passcode and 30-Minute Inactivity Lock

**Status:** Built (not verified on device)  
**Last Updated:** November 27, 2026

## Overview

Implemented passcode security with 30-minute inactivity lock for the Chef App. This includes core domain logic, secure storage, UI components, and user flows for setting, changing, and removing passcodes.

## Part 1: Core Infrastructure ✅ (Committed Previously)

### Domain Logic
- **File:** `mobile/src/domain/rules/passcode.ts`
- Passcode validation (4-6 digits)
- Failed attempt tracking with exponential lockout (5 attempts → 30s, 10 → 60s, 15 → 120s)
- OTP fallback suggestion after 10 failed attempts

### Secure Storage
- **File:** `mobile/src/store/passcode-store.ts`
- **Hashing:** 10,000 iterations of SHA-256 (PBKDF2-like) with per-chef random salt
- Functions: `setPasscode`, `verifyPasscode`, `removePasscode`, `hasPasscode`
- Stores: passcode hash, salt, failed attempts count, last failed timestamp

### Inactivity Tracking
- **File:** `mobile/src/store/inactivity-store.ts`
- Tracks last activity timestamp (persisted to SecureStore)
- 30-minute inactivity threshold
- Locks app when threshold exceeded and passcode is set
- Now includes: lock count tracking, suggestion modal trigger

### Unlock Screen
- **File:** `mobile/app/(app)/unlock.tsx`
- Passcode entry with real-time validation
- Failed attempt counter with lockout timer
- "Forgot passcode?" → sign out flow
- **Android back button:** Blocked via BackHandler (cannot dismiss unlock screen)

### Root Provider
- **File:** `mobile/app/_layout.tsx`
- InactivityProvider wraps Stack at root level
- Covers all screens, modals, and UI elements (including AI button)
- Uses `router.replace` to prevent back navigation from unlock screen

## Part 2: UI Integration ✅ (Just Completed)

### Profile Screen Integration
- **File:** `mobile/app/(app)/profile.tsx`
- Added "Passcode" row in Account section (before Sign Out)
- Shows status: "Enabled" or "Not set"
- Clicking shows action sheet:
  - If no passcode: "Set Passcode"
  - If has passcode: "Change Passcode" or "Remove Passcode"

### PasscodeModal Component
- **File:** `mobile/src/components/security/PasscodeModal.tsx`
- Handles three flows: set, change, remove
- **Set:** Enter new passcode twice (confirmation step)
- **Change:** Verify current, then enter new twice
- **Remove:** Verify current, then confirm removal
- Real-time validation with error messages
- Uses improved 10,000-round hashing

### Passcode Suggestion Modal
- **File:** `mobile/src/components/security/PasscodeSuggestionModal.tsx`
- Shown once after 2nd inactive lock (30 min apart)
- Two options:
  - "Set Up Now" → navigates to profile screen
  - "Remind Me Later" → dismisses permanently
- **Never signs the chef out** - only suggests passcode setup
- State tracked in `inactivity-store`: lockCount, suggestionShown

### Translation Keys Added
- **File:** `mobile/src/i18n/locales/en/security.json`
- `passcodeEnabled`, `passcodeDisabled`, `passcodeManagePrompt`
- `passcodeChange`, `passcodeRemove`
- All modal titles, messages, and button labels

## Security Architecture

### Unlock Screen Coverage
✅ **Verified:**
- InactivityProvider is at root `app/_layout.tsx` wrapping the Stack
- Uses `router.replace('/(app)/unlock')` - prevents back navigation
- Android BackHandler blocks hardware back button
- Covers ALL screens, modals, bottom sheets, and the FAB/AI button

### Command Draft Protection
⚠️ **Limitation Documented:**
- Command draft state is **local React useState** in `mobile/app/(app)/commands/new.tsx`
- Variables: `qty`, `type`, `table`, `recorder`
- **Not persisted** in Zustand store or SQLite
- **Result:** Locking during command entry loses the draft
- **Options:**
  1. Create a command draft store (Zustand + SecureStore)
  2. Document as known limitation

### Sign-Out and Offline Queue Behavior

**What Sign-Out Clears:**
1. **Tokens** (SecureStore): access token, refresh token
2. **Assistant chats** (AsyncStorage): all chat history cleared via `clearAllChats()`
3. **Session state** (Zustand): `chef: null`, `isAuthenticated: false`

**What Sign-Out Preserves:**
1. **SQLite database:** Mutation queue persists (operations, retries, status)
2. **Passcode data** (SecureStore): Passcode hash and salt remain (scoped per chef ID)
3. **Failed attempts** (SecureStore): Counter and timestamp persist
4. **Kitchen store data** (Zustand): May persist depending on implementation
5. **Inactivity tracking** (SecureStore): Last activity timestamp, lock count, suggestion state

**Rationale:**
- Passcode is per-chef, so remains if same chef logs back in
- Mutation queue needs to persist for offline sync reliability
- When a different chef logs in, they have a different chef ID, so won't see previous passcode or queue

**SQLite Mutation Queue Operations:**
- Defined in `mobile/src/data/repositories/mutation-queue-repository.ts`
- Operations: kitchen.*, stock.*, sales.*, order.*, delivery.*, command.*, stock.count
- Stored with: id, kitchenId, operation, payload, status, retryCount, lastError, timestamps
- Not cleared on sign-out - scoped by kitchenId

## Biometric Unlock

**Decision:** Skipped  
**Reason:** `expo-local-authentication` is NOT in package.json  
**Recommendation:** Add if compatible with current Expo SDK and user requests it

## Testing Required (Not Yet Done)

### Manual Testing Checklist
- [ ] Set passcode from profile → verify saved
- [ ] Lock phone for 30+ min → verify unlock screen appears
- [ ] Enter wrong passcode 5 times → verify 30s lockout
- [ ] "Forgot passcode?" → verify sign-out flow
- [ ] Change passcode → verify old passcode required
- [ ] Remove passcode → verify current passcode required
- [ ] 2nd lock without passcode → verify suggestion modal appears
- [ ] "Set Up Now" in suggestion → verify navigates to profile
- [ ] "Remind Me Later" → verify never shows again
- [ ] Android back button on unlock screen → verify blocked
- [ ] Start new command → lock app → unlock → verify draft lost (expected limitation)

### Automated Tests Needed
- Passcode hashing with 10k rounds
- Lockout timing calculations
- Failed attempt tracking
- Inactivity threshold detection
- Lock count increment
- Suggestion modal trigger logic

## Files Changed

### Part 1 (Previously Committed)
- `mobile/src/domain/rules/passcode.ts`
- `mobile/src/store/passcode-store.ts`
- `mobile/src/store/inactivity-store.ts`
- `mobile/app/(app)/unlock.tsx`
- `mobile/src/providers/InactivityProvider.tsx`

### Part 2 (Just Committed)
- `mobile/app/(app)/profile.tsx` - Added Passcode management row
- `mobile/app/(app)/unlock.tsx` - Added Android back button prevention
- `mobile/src/components/security/PasscodeModal.tsx` - Created modal component
- `mobile/src/components/security/PasscodeSuggestionModal.tsx` - Created suggestion modal
- `mobile/src/store/inactivity-store.ts` - Added lock count and suggestion tracking
- `mobile/src/providers/InactivityProvider.tsx` - Integrated suggestion modal
- `mobile/src/i18n/locales/en/security.json` - Added translation keys

## Commits Made

1. `aa473e8` - E4 part 2: add passcode management to profile screen
2. `c14aa32` - E4 part 2: prevent Android back button on unlock screen
3. `7764183` - E4 part 2: add passcode suggestion modal after 2nd lock

## Known Limitations

1. **Command Draft Loss:** Locking during command entry loses the draft (local state only)
2. **Biometric Unlock:** Not implemented (expo-local-authentication not installed)
3. **Device Testing:** Not yet verified on physical device
4. **Passcode Migration:** Existing installations with old single-hash passcodes need migration logic
5. **Lock Count Reset:** No UI to reset lock count (only via sign-out or clearing SecureStore)

## Security Considerations

✅ **Strong:**
- 10,000-round PBKDF2-like hashing with random salt per chef
- Failed attempt tracking with exponential backout
- Hardware back button blocked on Android
- Root-level coverage (all screens + modals)
- Per-chef scoping (different chefs can have different passcodes)

⚠️ **Consider:**
- Add rate limiting on passcode verification at API level (if backend integration added)
- Add device binding to detect account takeover
- Add passcode age policy (require change after N days)
- Add biometric unlock for convenience
- Add "require passcode immediately on lock" option (not just 30 min)

## How to Resume

**Next Item:** E5 - Two-Factor Authentication (2FA)

Refer to the product spec or backlog for E5 requirements. Expected scope:
- TOTP setup and verification
- Recovery codes
- 2FA enforcement policy
- Backup authentication methods
