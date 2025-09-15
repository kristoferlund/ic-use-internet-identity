# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2025-09-15

This version introduces **router integration support** through standalone utility functions that work outside of React components. This enables seamless integration with routing libraries like TanStack Router, React Router, and others, allowing for proper authentication checks during route transitions.

### 🚀 Key Features

This release addresses a common challenge when using authentication with modern routing libraries: **protecting routes before components mount**. Previously, developers had to rely on React effects and conditional rendering, which could lead to flickering UI and complex workarounds. Now you can properly integrate authentication into your routing logic.

### Added

#### New Utility Functions

Three new functions are now exported for use outside React components:

- **`ensureInitialized(): Promise<Identity | undefined>`**
  Waits for the identity initialization to complete and returns the restored identity if available. This is essential for route guards to ensure the authentication state is fully loaded before making routing decisions.

  ```typescript
  // Example: Protecting a route with TanStack Router
  const protectedRoute = createRoute({
    path: "dashboard",
    beforeLoad: async () => {
      const identity = await ensureInitialized();
      if (!identity) {
        throw redirect({ to: "/login" });
      }
    },
    component: DashboardComponent,
  });
  ```

- **`isAuthenticated(): boolean`**
  Synchronously checks if a user is currently authenticated. Useful for conditional logic where you don't need to wait for initialization.

  ```typescript
  // Example: Quick auth check
  if (isAuthenticated()) {
    // Show authenticated UI
  } else {
    // Show public UI
  }
  ```

- **`getIdentity(): Identity | undefined`**
  Synchronously retrieves the current identity. Returns `undefined` if not authenticated or still initializing.

  ```typescript
  // Example: Getting user principal outside React
  const identity = getIdentity();
  const principal = identity?.getPrincipal().toString();
  ```

#### Usage Example: Route Protection Pattern

Here's a complete example showing how to create a reusable authentication guard:

```typescript
// src/lib/auth-guard.ts
import { isRedirect, redirect } from "@tanstack/react-router";
import { ensureInitialized } from "ic-use-internet-identity";

export async function requireAuth() {
  try {
    const identity = await ensureInitialized();
    if (!identity) {
      throw redirect({ to: "/login" });
    }
    return identity;
  } catch (err) {
    if (isRedirect(err)) throw err;
    console.error("Auth initialization failed:", err);
    throw redirect({ to: "/error" });
  }
}

// src/routes/protected.tsx
export const Route = createFileRoute("/protected")({
  beforeLoad: async () => requireAuth(),
  component: ProtectedComponent,
});
```

### Fixed

- **Stale error values after successful login** - Previously, if a login attempt failed and then succeeded on retry, the error state would persist even after successful authentication. This has been fixed to properly clear error state on successful login, ensuring the UI accurately reflects the current authentication state.

### Migration Guide

No breaking changes in this release! The new functions are additive and work alongside the existing React hooks. However, if you're currently using React `useEffect` workarounds for route protection, consider migrating to the new pattern:

**Before (v0.4.0):**
```jsx
// Checking auth in components with potential flicker
function ProtectedRoute({ children }) {
  const { identity, isInitializing } = useInternetIdentity();

  if (isInitializing) return <Spinner />;
  if (!identity) {
    navigate("/login");
    return null;
  }

  return children;
}
```

**After (v0.5.0):**
```typescript
// Clean route-level protection
const protectedRoute = createRoute({
  beforeLoad: async () => {
    const identity = await ensureInitialized();
    if (!identity) throw redirect({ to: "/login" });
  },
  component: ProtectedComponent,
});
```

### Important Notes

1. The utility functions access the same underlying state as the React hooks, ensuring consistency across your application.
2. `ensureInitialized()` typically resolves in under 1 second as it only needs to check for cached credentials.
3. For dynamic auth changes (e.g., user logout), you'll still need to use the React hooks in your components or implement a reactive auth guard.


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
