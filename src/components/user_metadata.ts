import { Request } from '@/scopes/scopes';

interface UserMetadataOptions {
  userId?: string;
  sessionId?: string;
  abc?: string;
}

/**
 * Tracks identity and session information for the active request scope.
 *
 * The `@Request` decorator ensures a new instance is created for every
 * execution wrapped in {@link initializeRequestContext}. Mutations apply only to the
 * current request, keeping concurrent requests isolated.
 *
 * @example
 * initializeRequestContext(() => {
 *   const metadata = new UserMetadata();
 *   metadata.setUserId('user-123');
 *   // ... downstream code can read the same instance via dependency injection
 * });
 */
@Request
class UserMetadata {
  private userId?: string;
  private sessionId?: string;

  constructor(options: UserMetadataOptions = {}) {
    console.log('UserMetadata instantiated with options:', options);
    this.userId = options.userId;
    this.sessionId = options.sessionId;
  }

  /**
   * Returns the identifier associated with the current user.
   * @returns The user id, or `undefined` when the request is anonymous.
   */
  getUserId(): string | undefined {
    return this.userId;
  }

  /**
   * Returns the session identifier bound to this request.
   * @returns The session id, or `undefined` if no session is attached.
   */
  getSessionId(): string | undefined {
    return this.sessionId;
  }

  /**
   * Overrides the current user identifier for this request.
   * @param id The resolved user id; pass `undefined` to clear.
   */
  setUserId(id?: string): void {
    this.userId = id;
  }

  /**
   * Overrides the session identifier associated with this request.
   * @param id Session identifier, or `undefined` to remove it.
   */
  setSessionId(id?: string): void {
    this.sessionId = id;
  }

  /**
   * Removes all user metadata and resets the request to an anonymous state.
   */
  clear(): void {
    this.userId = undefined;
    this.sessionId = undefined;
  }
}

export {
  UserMetadata,
  UserMetadataOptions
};
