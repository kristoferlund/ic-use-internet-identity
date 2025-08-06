# ic-use-internet-identity

[Internet Identity](https://internetcomputer.org/how-it-works/web-authentication-identity) is an authentication service running on the [Internet Computer](https://internetcomputer.org). It allows users to create an identity that can be used to authenticate with canisters (smart contracts) running on the Internet Computer.

`ic-use-internet-identity` is a hook that makes it easy to integrate Internet Identity into your React application. It provides a simple interface for logging in and out with the Internet Identity service.

[![version][version-image]][npm-link]
[![downloads][dl-image]][npm-link]

## Features

- **Cached Identity**: The identity is cached in local storage and restored on page load. This allows the user to stay logged in even if the page is refreshed.
- **Login progress**: State variables are provided to indicate whether the user is logged in, logging in, or logged out.
- **Works with ic-use-actor**: Plays nicely with [ic-use-actor](https://www.npmjs.com/package/ic-use-actor) that provides easy access to canister methods.

## Table of Contents

- [ic-use-internet-identity](#ic-use-internet-identity)
  - [Features](#features)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Prerequisites](#prerequisites)
    - [1. Setup the `InternetIdentityProvider` component](#1-setup-the-internetidentityprovider-component)
    - [2. Connect the `login()` function to a button](#2-connect-the-login-function-to-a-button)
    - [3. Use the `identity` context variable to access the identity](#3-use-the-identity-context-variable-to-access-the-identity)
  - [InternetIdentityProvider props](#internetidentityprovider-props)
  - [LoginOptions](#loginoptions)
  - [useInternetIdentity interface](#useinternetidentity-interface)
  - [Error Handling](#error-handling)
  - [Security Considerations](#security-considerations)
  - [Troubleshooting](#troubleshooting)
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

> [!IMPORTANT]
> **Required Environment Variable**: You MUST set the `II_URL` environment variable or the login will fail. The library does not provide a default fallback.
>
> - Production: `https://identity.ic0.app`
> - Local development: `http://${CANISTER_ID_INTERNET_IDENTITY}.localhost:4943`
>
> Example for Vite, using the [vite-plugin-environment](https://www.npmjs.com/package/vite-plugin-environment) plugin:
>
> ```javascript
> // vite.config.js
> import environment from "vite-plugin-environment";
>
> process.env.II_URL =
>   process.env.DFX_NETWORK === "local"
>     ? `http://${process.env.CANISTER_ID_INTERNET_IDENTITY}.localhost:4943`
>     : `https://identity.ic0.app`;
>
> export default defineConfig({
>   // ...
>   plugins: [
>     // ...
>     environment(["II_URL"]),
>   ],
>   // ...
> });
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

- **`"idle"`** → Initial state, ready to login
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
  isIdle,        // status === "idle"
  isLoggingIn,   // status === "logging-in"
  isLoginSuccess, // status === "success"
  isError        // status === "error"
} = useInternetIdentity();

// Example usage
if (isLoggingIn) {
  // Show loading spinner
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
   * from store and reloading the window on identity expiry). If that behaviour is preferred, set these settings:
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

  /** The child components that the InternetIdentityProvider will wrap. This allows any child
   * component to access the authentication context provided by the InternetIdentityProvider. */
  children: ReactNode;
}
````

## LoginOptions

```ts
export type LoginOptions = {
  /**
   * Expiration of the authentication in nanoseconds
   * @default  BigInt(3_600_000_000_000) nanoseconds (1 hour)
   */
  maxTimeToLive?: bigint;
  /**
   * If present, indicates whether or not the Identity Provider should allow the user to authenticate and/or register using a temporary key/PIN identity. Authenticating dapps may want to prevent users from using Temporary keys/PIN identities because Temporary keys/PIN identities are less secure than Passkeys (webauthn credentials) and because Temporary keys/PIN identities generally only live in a browser database (which may get cleared by the browser/OS).
   */
  allowPinAuthentication?: boolean;
  /**
   * Origin for Identity Provider to use while generating the delegated identity. For II, the derivation origin must authorize this origin by setting a record at `<derivation-origin>/.well-known/ii-alternative-origins`.
   * @see https://github.com/dfinity/internet-identity/blob/main/docs/internet-identity-spec.adoc
   */
  derivationOrigin?: string | URL;
  /**
   * Auth Window feature config string
   * @example "toolbar=0,location=0,menubar=0,width=500,height=500,left=100,top=100"
   */
  windowOpenerFeatures?: string;
  /**
   * Extra values to be passed in the login request during the authorize-ready phase
   */
  customValues?: Record<string, unknown>;
};
```

## useInternetIdentity interface

```ts
export type Status = "error" | "logging-in" | "success" | "idle";

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

  /** Is set to `true` on mount until a stored identity is loaded from local storage or
   * none is found. */
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

## Security Considerations

- **Delegation Expiry**: By default, delegations expire after 1 hour. Monitor `identity` for changes and handle re-authentication.
- **Secure Storage**: Identities are stored in browser local storage. Consider the security implications for your use case.
- **Session Management**: The library disables automatic logout on idle by default. Consider your app's security requirements.

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
