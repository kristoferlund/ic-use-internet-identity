import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";
import { type ReactNode, useEffect } from "react";
import {
  AuthClient,
  type AuthClientCreateOptions,
  type AuthClientLoginOptions,
} from "@dfinity/auth-client";
import type { LoginOptions } from "./login-options.type";
import type { Identity } from "@dfinity/agent";
import { type InternetIdentityContext, type Status } from "./context.type";
import { DelegationIdentity, isDelegationValid } from "@dfinity/identity";

const ONE_HOUR_IN_NANOSECONDS = BigInt(3_600_000_000_000);
const DEFAULT_IDENTITY_PROVIDER = "https://identity.ic0.app";

export interface StoreContext {
  providerComponentPresent: boolean;
  authClient?: AuthClient;
  createOptions?: AuthClientCreateOptions;
  loginOptions?: LoginOptions;
  status: Status;
  error?: Error;
  identity?: Identity;
  clearIdentityOnExpiry: boolean;
}

type StoreEvent = { type: "setState" } & Partial<StoreContext>;

const initialContext: StoreContext = {
  providerComponentPresent: false,
  authClient: undefined,
  createOptions: undefined,
  loginOptions: undefined,
  status: "initializing",
  error: undefined,
  identity: undefined,
  clearIdentityOnExpiry: true,
};

const store = createStore({
  context: initialContext,
  on: {
    setState: (context, event: StoreEvent) => ({
      ...context,
      ...event,
    }),
  },
});

/**
 * Initialization promise handling
 *
 * - We create a pending `initializationPromise` at module load so callers
 *   can await initialization before the provider mounts.
 * - If the provider is remounted or re-initialized, the cleanup will reject
 *   pending promises and a new one will be created on the next init.
 */
let initializationResolve: ((identity?: Identity) => void) | null = null;
let initializationReject: ((reason: Error) => void) | null = null;
let initializationPromise: Promise<Identity | undefined>;

function createInitializationPromise() {
  initializationPromise = new Promise<Identity | undefined>((resolve, reject) => {
    initializationResolve = resolve;
    initializationReject = reject;
  });
}

// Create the initial promise so callers that call `ensureInitialized()` before
// the provider mounts will properly wait for the real initialization.
createInitializationPromise();

/**
 * Ensure the Internet Identity library has been initialized.
 * Resolves with the restored `Identity` if one was found (and authenticated),
 * otherwise resolves with `undefined`. Rejects if initialization failed.
 *
 * @returns A promise that resolves when initialization is complete
 *          and yields the identity (or `undefined`).
 */
export async function ensureInitialized(): Promise<Identity | undefined> {
  const status = store.getSnapshot().context.status;

  // If initialization errored, throw the stored error
  if (status === "error") {
    const err = store.getSnapshot().context.error;
    throw err ?? new Error("Initialization failed");
  }

  // If not initializing, return the identity if authenticated, otherwise undefined
  if (status !== "initializing") {
    return isAuthenticated() ? getIdentity() : undefined;
  }

  // Otherwise wait for the initialization promise
  return initializationPromise;
}

/**
 * Check if the user is currently authenticated.
 * This can be used outside of React components, for example in route guards.
 *
 * @returns true if the user has a valid identity, false otherwise
 */
export function isAuthenticated(): boolean {
  const context = store.getSnapshot().context;
  const identity = context.identity;

  if (!identity) {
    return false;
  }

  // Check if the identity is valid (not anonymous and delegation is still valid)
  if (
    !identity.getPrincipal().isAnonymous() &&
    identity instanceof DelegationIdentity &&
    isDelegationValid(identity.getDelegation())
  ) {
    return true;
  }

  return false;
}

/**
 * Get the current identity if authenticated.
 * This can be used outside of React components.
 *
 * @returns The current identity or undefined
 */
export function getIdentity(): Identity | undefined {
  return store.getSnapshot().context.identity;
}

/**
 * Create the auth client with default options or options provided by the user.
 */
async function createAuthClient(): Promise<AuthClient> {
  const createOptions = store.getSnapshot().context.createOptions;
  const options: AuthClientCreateOptions = {
    idleOptions: {
      // Default behaviour of this hook is not to logout and reload window on user being idle
      disableDefaultIdleCallback: true,
      disableIdle: true,
      ...createOptions?.idleOptions,
    },
    ...createOptions,
  };
  const authClient = await AuthClient.create(options);
  store.send({ type: "setState", authClient });
  return authClient;
}

/**
 * Helper function to set error state. Accepts either Error or string.
 */
function setError(err: Error | string) {
  const errorObj = typeof err === "string" ? new Error(err) : err;
  store.send({
    type: "setState",
    status: "error" as const,
    error: errorObj,
  });
}

/**
 * Connect to Internet Identity to login the user.
 *
 * This function initiates the Internet Identity authentication process by:
 * 1. Validating prerequisites (provider present, auth client initialized, user not already authenticated)
 * 2. Opening a popup window to the Identity Provider
 * 3. Setting status to "logging-in" and handling the result through state management
 *
 * All results (success/error) are communicated through the hook's state - monitor `status`, `error`, and `identity`.
 *
 * @throws No exceptions - all errors are handled via state management
 * @returns void - results available through hook state
 */
function login(): void {
  const context = store.getSnapshot().context;

  if (!context.providerComponentPresent) {
    setError(
      "The InternetIdentityProvider component is not present. Make sure to wrap your app with it.",
    );
    return;
  }

  const authClient = context.authClient;
  if (!authClient) {
    // AuthClient should have a value at this point, unless `login` was called immediately with e.g. useEffect,
    // doing so would be incorrect since a browser popup window can only be reliably opened on user interaction.
    setError(
      "AuthClient is not initialized yet, make sure to call `login` on user interaction e.g. click.",
    );
    return;
  }

  const identity = authClient.getIdentity();
  if (
    // We avoid using `authClient.isAuthenticated` since that's async and would potentially block the popup window,
    // instead we work around this by checking the principal and delegation validity, which gives us the same info.
    !identity.getPrincipal().isAnonymous() &&
    identity instanceof DelegationIdentity &&
    isDelegationValid(identity.getDelegation())
  ) {
    setError("User is already authenticated");
    return;
  }

  const options: AuthClientLoginOptions = {
    identityProvider: DEFAULT_IDENTITY_PROVIDER,
    onSuccess: onLoginSuccess,
    onError: onLoginError,
    maxTimeToLive: ONE_HOUR_IN_NANOSECONDS,
    ...context.loginOptions,
  };

  store.send({ type: "setState", status: "logging-in" as const, error: undefined });
  void authClient.login(options);
  return;
}

/**
 * Callback, login was successful. Saves identity to state.
 */
function onLoginSuccess(): void {
  const context = store.getSnapshot().context;
  const identity = context.authClient?.getIdentity();
  if (!identity) {
    setError("Identity not found after successful login");
    return;
  }

  // Clear identity one second before it expires
  if (context.clearIdentityOnExpiry) {
    const maxTimeToLiveMs = context.loginOptions?.maxTimeToLive ? Number(context.loginOptions.maxTimeToLive / 1_000_000n) : Number(ONE_HOUR_IN_NANOSECONDS / 1_000_000n);
    setTimeout(clear, maxTimeToLiveMs - 1000);
  }

  store.send({
    type: "setState",
    identity,
    status: "success" as const,
    error: undefined,
  });
}

/**
 * Login was not successful. Sets loginError.
 */
function onLoginError(error?: string): void {
  setError(error ?? "Login failed");
}

/**
 * Clears the identity from the state and local storage. Effectively "logs the
 * user out".
 */
function clear(): void {
  const authClient = store.getSnapshot().context.authClient;
  if (!authClient) {
    setError("Auth client not initialized");
    return;
  }

  void authClient
    .logout()
    .then(async () => {
      const authClient = await createAuthClient();
      store.send({
        type: "setState",
        authClient,
        identity: undefined,
        status: "idle" as const,
        error: undefined,
      });
    })
    .catch((error: unknown) => {
      store.send({
        type: "setState",
        status: "error" as const,
        error: error instanceof Error ? error : new Error("Logout failed"),
      });
    });
}

/**
 * Hook to access the internet identity as well as login status along with
 * login and clear functions.
 */
export const useInternetIdentity = (): InternetIdentityContext => {
  const context = useSelector(store, (state) => state.context);
  return {
    identity: context.identity,
    login,
    clear,
    status: context.status,
    isInitializing: context.status === "initializing",
    isIdle: context.status === "idle",
    isLoggingIn: context.status === "logging-in",
    isLoginSuccess: context.status === "success",
    isError: context.status === "error",
    error: context.error,
  };
};

/**
 * The InternetIdentityProvider component makes the saved identity available
 * after page reloads. It also allows you to configure default options
 * for AuthClient and login.
 *
 * By default, the component uses the main Internet Identity service at
 * https://identity.ic0.app. For local development, you can override this
 * by setting the identityProvider in loginOptions:
 *
 * @example
 * ```tsx
 * <InternetIdentityProvider
 *   loginOptions={{
 *     identityProvider: process.env.DFX_NETWORK === "local"
 *       ? `http://${process.env.CANISTER_ID_INTERNET_IDENTITY}.localhost:4943`
 *       : "https://identity.ic0.app"
 *   }}
 * >
 *   <App />
 * </InternetIdentityProvider>
 * ```
 */
export function InternetIdentityProvider({
  children,
  createOptions,
  loginOptions,
  clearIdentityOnExpiry = true,
}: {
  /** The child components that the InternetIdentityProvider will wrap. This allows any child
   * component to access the authentication context provided by the InternetIdentityProvider. */
  children: ReactNode;

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
   * the {@link AuthClientLoginOptions}.
   */
  loginOptions?: LoginOptions;

  /** Clear the identity automatically on expiration. Default value is `true`. The identity is cleared one second
   * before the identity expires to avoid any issues with ICP system time and local time being out of sync.
   */
  clearIdentityOnExpiry?: boolean;
}) {
  // Effect runs on mount. Creates an AuthClient and attempts to load a saved identity.
  useEffect(() => {
    // If there is no pending initialization promise (e.g. cleaned up previously), create one.
    if (!initializationResolve) createInitializationPromise();

    void (async () => {
      try {
        store.send({
          type: "setState",
          providerComponentPresent: true,
          status: "initializing" as const,
          createOptions,
          loginOptions,
          clearIdentityOnExpiry,
        });
        let authClient = store.getSnapshot().context.authClient;
        authClient ??= await createAuthClient();

        if (await authClient.isAuthenticated()) {
          const identity = authClient.getIdentity();

          // Clear identity one second before it expires 
          if (clearIdentityOnExpiry) {
            if (identity instanceof DelegationIdentity) {
              const delegationChain = identity.getDelegation();
              const expiration = delegationChain.delegations[0]?.delegation.expiration;
              if (expiration) {
                setTimeout(clear, Number(expiration / 1_000_000n) - Date.now() - 1000);
              }
            }
          }

          store.send({
            type: "setState",
            identity,
            status: "success" as const,
            error: undefined,
          });

          // Resolve the initialization promise with the restored identity
          if (initializationResolve) {
            initializationResolve(identity);
            initializationResolve = null;
            initializationReject = null;
            initializationPromise = Promise.resolve(identity);
          }
        } else {
          store.send({ type: "setState", status: "idle" as const, error: undefined });

          // Resolve the initialization promise with undefined (no identity)
          if (initializationResolve) {
            initializationResolve(undefined);
            initializationResolve = null;
            initializationReject = null;
            initializationPromise = Promise.resolve(undefined);
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Initialization failed");
        store.send({
          type: "setState",
          status: "error" as const,
          error: err,
        });

        // Reject the initialization promise
        if (initializationReject) {
          initializationReject(err);
          initializationResolve = null;
          initializationReject = null;
          initializationPromise = Promise.reject(err);
        }
      }
    })();
  }, [createOptions, loginOptions, clearIdentityOnExpiry]);

  return children;
}

// Re-export types for external use (e.g., TanStack Router)
export type { Status, InternetIdentityContext, LoginOptions };
