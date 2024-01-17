import type { Identity } from "@dfinity/agent";
import type { LoginStatus } from "./state.type";

export type InternetIdentityContextType = {
  /** Is set to `true` on mount until a stored identity is loaded from local storage or
   * none is found. */
  isInitializing: boolean;

  /** Connect to Internet Identity to login the user. */
  login: () => Promise<void>;

  /** The status of the login process. Note: The login status is not affected when a stored
   * identity is loaded on mount. */
  loginStatus: LoginStatus;

  /** `loginStatus === "logging-in"` */
  isLoggingIn: boolean;

  /** `loginStatus === "error"` */
  isLoginError: boolean;

  /** `loginStatus === "success"` */
  isLoginSuccess: boolean;

  /** `loginStatus === "idle"` */
  isLoginIdle: boolean;

  /** Login error. Unsurprisingly. */
  loginError?: Error;

  /** Clears the identity from the state and local storage. Effectively "logs the user out". */
  clear: () => Promise<void>;

  /** The identity is available after successfully loading the identity from local storage
   * or completing the login process. */
  identity?: Identity;
};
