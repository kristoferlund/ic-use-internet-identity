import type { AuthClient } from "@dfinity/auth-client";
import type { Identity } from "@dfinity/agent";

export type LoginStatus = "error" | "logging-in" | "success" | "idle";

export type State = {
  authClient?: AuthClient;
  isInitializing: boolean;
  loginStatus: LoginStatus;
  loginError?: Error;
  identity?: Identity;
};
