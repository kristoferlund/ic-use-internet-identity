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
