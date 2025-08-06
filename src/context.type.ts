import type { Identity } from "@dfinity/agent";

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

  /** `loginStatus === "idle"` */
  isIdle: boolean;

  /** `loginStatus === "logging-in"` */
  isLoggingIn: boolean;

  /** `loginStatus === "success"` */
  isLoginSuccess: boolean;

  /** `loginStatus === "error"` */
  isError: boolean;

  /** Login error. Unsurprisingly. */
  error?: Error;
};
