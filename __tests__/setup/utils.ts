import { TRPCError } from '@trpc/server';
import { expect } from 'vitest';

/**
 * Encode session data to base64 (same format Better Auth uses)
 */
export const encodeSessionCookie = (sessionData: Record<string, unknown>): string => {
  return Buffer.from(JSON.stringify({ session: sessionData })).toString('base64');
};

/**
 * Assert that a tRPC call rejects with a specific TRPCError code.
 *
 * Router tests care about the *code* (UNAUTHORIZED / FORBIDDEN / NOT_FOUND / BAD_REQUEST)
 * far more than the message, because the code is the authorization outcome.
 */
export async function expectTRPCError(
  promise: Promise<unknown>,
  code: TRPCError['code'],
  message?: string | RegExp
): Promise<TRPCError> {
  const error = await promise.then(
    () => null,
    (rejection: unknown) => rejection
  );

  expect(error, 'expected the procedure to reject, but it resolved').toBeInstanceOf(TRPCError);

  const trpcError = error as TRPCError;
  expect(trpcError.code).toBe(code);

  if (typeof message === 'string') {
    expect(trpcError.message).toContain(message);
  } else if (message instanceof RegExp) {
    expect(trpcError.message).toMatch(message);
  }

  return trpcError;
}
