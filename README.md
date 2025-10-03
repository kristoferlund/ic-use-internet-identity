# ic-use-internet-identity

[Internet Identity](https://internetcomputer.org/how-it-works/web-authentication-identity) is an authentication service running on the [Internet Computer](https://internetcomputer.org). It allows users to create an identity that can be used to authenticate with canisters (smart contracts) running on the Internet Computer.

`ic-use-internet-identity` is a hook that makes it easy to integrate Internet Identity into your React application. It provides a simple interface for logging in and out with the Internet Identity service.

[![version][version-image]][npm-link]
[![downloads][dl-image]][npm-link]

## Features

- **Cached Identity**: The identity is cached in local storage and restored on page load. This allows the user to stay logged in even if the page is refreshed.
- **Login progress**: State variables are provided to indicate whether the user is logged in, logging in, or logged out.
- **Reactive Identity Expiry**: Automatically resets authentication state when the identity expires, keeping your app in sync without page reloads.
- **Works with ic-use-actor**: Plays nicely with [ic-use-actor](https://www.npmjs.com/package/ic-use-actor) that provides easy access to canister methods.
- **Router integration**: Exposes `ensureInitialized()` and `isAuthenticated()` for use outside React (examples use TanStack Router).

## Table of Contents

- [ic-use-internet-identity](#ic-use-internet-identity)
  - [Features](#features)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Prerequisites](#prerequisites)
    - [1. Setup the `InternetIdentityProvider` component](#1-setup-the-internetidentityprovider-component)
    - [2. Connect the `login()` function to a button](#2-connect-the-login-function-to-a-button)
    - [Monitoring the Login Process](#monitoring-the-login-process)
    - [Status Helper Properties](#status-helper-properties)
    - [3. Use the `identity` context variable to access the identity](#3-use-the-identity-context-variable-to-access-the-identity)
  - [InternetIdentityProvider props](#internetidentityprovider-props)
  - [LoginOptions](#loginoptions)
  - [useInternetIdentity interface](#useinternetidentity-interface)
  - [Error Handling](#error-handling)
  - [Router integration](#router-integration)
    - [Available Functions](#available-functions)
    - [Basic Example](#basic-example)
    - [Client-side (reactive) Auth Guard](#client-side-reactive-auth-guard)
    - [Creating a Route Guard Helper](#creating-a-route-guard-helper)
    - [Important Notes](#important-notes)
  - [Security Considerations](#security-considerations)
  - [Updates](#updates)
  - [Author](#author)
  - [Contributing](#contributing)
  - [License](#license)

## Installation

```bash
pnpm install ic-use-internet-identity
```

The hook also requires the following `@dfinity/x` packages to be installed with a version of at least `3.1.0`:

```bash
pnpm install @dfinity/agent @dfinity/auth-client @dfinity/identity @dfinity/candid
```

## Usage

> [!TIP]
> For a complete example, see the [ic-use-internet-identity-demo](https://github.com/kristoferlund/ic-use-internet-identity-demo) demo project.

To use `ic-use-internet-identity` in your React application, follow these steps:

### 1. Setup the `InternetIdentityProvider` component

Wrap your application's root component with `InternetIdentityProvider` to provide all child components access to the identity context.

```jsx
// main.tsx

import { InternetIdentityProvider } from "ic-use-internet-identity";
import React from "react";
import ReactDOM from "react-dom/client";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <InternetIdentityProvider>
      <App />
    </InternetIdentityProvider>
  </React.StrictMode>
);
```

> [!TIP]
> **Identity Provider Configuration**: The library defaults to using the main Internet Identity instance at `https://identity.ic0.app`. You can override this by setting the `identityProvider` in your `loginOptions`.
>
> - **Default**: `https://identity.ic0.app` (used automatically)
> - **Custom via loginOptions**: Pass `identityProvider` in `loginOptions` prop
> - **Local development**: `http://${CANISTER_ID_INTERNET_IDENTITY}.localhost:4943`
>
> **Configure via loginOptions**
> ```tsx
> <InternetIdentityProvider
>   loginOptions={{
>     identityProvider: process.env.DFX_NETWORK === "local"
>       ? `http://${process.env.CANISTER_ID_INTERNET_IDENTITY}.localhost:4943`
>       : "https://identity.ic0.app"
>   }}
> >
>   <App />
> </InternetIdentityProvider>
> ```

### 2. Connect the `login()` function to a button

The `login()` function initiates the Internet Identity authentication process. Here's what happens when you call it:

1. **Pre-flight Validation**: The function first validates that all prerequisites are met (provider is present, auth client is initialized, user isn't already authenticated)
2. **Popup Window**: If validation passes, it opens the Internet Identity service in a new popup window
3. **Status Updates**: The `status` immediately changes to `"logging-in"` and remains there until the process completes
4. **User Authentication**: The user completes authentication in the popup window
5. **Result Handling**:
   - **Success**: `status` becomes `"success"`, `identity` is populated, and the popup closes
   - **Error**: `status` becomes `"error"` and `error` contains the error details
   - **User Cancellation**: Treated as an error with appropriate error message

> [!WARNING]
> **User Interaction Required**: The `login()` function MUST be called in response to a user interaction (e.g., button click). Calling it in `useEffect` or similar will fail because browsers block popup windows that aren't triggered by user actions.

> [!IMPORTANT]
> **No Promise Handling Required**: The `login()` function returns `void` and handles all results through the hook's state. Monitor the `status`, `error`, and `identity` values returned by the hook instead of using try/catch blocks.

#### Monitoring the Login Process

The login process follows a predictable status flow:

- **`"initializing"`** → Library is loading and checking for existing authentication
- **`"idle"`** → Ready to login
- **`"logging-in"`** → Login popup is open, user is authenticating
- **`"success"`** → Login completed successfully, `identity` is available
- **`"error"`** → Login failed, check `error` for details

Use the `status` and `error` state variables to track the login process and provide appropriate UI feedback:

```jsx
// LoginButton.tsx

import { useInternetIdentity } from "ic-use-internet-identity";

export function LoginButton() {
  const { login, status, error, isError, identity } = useInternetIdentity();

  const renderButton = () => {
    switch (status) {
      case "initializing":
        return (
          <button disabled>
            ⏳ Initializing...
          </button>
        );
      case "idle":
        return (
          <button onClick={login}>
            Login with Internet Identity
          </button>
        );
      case "logging-in":
        return (
          <button disabled>
            🔄 Logging in...
          </button>
        );
      case "success":
        return (
          <button disabled>
            ✅ Logged in as {identity?.getPrincipal().toString().slice(0, 8)}...
          </button>
        );
      case "error":
        return (
          <button onClick={login}>
            🔄 Retry Login
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      {renderButton()}
      {isError && (
        <div style={{ color: "red", marginTop: "8px" }}>
          ❌ Login failed: {error?.message}
        </div>
      )}
    </div>
  );
}
```

#### Status Helper Properties

The hook also provides convenient boolean properties for common status checks:

```jsx
const {
  isInitializing, // status === "initializing"
  isIdle,        // status === "idle"
  isLoggingIn,   // status === "logging-in"
  isLoginSuccess, // status === "success"
  isError        // status === "error"
} = useInternetIdentity();

// Example usage
if (isInitializing) {
  // Show initial loading state
}

if (isLoggingIn) {
  // Show login spinner
}

if (isLoginSuccess && identity) {
  // User is authenticated, show protected content
}
```

### 3. Use the `identity` context variable to access the identity

The `identity` context variable contains the identity of the currently logged in user. The identity is available after successfully loading the identity from local storage or completing the login process.

The preferred way to use the identity is to connect it to the [ic-use-actor](https://www.npmjs.com/package/ic-use-actor) hook. The hook provides a typed interface to the canister methods as well as interceptor functions for handling errors etc.

```jsx
// Actors.tsx

import { ReactNode } from "react";
import {
  ActorProvider,
  createActorContext,
  createUseActorHook,
} from "ic-use-actor";
import {
  canisterId,
  idlFactory,
} from "path-to/your-service/index";
import { _SERVICE } from "path-to/your-service.did";
import { useInternetIdentity } from "ic-use-internet-identity";

const actorContext = createActorContext<_SERVICE>();
export const useActor = createUseActorHook<_SERVICE>(actorContext);

 export default function Actors({ children }: { children: ReactNode }) {
  const { identity } = useInternetIdentity();

  return (
    <ActorProvider<_SERVICE>
      canisterId={canisterId}
      context={actorContext}
      identity={identity}
      idlFactory={idlFactory}
    >
      {children}
    </ActorProvider>
  );
}
```

## InternetIdentityProvider props

````ts
{
  /** Options for creating the {@link AuthClient}. See AuthClient documentation for list of options
   *
   *`ic-use-internet-identity` defaults to disabling the AuthClient idle handling (clearing identities
   * from store and reloading the window when user is idle). If that behaviour is preferred, set these settings:
   *
   * ```
   * const options = {
   *   idleOptions: {
   *     disableDefaultIdleCallback: false,
   *     disableIdle: false,
   *   },
   * }
   * ```
   */
  createOptions?: AuthClientCreateOptions;

  /** Options that determine the behaviour of the {@link AuthClient} login call. These options are a subset of
   * the {@link AuthClientLoginOptions}. */
  loginOptions?: LoginOptions;

  /** Clear the identity automatically on expiration. Default value is `true`. */
  clearIdentityOnExpiry?: boolean;

  /** The child components that the InternetIdentityProvider will wrap. This allows any child
   * component to access the authentication context provided by the InternetIdentityProvider. */
  children: ReactNode;
}
````

## LoginOptions

The `LoginOptions` interface extends `AuthClientLoginOptions` from `@dfinity/auth-client` with some modifications:

```ts
import type { AuthClientLoginOptions } from "@dfinity/auth-client";

export interface LoginOptions
  extends Omit<
    AuthClientLoginOptions,
    "onSuccess" | "onError" | "maxTimeToLive"
  > {
  /**
   * Expiration of the authentication in nanoseconds
   * @default BigInt(3_600_000_000_000) nanoseconds (1 hour)
   */
  maxTimeToLive?: bigint;
}
```

This means you can use all properties from `AuthClientLoginOptions` except `onSuccess`, `onError`. Available properties include:

- **`identityProvider?: string | URL`** - Identity provider URL (defaults to `https://identity.ic0.app`)
- **`maxTimeToLive?: bigint`** - Session expiration (defaults to 1 hour)
- **`allowPinAuthentication?: boolean`** - Allow PIN/temporary key authentication
- **`derivationOrigin?: string | URL`** - Origin for delegated identity generation
- **`windowOpenerFeatures?: string`** - Popup window configuration
- **`customValues?: Record<string, unknown>`** - Extra values for login request

## useInternetIdentity interface

```ts
export type Status =
  | "initializing"
  | "idle"
  | "logging-in"
  | "success"
  | "error";

export type InternetIdentityContext = {
  /** The identity is available after successfully loading the identity from local storage
   * or completing the login process. */
  identity?: Identity;

  /** Connect to Internet Identity to login the user. */
  login: () => void;

  /** Clears the identity from the state and local storage. Effectively "logs the user out". */
  clear: () => void;

  /** The status of the login process. Note: The login status is not affected when a stored
   * identity is loaded on mount. */
  status: Status;

  /** `status === "initializing"` */
  isInitializing: boolean;

  /** `status === "idle"` */
  isIdle: boolean;

  /** `status === "logging-in"` */
  isLoggingIn: boolean;

  /** `status === "success"` */
  isLoginSuccess: boolean;

  /** `status === "error"` */
  isError: boolean;

  /** Login error. Unsurprisingly. */
  error?: Error;
};
```

## Error Handling

The library handles all errors through its state management system. You don't need try/catch blocks - simply monitor the `error` and `isError` state:

```tsx
import { useInternetIdentity } from "ic-use-internet-identity";

export function LoginComponent() {
  const { login, error, isError, status } = useInternetIdentity();

  return (
    <div>
      <button
        onClick={login}
        disabled={status === "logging-in"}
      >
        {status === "logging-in" ? "Logging in..." : "Login"}
      </button>

      {isError && (
        <div style={{ color: "red" }}>
          Login error: {error?.message}
        </div>
      )}
    </div>
  );
}
```

## Router integration

When using `ic-use-internet-identity` with routing libraries (for example, TanStack Router), it's recommended to handle the initialization phase before allowing navigation to protected routes. The library exports utility functions that work outside of React components and can be used with many routing libraries — TanStack Router is shown here as an example.

### Available Functions

```typescript
// Wait for the identity initialization to complete and get restored identity
ensureInitialized(): Promise<Identity | undefined>

// Check if user is authenticated 
isAuthenticated(): boolean

// Get the current identity 
getIdentity(): Identity | undefined
```

### Basic Example

Here's how to protect routes (example: TanStack Router):

```tsx
import { createRoute, redirect } from "@tanstack/react-router";
import { ensureInitialized, isAuthenticated } from "ic-use-internet-identity";

// Protected route example
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
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

### Client-side (reactive) Auth Guard

Note: `beforeLoad` is executed during navigation and does **not** re-run when authentication state changes. If a user signs out after a route has already loaded, the `beforeLoad` hook will not be invoked again. To handle dynamic changes in authentication (for example, user-initiated sign out), provide a React component that observes the hook and reacts to changes at runtime.

```tsx
import { useRouter } from "@tanstack/react-router";
import { useInternetIdentity } from "ic-use-internet-identity";
import { useEffect } from "react";

export function AuthGuard() {
  const router = useRouter();
  const { identity } = useInternetIdentity();

  useEffect(() => {
    if (!identity) {
      void router.invalidate() // This forces beforeLoad to be re-run and user directed to login page
    }
  }, [identity, router]);

  return null;
}
```

### Creating a Route Guard Helper

For multiple protected routes you can extract a small `beforeLoad` helper and use file-route helpers (the example below uses TanStack Router). Below are two patterns: a simple `authenticateRoute()` helper and an example showing how to create a protected file route with `createFileRoute`.

```ts
// authenticateRoute helper function: src/lib/authenticate-route.ts
import { isRedirect, redirect } from "@tanstack/react-router";
import { ensureInitialized } from "ic-use-internet-identity";

export async function authenticateRoute() {
  try {
    const identity = await ensureInitialized();
    if (!identity) {
      // No identity -> redirect to login
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/login" });
    }
    // Additional initialization, authenticate actor, etc.
  } catch (err) {
    if (isRedirect(e)) throw e // Re-throw if error is a redirect
    console.error("Identity initialization failed:", err);
    // Initialization error — redirect to an error page
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: "/error" });
  }
}
```

```ts
// Example file route: src/routes/about.tsx
import { createFileRoute } from "@tanstack/react-router";
import { authenticateRoute } from "../lib/authenticate-route";
import About from "../components/About";

export const Route = createFileRoute("/about")({
  beforeLoad: async () => authenticateRoute(),
  component: About,
});
```

### Important Notes

1. **Always await initialization**: The `ensureInitialized()` function ensures the library has finished checking for cached identities before making routing decisions.

2. **Double-check in components**: `beforeLoad` runs once during navigation and does not react to later authentication changes (for example, when a user signs out). Use the `useInternetIdentity` hook in your components — or the `AuthGuard` component above — to observe auth state changes and perform redirects or show fallback UI.

3. **Handle loading states**: During initialization (< 1 second), consider showing a loading spinner or splash screen.

4. **Redirect patterns**: You can either redirect to a login page or let components handle the unauthenticated state based on your UX preferences.

## Security Considerations

- **Delegation Expiry**: By default, delegations expire after 1 hour and the identity state is automatically reset. Monitor `identity` for changes and handle re-authentication.
- **Secure Storage**: Identities are stored in browser local storage. Consider the security implications for your use case.
- **Session Management**: The library automatically clears the identity on expiry by default. To disable, set `clearIdentityOnExpiry={false}` on the `InternetIdentityProvider`. Consider your app's security requirements.

## Updates

See the [CHANGELOG](CHANGELOG.md) for details on updates.

## Author

- [kristofer@kristoferlund.se](mailto:kristofer@kristoferlund.se)
- Twitter: [@kristoferlund](https://twitter.com/kristoferlund)
- Discord: kristoferkristofer
- Telegram: [@kristoferkristofer](https://t.me/kristoferkristofer)

## Contributing

Contributions are welcome. Please submit your pull requests or open issues to propose changes or report bugs.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.

[version-image]: https://img.shields.io/npm/v/ic-use-internet-identity
[dl-image]: https://img.shields.io/npm/dw/ic-use-internet-identity
[npm-link]: https://www.npmjs.com/package/ic-use-internet-identity

```
