import type { AuthClientLoginOptions } from "@dfinity/auth-client";

export interface LoginOptions
  extends Omit<
    AuthClientLoginOptions,
    "onSuccess" | "onError" | "maxTimeToLive"
  > {
  /**
   * Expiration of the authentication in nanoseconds
   * @default  BigInt(3_600_000_000_000) nanoseconds (1 hour)
   */
  maxTimeToLive?: bigint;
}
