import { cookies } from 'next/headers';
import { User } from '../db/schema';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePasswords(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Set a session for a user by storing their ID in an encrypted cookie
 */
export async function setSession(user: User): Promise<void> {
  // Create a session object with user ID
  const session = {
    userId: user.id,
    email: user.email,
  };

  // Serialize and encrypt the session
  const serialized = Buffer.from(JSON.stringify(session)).toString('base64');

  // Set the cookie
  const cookieStore = await cookies();
  cookieStore.set({
    name: 'session',
    value: serialized,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });
}

/**
 * Get the current session from cookies
 */
export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    // Decrypt and parse the session
    const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));
    return session;
  } catch (error) {
    console.error('Error parsing session:', error);
    return null;
  }
}

/**
 * Clear the current session
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
