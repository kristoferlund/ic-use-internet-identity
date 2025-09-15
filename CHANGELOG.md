# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2025-09-15

This version introduces functions that can be used outside of React to allow the library to be initialized in routing libraries 
such as Tanstack Router. Instead of relying on custom React effects to initialize, we can use a more idiomatic approach and 
initialize from `beforeLoad` (Tanstack Router).

### Added
- `ensureInitialized(): Promise<Identity | undefined>` - Wait for the identity initialization to complete and get restored identity
- `isAuthenticated(): boolean` - Check if user is authenticated 
- `getIdentity(): Identity | undefined` - Get the current identity 

### Fixed

- Fixed stale `error` values persisting after successful login.


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
- **Upgraded dependencies**: Updated `@xstate/store` from `2.6.2` to `^3.8.5` ([e544b5b](https://github.com/kristoferlund/ic-use-internet-identity/commit/e544b5b))
- **Improved error handling**: Consistent error handling pattern - all errors set via state instead of mixed throw/state approach
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

(Older entries preserved below...)
