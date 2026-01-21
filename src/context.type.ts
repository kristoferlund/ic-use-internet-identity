import type { Identity } from "@icp-sdk/core/agent";
import type { DelegationChain } from "@icp-sdk/core/identity";

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

  /** Get the delegation chain from the current identity. Useful for accessing session expiration.
   * Returns undefined if not authenticated or not a DelegationIdentity.
   * @example
   * ```ts
   * const delegation = getDelegation();
   * if (delegation) {
   *   const expiration = delegation.delegations[0]?.delegation.expiration;
   *   console.log('Session expires at:', new Date(Number(expiration / 1_000_000n)));
   * }
   * ```
   */
  getDelegation: () => DelegationChain | undefined;

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
