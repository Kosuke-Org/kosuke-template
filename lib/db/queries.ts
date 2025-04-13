// Imports are kept for future implementation when authentication is added
// import { db } from "./index";
// import { users } from "./schema";
// import { eq } from "drizzle-orm";
// import { cookies } from "next/headers";

import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from './drizzle';
import { users } from './schema';

/**
 * Gets the currently authenticated user from the session
 */
export async function getUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie?.value) {
      return null;
    }

    // Parse the session cookie to get the user ID
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));

    if (!sessionData.userId) {
      return null;
    }

    // Get the user from the database
    const user = await db.query.users.findFirst({
      where: eq(users.id, sessionData.userId),
    });

    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}
