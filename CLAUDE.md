# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                    # Run all Jest tests (clears cache)
npm run test-coverage       # Run tests with coverage reporting
npm run lint                # Run ESLint
npm run compile             # TypeScript type-check (no emit)
npm run prettier-fix        # Auto-format with Prettier
npm run prepare             # Build to lib/ (commonjs, module, typescript targets)
```

Run a single test file:
```bash
jest src/path/to/__tests__/file.test.ts
```

Run tests matching a name:
```bash
jest --testNamePattern="testName"
```

## Architecture

This is a React Native SDK that integrates the AdAdapted ad platform into mobile apps.

### Data Flow

1. **Initialization** — App calls `AdadaptedReactNativeSdk.initialize()` with an `appId` and config callbacks. The SDK gathers device info (OS, UDID, screen dimensions, locale) and calls the session API.
2. **Session** — `initializeSession` returns a session ID, ad zones, and ads. The SDK stores this state internally and fires the `onAdZonesRefreshed` callback.
3. **Ad Rendering** — App creates `<AdZone>` components using the zone data provided via callbacks. `AdZone.tsx` renders ads in a WebView, cycling through them based on API-defined refresh intervals.
4. **Event Tracking** — Impressions, clicks, and "add to list" events are reported back to the API via `reportAdEvent`.
5. **Polling** — Session data refreshes on a timer (minimum 5 minutes, as set by the API response).

### Module Responsibilities

| File | Responsibility |
|------|---------------|
| `src/index.tsx` | Main SDK class — initialization, session management, zone creation, polling loop |
| `src/components/AdZone.tsx` | React component that renders an ad zone with WebView cycling |
| `src/components/ReportAdButton.tsx` | Optional "Report this Ad" UI component |
| `src/api/adadaptedApiRequests.ts` | Axios HTTP client for all API calls; supports mock environment |
| `src/api/adadaptedApiTypes.ts` | TypeScript interfaces for all API request/response shapes |
| `src/api/adadaptedApiRequests.mock.ts` | Mock data used when `Environment.Mock` is set |
| `src/componentTypes/Device.ts` | `DeviceOS` enum and `DeviceInfo` interface |
| `src/componentTypes/Environment.ts` | API environment enums (Prod/Dev/Mock) for main API, List Manager, and Payload server |
| `src/componentTypes/AdZone.ts` | Prop types for the `AdZone` component |
| `src/util.ts` | `SafeInvoke` — overloaded helper for type-safe optional callback invocation |

### Key Patterns

- **Callback-based API** — The SDK uses callbacks (`onAdZonesRefreshed`, `onAddToListTriggered`, `onOutOfAppPayloadAvailable`) rather than observables or promises for consumer-facing events.
- **Keyword Intercepts** — `performKeywordSearch()` matches search terms against API-provided intercepts and returns contextual ads or suggestions.
- **Contextual ads** — `setAdContext()`/`clearAdContext()` replace standard ads with context-specific ones for a session.
- **Off-screen zones** — Zones not yet visible use a separate tracking path to avoid counting unseen impressions.
- **Mock environment** — Setting `Environment.Mock` routes all API calls to local mock data (`adadaptedApiRequests.mock.ts`), useful for development without network access.

## Commit Convention

Follow Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`. Pre-commit hooks enforce commit message format, linting, and tests.
