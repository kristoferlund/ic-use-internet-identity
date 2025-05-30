# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
