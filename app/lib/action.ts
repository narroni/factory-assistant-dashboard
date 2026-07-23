import { getSessionUser } from "./session";
import type { SessionUser } from "./session";
import type { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * Thrown when a server action is invoked without a session, or by a user whose
 * role is not permitted. Distinct from ordinary failures so callers (and any
 * future error boundary) can map it to a 401/403 rather than a 500.
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

type ActionOptions = {
  roles?: UserRole[];
  revalidate?: string[];
};

/**
 * Wraps a server action so authentication — and optionally role authorization
 * and cache revalidation — is structural rather than remembered.
 *
 * Every exported function in a `"use server"` file is a public HTTP endpoint;
 * a check inside the calling component does not protect it. Wrapping with
 * `action()` means the guard cannot be omitted by forgetting to write it.
 *
 *   export const getMaterials = action({ roles: ALL_ROLES }, async (_user) => { ... });
 *   export const addMaterial  = action(
 *     { roles: ADMIN_ROLES, revalidate: ["/materials"] },
 *     async (_user, data: MaterialInput) => { ... },
 *   );
 */
export function action<A extends unknown[], R>(
  opts: ActionOptions,
  fn: (user: SessionUser, ...args: A) => Promise<R>,
) {
  return async (...args: A): Promise<R> => {
    const user = await getSessionUser();
    if (!user) throw new AuthError("Authentication required");
    if (opts.roles && !opts.roles.includes(user.role)) {
      throw new AuthError("Permission denied");
    }
    const result = await fn(user, ...args);
    opts.revalidate?.forEach((path) => revalidatePath(path));
    return result;
  };
}

export const ALL_ROLES: UserRole[] = ["SUPER_ADMIN", "MANAGER", "WORKER", "VIEWER"];
export const ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "MANAGER"];
export const SUPER_ADMIN_ONLY: UserRole[] = ["SUPER_ADMIN"];
