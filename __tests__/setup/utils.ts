/**
 * Encode session data to base64 (same format Better Auth uses)
 */
export const encodeSessionCookie = (sessionData: Record<string, unknown>): string => {
  return Buffer.from(JSON.stringify({ session: sessionData })).toString('base64');
};
