# Food Bundles Chef App — Mobile

> Order right. Receive right. Know your stock before service.

Native mobile application for professional chefs to manage kitchen procurement, delivery receiving, stock visibility, and menu planning.

## Product

**Menu du Jour** — A chef-owned kitchen operations and procurement control application.

## Technology Stack

| Concern | Technology |
|---|---|
| Framework | Expo SDK 58 (managed workflow) |
| Language | TypeScript (strict mode) |
| Navigation | Expo Router |
| Styling | NativeWind v4 |
| State | Zustand |
| Server state | TanStack Query |
| Forms | React Hook Form + Zod |
| Animations | React Native Reanimated 4 + Moti |
| Database | expo-sqlite |
| Icons | lucide-react-native |
| i18n | i18next (en, rw, fr) |

## Setup

```bash
# Install dependencies
npm install

# Start Expo development server
npm start

# Run on Android
npm run android
```

## Scripts

| Script | Description |
|---|---|
| `npm start` | Start Expo development server |
| `npm run android` | Launch on Android |
| `npm run ios` | Launch on iOS (macOS required) |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |
| `npm run format:check` | Prettier check |
| `npm test` | Jest tests |

## Project Structure

```
mobile/
  app/                        # Expo Router route files
    (auth)/                   # Welcome, phone, OTP screens
    (app)/                    # Authenticated app
      (tabs)/                 # Bottom tab navigation
      kitchens/               # Kitchen management
      settings/               # Settings
  src/
    components/               # Reusable UI components
    features/                 # Feature-specific components
    domain/
      calculations/           # Pure business logic (tested)
      models/                 # Domain types
    data/
      repositories/           # Typed repository contracts
      mock/                   # Mock implementations
    store/                    # Zustand state stores
    services/                 # Camera, AI, notifications
    i18n/                     # Translations (en, rw, fr)
    types/                    # Shared TypeScript types
    constants/                # Application constants
  __tests__/                  # Unit and integration tests
  assets/                     # App icons, splash screen
```

## Implementation Status

| Phase | Status |
|---|---|
| 00 Repository & Git | ✅ Done |
| 01 Expo Foundation | 🔄 In Progress |
| 02 Architecture & Design System | ⬜ TODO |
| 03 i18n, Auth & Kitchens | ⬜ TODO |
| 04 Dashboard, Menu, Recipes, Sales | ⬜ TODO |
| 05 Purchasing & Orders | ⬜ TODO |
| 06 Delivery Receiving & Quality | ⬜ TODO |
| 07 Inventory & Offline Persistence | ⬜ TODO |
| 08 Notifications & Accessibility | ⬜ TODO |
| 09 Release Readiness | ⬜ TODO |

## Known Limitations

- This is a UI-only implementation. No real backend, OTP, payments, or AI calls.
- All simulated operations are clearly marked in the UI.
- SQLite persistence not yet implemented (Phase 07).
- Kitchen data isolation is enforced at the store/query level; backend authorization is required in production.

## Architecture Notes

- Screens do not contain business logic — all calculations are in `src/domain/calculations/`.
- Every kitchen-scoped record carries a `kitchenId`.
- Repository interfaces in `src/data/repositories/` will be implemented against a real API without changing screens.
- Mock adapters in `src/data/mock/` are the current implementations.
