import { randomUUID } from 'node:crypto';
import { Request } from '@/scopes/scopes';
import { Insert } from '@/building-blocks/assembler';
import { UserMetadata } from '@/components/user_metadata';
import { Authentication } from '@/components/authentication';

/**
 * Encapsulates request-scoped metadata shared across downstream services.
 *
 * The {@link Request} decorator ensures each inbound request receives an isolated
 * instance. Optional {@link UserMetadata} and {@link Authentication} dependencies
 * are inserted lazily so consumers can interrogate them without eagerly
 * constructing user- or auth-specific state.
 *
 * @example
 * ```ts
 * import { RequestMetadata } from '@/components/request_metadata';
 *
 * function handleRequest(metadata: RequestMetadata) {
 *   const requestId = metadata.getRequestId();
 *   const user = metadata.getUserMetadata();
 *   const auth = metadata.getAuthentication();
 *   // ... use request context objects downstream
 * }
 * ```
 */
@Request
class RequestMetadata {
  requestId: string;

  @Insert(UserMetadata, true)
  userMetadata?: UserMetadata;

  @Insert(Authentication, true)
  authentication?: Authentication;

  constructor(requestId: string = randomUUID()) {
    this.requestId = requestId;
  }

  setRequestId(id: string) {
    this.requestId = id;
  }

  getRequestId() {
    return this.requestId;
  }

  getUserMetadata() {
    return this.userMetadata;
  }

  getAuthentication() {
    return this.authentication;
  }
}

export { RequestMetadata };
