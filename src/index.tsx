import { createStore } from "@xstate/store";
import { useSelector } from "@xstate/store/react";
import type { LoginStatus } from "./state.type";
import { type ReactNode, useEffect } from "react";
import {
  AuthClient,
  type AuthClientCreateOptions,
  type AuthClientLoginOptions,
} from "@dfinity/auth-client";
import type { LoginOptions } from "./login-options.type";
import type { Identity } from "@dfinity/agent";
import type { InternetIdentityContextType } from "./context.type";
import { DelegationIdentity, isDelegationValid } from "@dfinity/identity";

interface Context {
  providerComponentPresent: boolean;
  authClient?: AuthClient;
  createOptions?: AuthClientCreateOptions;
  loginOptions?: LoginOptions;
  isInitializing: boolean;
  loginStatus: LoginStatus;
  loginError?: Error;
  identity?: Identity;
}

const initialContext: Context = {
  providerComponentPresent: false,
  authClient: undefined,
  createOptions: undefined,
  loginOptions: undefined,
  isInitializing: false,
  loginStatus: "idle",
  loginError: undefined,
  identity: undefined,
};

const store = createStore({
  context: initialContext,
  on: {
    setProviderComponentPresent: {
      providerComponentPresent: (
        _,
        event: { providerComponentPresent: boolean },
      ) => event.providerComponentPresent,
    },
    setAuthClient: {
      authClient: (_, event: { authClient?: AuthClient }) => event.authClient,
    },
    setCreateOptions: {
      createOptions: (_, event: { createOptions?: AuthClientCreateOptions }) =>
        event.createOptions,
    },
    setLoginOptions: {
      loginOptions: (_, event: { loginOptions?: LoginOptions }) =>
        event.loginOptions,
    },
    setIsInitializing: {
      isInitializing: (_, event: { isInitializing: boolean }) =>
        event.isInitializing,
    },
    setLoginStatus: {
      loginStatus: (_, event: { loginStatus: LoginStatus }) =>
        event.loginStatus,
    },
    setIdentity: {
      identity: (_, event: { identity?: Identity }) => event.identity,
    },
    setLoginError: {
      loginError: (_, event: { loginError?: Error }) => event.loginError,
    },
  },
});

/**
 * Create the auth client with default options or options provided by the user.
 */
async function createAuthClient(): Promise<AuthClient> {
  const createOptions = store.getSnapshot().context.createOptions;
  const options: AuthClientCreateOptions = {
    idleOptions: {
      // Default behaviour of this hook is not to logout and reload window on indentity expiration
      disableDefaultIdleCallback: true,
      disableIdle: true,
      ...createOptions?.idleOptions,
    },
    ...createOptions,
  };
  const authClient = await AuthClient.create(options);
  store.send({ type: "setAuthClient", authClient });
  return authClient;
}

/**
 * Connect to Internet Identity to login the user.
 */
function login() {
  const context = store.getSnapshot().context;

  if (!context.providerComponentPresent) {
    throw new Error(
      "The InternetIdentityProvider component is not present. Make sure to wrap your app with it.",
    );
  }

  const authClient = context.authClient;

  if (!authClient) {
    // AuthClient should have a value at this point, unless `login` was called immediately with e.g. useEffect,
    // doing so would be incorrect since a browser popup window can only be reliably opened on user interaction.
    throw new Error(
      "AuthClient is not initialized yet, make sure to call `login` on user interaction e.g. click.",
    );
  }

  const identity = authClient.getIdentity();

  // We avoid using `authClient.isAuthenticated` since that's async and would potentially block the popup window,
  // instead we work around this by checking the principal and delegation validity, which gives us the same info.
  if (
    !identity.getPrincipal().isAnonymous() &&
    isDelegationValid((identity as DelegationIdentity).getDelegation())
  ) {
    throw new Error("User is already authenticated");
  }

  const loginOptions = context.loginOptions;
  const options: AuthClientLoginOptions = {
    identityProvider: process.env.II_URL,
    onSuccess: onLoginSuccess,
    onError: onLoginError,
    maxTimeToLive: BigInt(3_600_000_000_000), // Defaults to 1 hour
    ...loginOptions,
  };

  store.send({ type: "setLoginStatus", loginStatus: "logging-in" });
  return authClient.login(options);
}

/**
 * Callback, login was successful. Saves identity to state.
 */
function onLoginSuccess() {
  const identity = store.getSnapshot().context.authClient?.getIdentity();
  if (!identity) {
    throw new Error("Identity not found after successful login");
  }
  store.send({ type: "setIdentity", identity });
  store.send({ type: "setLoginStatus", loginStatus: "success" });
}

/**
 * Login was not successful. Sets loginError.
 */
function onLoginError(error?: string) {
  store.send({ type: "setLoginStatus", loginStatus: "error" });
  store.send({ type: "setLoginError", loginError: new Error(error) });
}

/**
 * Clears the identity from the state and local storage. Effectively "logs the
 * user out".
 */
async function clear() {
  const authClient = store.getSnapshot().context.authClient;
  if (!authClient) {
    throw new Error("Auth client not initialized");
  }
  await authClient.logout();

  store.send({ type: "setIdentity", identity: undefined });
  store.send({ type: "setLoginStatus", loginStatus: "idle" });
  store.send({ type: "setLoginError", loginError: undefined });
}

/**
 * Hook to access the internet identity as well as login status along with
 * login and clear functions.
 */
export const useInternetIdentity = (): InternetIdentityContextType => {
  const context = useSelector(store, (state) => state.context);
  return {
    isInitializing: context.isInitializing,
    login,
    loginStatus: context.loginStatus,
    loginError: context.loginError,
    isLoggingIn: context.loginStatus === "logging-in",
    isLoginError: context.loginStatus === "error",
    isLoginSuccess: context.loginStatus === "success",
    isLoginIdle: context.loginStatus === "idle",
    clear,
    identity: context.identity,
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
      store.send({
        type: "setProviderComponentPresent",
        providerComponentPresent: true,
      });
      store.send({ type: "setIsInitializing", isInitializing: true });
      store.send({ type: "setCreateOptions", createOptions });
      store.send({ type: "setLoginOptions", loginOptions });
      let authClient = store.getSnapshot().context.authClient;
      authClient ??= await createAuthClient();
      const isAuthenticated = await authClient.isAuthenticated();
      if (isAuthenticated) {
        const identity = authClient.getIdentity();
        store.send({ type: "setIdentity", identity });
      }
      store.send({ type: "setIsInitializing", isInitializing: false });
    })();
  }, [createOptions, loginOptions]);

  return children;
}
