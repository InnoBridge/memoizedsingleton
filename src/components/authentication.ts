import { Request } from '@/scopes/scopes';

enum AuthenticationMethod {
  JWT = 'jwt',
  API_KEY = 'apiKey',
  SESSION = 'session',
  MTLS = 'mtls',
  NONE = 'none'
}

/**
 * Seed values for configuring an {@link Authentication} instance.
 */
interface AuthenticationOptions {
  /** Primary mechanism used to authenticate the request. Defaults to {@link AuthenticationMethod.NONE}. */
  method?: AuthenticationMethod;
  /** Whether the upstream authentication check already succeeded. Defaults to `false`. */
  isAuthenticated?: boolean;
  /** Session identifier associated with the request (e.g. cookie-backed session). */
  sessionId?: string;
  /** Identifier referencing the API key used to authorize the request. */
  apiKeyId?: string;
  /** Access token representing the user/application for the current request. */
  accessToken?: string;
  /** Refresh token issued alongside the access token, if applicable. */
  refreshToken?: string;
  /** Encoded JSON Web Token when JWT is the active method. */
  jwt?: string;
}

/**
 * Captures authentication state for the active request scope.
 *
 * Decorated with {@link Request}, so every call wrapped in
 * {@link initializeRequestContext} receives an isolated instance. This enables
 * middleware or handlers to mutate authentication details without leaking them
 * across concurrent requests.
 *
 * @example
 * initializeRequestContext(() => {
 *   const auth = new Authentication();
 *   auth.setMethod(AuthenticationMethod.JWT);
 *   auth.setJwt(decodedJwt);
 *   auth.setAuthenticated(true);
 *   // ... later middleware can resolve the same instance via @Insert
 * });
 */
@Request
class Authentication {
  private method: AuthenticationMethod;
  private isAuthenticated: boolean;
  private sessionId?: string;
  private apiKeyId?: string;
  private accessToken?: string;
  private refreshToken?: string;
  private jwt?: string;

  /**
   * Creates a new request-scoped authentication snapshot.
   *
   * @param options - Optional seed values for the authentication state.
   */
  constructor(options: AuthenticationOptions = {}) {
    this.method = options.method ?? AuthenticationMethod.NONE;
    this.isAuthenticated = options.isAuthenticated ?? false;
    this.sessionId = options.sessionId;
    this.apiKeyId = options.apiKeyId;
    this.accessToken = options.accessToken;
    this.refreshToken = options.refreshToken;
    this.jwt = options.jwt;
  }

  getMethod(): AuthenticationMethod {
    return this.method;
  }

  setMethod(method: AuthenticationMethod): void {
    this.method = method;
  }

  getIsAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  setAuthenticated(authenticated: boolean): void {
    this.isAuthenticated = authenticated;
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  setSessionId(id?: string): void {
    this.sessionId = id;
  }

  getApiKeyId(): string | undefined {
    return this.apiKeyId;
  }

  setApiKeyId(id?: string): void {
    this.apiKeyId = id;
  }

  getAccessToken(): string | undefined {
    return this.accessToken;
  }

  setAccessToken(token?: string): void {
    this.accessToken = token;
  }

  getRefreshToken(): string | undefined {
    return this.refreshToken;
  }

  setRefreshToken(token?: string): void {
    this.refreshToken = token;
  }

  getJwt(): string | undefined {
    return this.jwt;
  }

  setJwt(jwt?: string): void {
    this.jwt = jwt;
  }

  /** Resets the authentication state to unauthenticated defaults. */
  clear(): void {
    this.method = AuthenticationMethod.NONE;
    this.isAuthenticated = false;
    this.sessionId = undefined;
    this.apiKeyId = undefined;
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.jwt = undefined;
  }
}

export {
  Authentication,
  AuthenticationMethod,
  AuthenticationOptions
};
