# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2025-08-06

### ⚠️ Breaking Changes

- **Renamed interface**: `InternetIdentityContextType` → `InternetIdentityContext` ([6bad9b7](https://github.com/kristoferlund/ic-use-internet-identity/commit/6bad9b7c29211618b1834ddd0f8750561bfd01a1))
- **Renamed properties**: Multiple property names have changed for better consistency:
  - `loginStatus` → `status`
  - `loginError` → `error`
  - `isLoginError` → `isError`
  - `isLoginIdle` → `isIdle`
- **Status type expanded**: Added `"initializing"` to the `Status` type, and `isInitializing` is now a computed property (`status === "initializing"`) instead of a separate boolean
- **Function signatures changed**:
  - `login()` now returns `void` instead of `Promise<void>`
  - `clear()` now returns `void` instead of `Promise<void>`
- **LoginOptions interface**: Now extends `AuthClientLoginOptions` with `onSuccess`, `onError` omitted ([4f04748](https://github.com/kristoferlund/ic-use-internet-identity/commit/4f04748396db12004eefa9ea7de08edb270ce15c))
- **Default identity provider**: Library now defaults to `https://identity.ic0.app` without requiring environment variable configuration. Custom identity provider can be set via `identityProvider` option on the `InternetIdentityProvider`. ([4f04748](https://github.com/kristoferlund/ic-use-internet-identity/commit/4f04748396db12004eefa9ea7de08edb270ce15c))

### Added

- **Extended LoginOptions**: All `AuthClientLoginOptions` properties are now available (except `onSuccess`, `onError`)
- **Comprehensive error handling**: All errors now flow through state management instead of thrown exceptions

### Changed

- **Upgraded dependencies**: Updated minimum required `@dfinity/*` packages from `>=2.4.1` to `>=3.1.0` ([828a57c](https://github.com/kristoferlund/ic-use-internet-identity/commit/828a57c8641b7c9578aeb17a6932000a9e2c520f))
- **Improved error handling**: Consistent error handling pattern - all errors set via state instead of mixed throw/state approach ([9305299](https://github.com/kristoferlund/ic-use-internet-identity/commit/9305299057e5d53dd46142e4dfa65a55ef4cc62c))
- **Simplified state management**: Reduced XState store boilerplate with generic `setState` action
- **Enhanced type safety**: Better TypeScript types with proper inheritance and utility types
- **Reordered context properties**: Context interface properties reordered for better logical grouping
- **Unified status tracking**: Initial state is now `"initializing"` instead of `"idle"` with separate initialization flag

### Fixed

- **Type safety**: Removed unsafe type casting in delegation validation
- **Error consistency**: No more mixed error handling patterns (throw vs state)

### Documentation

- **Comprehensive README updates**: Added detailed login process documentation, status flow explanations, and troubleshooting guide
- **Enhanced examples**: More complete code examples showing real-world usage patterns

## 0.3.1 - 2025-05-30

### Changed

- Added `@dfinity/principal` as a peer dependency

## 0.3.0 - 2025-05-30

### Changed

- Upgraded dependencies, now requiring at minimum `v2.4.1` of `@dfinity/x` libraries.
- The `login` function is no longer marked as `async` to prevent an issue with Safari browser that blocks opening the login window.

## 0.2.0 - 2025-01-07

### Changed

- Replaced the state handling. Instead of using React Context, the hook now uses [https://www.npmjs.com/package/@xstate/store](xstate/store) for state management.

### Fixed

- Replacing the state handling fixed some edge case bugs where the state could become out of sync when switching between different identites.

## 0.1.0 - 2024-10-16

### Changed

- Upgraded minimum required versions of @dfinity/xxx dependencies to >=v2.1.2
- Included more options from `AuthClientLoginOptions` in `LoginOptions`.

## [0.0.11] - 2024-07-11

### Added

- Login support for `derivationOrigin`

### Changed

- Upgraded minimum required versions of @dfinity/xxx dependencies

## [0.0.10] - 2024-03-07

### Fixed

- Bug that caused the `isInitializing` state to not be set to `false` after initialization.

## [0.0.9] - 2024-03-07

### Changed

- Moved @dfinity/xxx dependencies from dependencies to peerDependencies to reduce package size.

## [0.0.8] - 2024-03-04

### Changed

- Upgraded @dfinity/xxx dependencies to latest versions.

## [0.0.7] - 2024-01-31

No changes. Upgrader to sync version numbers with [ic-use-siwe-identity](https://github.com/kristoferlund/ic-siwe/tree/main/packages/ic-use-siwe-identity).

## [0.0.1] - 2024-01-18

### Added

- First release. `ic-use-internet-identity` v0.0.1 should be regarded as alpha software.
