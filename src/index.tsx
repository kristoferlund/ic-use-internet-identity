/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect } from "react";
import { type ReactNode, useState } from "react";
import type { InternetIdentityContextType } from "./context.type";
import {
  AuthClient,
  type AuthClientCreateOptions,
  type AuthClientLoginOptions,
} from "@dfinity/auth-client";
import type { State } from "./state.type";
import type { LoginOptions } from "./login-options.type";

/**
 * React context for managing the login state and the Internet Identity.
 */
export const InternetIdentityContext = createContext<
  InternetIdentityContextType | undefined
>(undefined);

/**
 * Hook to access the InternetIdentityContext.
 */
export const useInternetIdentity = (): InternetIdentityContextType => {
  const context = useContext(InternetIdentityContext);
  if (!context) {
    throw new Error(
      "useInternetIdentity must be used within an InternetIdentityProvider"
    );
  }
  return context;
};

/**
 * Provider component for the InternetIdentityContext.
 * Manages identity state and provides authentication-related functionalities.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function InternetIdentityProvider({
  createOptions,
  loginOptions,
  children,
}: {
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

  /** Options that determine the behaviour of the {@link AuthClient} login call. */
  loginOptions?: LoginOptions;

  /** The child components that the InternetIdentityProvider will wrap. This allows any child
   * component to access the authentication context provided by the InternetIdentityProvider. */
  children: ReactNode;
}) {
  const [state, setState] = useState<State>({
    isInitializing: true,
    loginStatus: "idle",
  });

  // Effect runs on mount. Creates an AuthClient and attempts to load a saved identity.
  useEffect(() => {
    (async () => {
      // If the auth client is already initialized, do nothing
      if (state.authClient) return;

      // Add some default options to the auth client
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
      const isAuthenticated = await authClient.isAuthenticated();

      setState((prevState) => ({
        ...prevState,
        authClient,
      }));

      if (isAuthenticated) {
        const identity = authClient.getIdentity();
        if (identity) {
          setState((prevState) => ({
            ...prevState,
            identity,
          }));
        }
      }

      setState((prevState) => ({
        ...prevState,
        isLoading: false,
      }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOptions]); // State is not included in the dependency array

  /**
   * Callback, login was successful. Saves identity to state.
   */
  function onLoginSuccess() {
    const identity = state.authClient?.getIdentity();
    if (!identity) {
      throw new Error("Identity not found after successful login");
    }
    setState((prevState) => ({
      ...prevState,
      loginStatus: "success",
      identity,
    }));
  }

  /**
   * Login was not successful. Sets loginError.
   */
  function onLoginError(error?: string | undefined) {
    setState((prevState) => ({
      ...prevState,
      loginStatus: "error",
      loginError: new Error(error),
    }));
  }

  /**
   * Connect to Internet Identity to login the user.
   */
  async function login() {
    if (!state.authClient) {
      throw new Error("Auth client not initialized");
    }

    if (await state.authClient.isAuthenticated()) {
      throw new Error("User is already authenticated");
    }

    setState((prevState) => ({
      ...prevState,
      loginStatus: "logging-in",
    }));

    const options: AuthClientLoginOptions = {
      identityProvider: process.env.II_URL,
      onSuccess: onLoginSuccess,
      onError: onLoginError,
      maxTimeToLive: BigInt(3_600_000_000_000), // Defaults to 1 hour
      ...loginOptions,
    };

    state.authClient.login(options);
  }

  /**
   * Clears the identity from the state and local storage. Effectively "logs the
   * user out".
   */
  async function clear() {
    if (!state.authClient) {
      throw new Error("Auth client not initialized");
    }
    await state.authClient.logout();

    setState((prevState) => ({
      ...prevState,
      identity: undefined,
      loginStatus: "idle",
    }));
  }

  return (
    <InternetIdentityContext.Provider
      value={{
        isInitializing: state.isInitializing,
        login,
        loginStatus: state.loginStatus,
        loginError: state.loginError,
        isLoggingIn: state.loginStatus === "logging-in",
        isLoginError: state.loginStatus === "error",
        isLoginSuccess: state.loginStatus === "success",
        isLoginIdle: state.loginStatus === "idle",
        clear,
        identity: state.identity,
      }}
    >
      {children}
    </InternetIdentityContext.Provider>
  );
}

export * from "./context.type";
export * from "./login-options.type";
