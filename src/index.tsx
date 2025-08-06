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
import type { InternetIdentityContext, Status } from "./context.type";
import { DelegationIdentity, isDelegationValid } from "@dfinity/identity";

const ONE_HOUR_IN_NANOSECONDS = BigInt(3_600_000_000_000);

export interface StoreContext {
  providerComponentPresent: boolean;
  authClient?: AuthClient;
  createOptions?: AuthClientCreateOptions;
  loginOptions?: LoginOptions;
  isInitializing: boolean;
  status: Status;
  error?: Error;
  identity?: Identity;
}

type StoreEvent = { type: "setState" } & Partial<StoreContext>;

const initialContext: StoreContext = {
  providerComponentPresent: false,
  authClient: undefined,
  createOptions: undefined,
  loginOptions: undefined,
  isInitializing: false,
  status: "idle",
  error: undefined,
  identity: undefined,
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
 * Create the auth client with default options or options provided by the user.
 */
async function createAuthClient(): Promise<AuthClient> {
  const createOptions = store.getSnapshot().context.createOptions;
  const options: AuthClientCreateOptions = {
    idleOptions: {
      // Default behaviour of this hook is not to logout and reload window on identity expiration
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
 * Helper function to set error state.
 */
function setError(errorMessage: string) {
  store.send({
    type: "setState",
    status: "error" as const,
    error: new Error(errorMessage),
  });
}

/**
 * Connect to Internet Identity to login the user.
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

  const loginOptions = context.loginOptions;

  if (!process.env.II_URL) {
    setError("Internet Identity URL is not configured");
    return;
  }

  const options: AuthClientLoginOptions = {
    identityProvider: process.env.II_URL,
    onSuccess: onLoginSuccess,
    onError: onLoginError,
    maxTimeToLive: ONE_HOUR_IN_NANOSECONDS,
    ...loginOptions,
  };

  store.send({ type: "setState", status: "logging-in" as const });
  void authClient.login(options);
  return;
}

/**
 * Callback, login was successful. Saves identity to state.
 */
function onLoginSuccess(): void {
  const identity = store.getSnapshot().context.authClient?.getIdentity();
  if (!identity) {
    setError("Identity not found after successful login");
    return;
  }
  store.send({
    type: "setState",
    identity,
    status: "success" as const,
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
    .then(() => {
      store.send({
        type: "setState",
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
    isInitializing: context.isInitializing,
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
 */
export function InternetIdentityProvider({
  children,
  createOptions,
  loginOptions,
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
}) {
  // Effect runs on mount. Creates an AuthClient and attempts to load a saved identity.
  useEffect(() => {
    void (async () => {
      try {
        store.send({
          type: "setState",
          providerComponentPresent: true,
          isInitializing: true,
          createOptions,
          loginOptions,
        });
        let authClient = store.getSnapshot().context.authClient;
        authClient ??= await createAuthClient();
        const isAuthenticated = await authClient.isAuthenticated();
        if (isAuthenticated) {
          const identity = authClient.getIdentity();
          store.send({ type: "setState", identity });
        }
      } catch (error) {
        store.send({
          type: "setState",
          status: "error" as const,
          error:
            error instanceof Error ? error : new Error("Initialization failed"),
        });
      } finally {
        store.send({ type: "setState", isInitializing: false });
      }
    })();
  }, [createOptions, loginOptions]);

  return children;
}
