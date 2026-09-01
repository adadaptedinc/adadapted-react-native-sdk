# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                    # Run all Jest tests
npm run test-coverage       # Run tests with coverage reporting
npm run lint                # Run ESLint
npm run compile             # TypeScript type-check (no emit) — the SDK AND the example app
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

The v1.0.0 ad service serves **one ad for one named zone per request**, and there is
no zone-enumeration route. The Android SDK is the reference client for this design —
not `adadapted-js-sdk`, which had to invent browser equivalents for things React
Native gets from `AppState` directly.

1. **Initialization** — App calls `AdadaptedReactNativeSdk.initialize()` with an
   `appId` and config callbacks. The SDK gathers device info (OS, UDID, screen
   dimensions, locale), mints a session, then fetches keyword intercepts and payloads.
2. **Session** — Generated in JS, held in memory, **never persisted**, mirroring
   Android's `SessionClient`. A relaunch therefore always starts a new session; only a
   foreground within 30 minutes resumes one. IDs are `RN` + 32 chars from `[A-Z0-9]`,
   and reporting resolves the platform from that prefix (the v1.0.0 routes have no
   `{os}` path segment). Do not "fix" this to match the web SDK, which _does_ persist
   to `localStorage` because reloading a tab is normal and cheap.
3. **Ad Rendering** — The **app** declares its zones as `<AdZone zoneId="..." />`,
   because nothing in the API reports which zones exist. Each component instance owns
   one zone: its own request, its own pausable countdown and its own impression
   pairing. Nothing is shared at module scope — that is what lets several zones
   coexist. This is a port of Android's `AdZonePresenter` / `AaZoneView`.
4. **Event Tracking** — Impressions, clicks and zone lifecycle events go through
   `reportAdEvent`. Every ad event carries a `zone_id`; `zone_*` events send empty
   `ad_id` / `impression_id`. An `impression_end` is reported at most once per
   impressed ad.
5. **Refresh** — Per zone, from the ad's own `refresh_time` (`<= 0` → 60s, otherwise
   floored at 15s). The countdown freezes when the zone goes off screen or the app
   backgrounds; an ad that outlived its refresh time while frozen is replaced on
   return rather than shown for time nobody saw.

### Module Responsibilities

| File                                   | Responsibility                                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.tsx`                        | Main SDK class — initialization, session lifecycle, intercepts, payloads, deep links                                                        |
| `src/adRequestContext.ts`              | Module-scoped context an `AdZone` reads session/device info from, mirroring Android's singletons; also breaks the SDK ↔ AdZone import cycle |
| `src/components/AdZone.tsx`            | One ad zone: its own request, countdown and impression pairing (port of `AdZonePresenter`)                                                  |
| `src/components/ReportAdButton.tsx`    | Optional "Report this Ad" UI component                                                                                                      |
| `src/api/adadaptedApiRequests.ts`      | Axios HTTP client for all API calls; supports mock environment                                                                              |
| `src/api/adadaptedApiTypes.ts`         | TypeScript interfaces for all API request/response shapes                                                                                   |
| `src/api/adadaptedApiRequests.mock.ts` | Mock data used when `Environment.Mock` is set                                                                                               |
| `src/componentTypes/Device.ts`         | `DeviceOS` enum and `DeviceInfo` interface                                                                                                  |
| `src/componentTypes/Environment.ts`    | API environment enums (Prod/Dev/Mock) for main API, List Manager, and Payload server                                                        |
| `src/componentTypes/AdZone.ts`         | Prop types for the `AdZone` component                                                                                                       |
| `src/util.ts`                          | `SafeInvoke` — overloaded helper for type-safe optional callback invocation                                                                 |
| `src/__tests__/`                       | Session lifecycle, per-zone serving, and wire-contract tests                                                                                |

### Key Patterns

- **Callback-based API** — The SDK uses callbacks (`onAddToListTriggered`, `onOutOfAppPayloadAvailable`) rather than observables or promises for consumer-facing events. A zone with no `onAddToListTriggered` prop falls back to the one given to `initialize()`.
- **Keyword Intercepts** — `performKeywordSearch()` matches search terms against API-provided intercepts and returns contextual ads or suggestions. `min_match_length` is no longer served, so the minimum is hardcoded to 3, as `KeywordInterceptMatcher` does.
- **Per-zone visibility and context** — The SDK cannot determine visibility in React Native, so the host reports it via the `isVisible` prop, and recipe context via `contextId`. These are the equivalents of `AaZoneView.setAdZoneVisibility` / `setAdZoneContextId`. There are no global versions.
- **Deferred ATL interaction** — Clicking an "add to list" ad reports `atl_ad_clicked`, **not** an interaction. The interaction is earned when the host confirms the items reached the list, via `acknowledge()`. Ported from `AdContent.itemAcknowledge`, including its guard against one click reporting two interactions.
- **`success: false` on a 200** — The v1.0.0 envelope is `{ data, success }`, and the service returns `success: false` with a populated `data` for business rejections. The status code alone is not enough to detect failure.
- **`AppState` handling** — `"active"` resolves the session only if the app was actually backgrounded first. Android instead guards its _first_ `onStart`, because `ProcessLifecycleOwner` replays state to a new observer; `AppState` has no replay, so copying that guard swallows the first real return from the background. `"inactive"` is ignored — iOS raises it for the app switcher and incoming calls, and Android has no analogue.
- **Mock environment** — Setting `Environment.Mock` routes all API calls to local mock data (`adadaptedApiRequests.mock.ts`), useful for development without network access.

## Commit Convention

Follow Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`. Pre-commit hooks enforce commit message format, prettier, linting, type-checking
and the unit tests. CI runs the same validation on every push and pull request.

## Testing notes

- Jest uses **babel-jest** with `@react-native/babel-preset`, not ts-jest: React Native
  ships Flow-typed JavaScript that ts-jest cannot parse. Types are checked by
  `npm run compile` instead, so a type error will pass `npm test` and fail the compile.
- `jest.setup.ts` stubs `NativeModules.AdadaptedReactNativeSdk` by assignment rather
  than `jest.mock("react-native")`. Mocking the whole module means spreading it, and
  RN's index exposes lazy getters — spreading forces all of them, including `DevMenu`,
  which throws with no native binary present.
- `__mocks__/reactNativeGetRandomValuesMock.js` stands in for
  `react-native-get-random-values`, whose TurboModule only exists in a running app.
- `jest-environment-node` is pinned via `overrides` because `@react-native/jest-preset`
  depends on v29 while jest-runtime 30 needs the v30 module mocker.
- `tsconfig.build.json` exists so bob's declaration emit skips `__tests__`; the root
  `tsconfig.json` still includes them so they are type-checked.
- New dependencies of the SDK must also be installed in `example/`: its
  `metro.config.js` maps every SDK dependency name to `example/node_modules`.
