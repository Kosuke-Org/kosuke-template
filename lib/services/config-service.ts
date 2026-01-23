import crypto from 'crypto';

import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { type NewSystemConfig, systemConfig } from '@/lib/db/schema';
import { CONFIG_KEYS, type ConfigKey, ERRORS } from '@/lib/services/constants';

/**
 * Config Service (Security-Hardened Version)
 *
 * Manages encrypted system-wide configuration and secrets stored in the database.
 * Uses AES-256-GCM encryption with a dedicated ENCRYPTION_KEY.
 *
 * Security Features:
 * - AES-256-GCM authenticated encryption
 * - HKDF key derivation (RFC 5869)
 * - Unique IV per encryption
 * - Versioned encryption for key rotation support
 * - Dedicated encryption key (separate from auth secrets)
 *
 * Setup:
 * Generate a secure encryption key: openssl rand -base64 32
 * Add to .env: ENCRYPTION_KEY=<generated_key>
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const CURRENT_KEY_VERSION = 'v1';
const KEY_DERIVATION_INFO = 'kosuke-config-encryption'; // Application-specific context

/**
 * Derive encryption key using HKDF (HMAC-based Key Derivation Function)
 * More secure than simple hashing for key derivation
 *
 * @param version - Key version for future rotation support
 * @returns 32-byte encryption key as Buffer
 */
function deriveEncryptionKey(version: string = CURRENT_KEY_VERSION): Buffer {
  const secret = process.env.ENCRYPTION_KEY;

  if (!secret) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required for config encryption.\n' +
        'Generate one with: openssl rand -base64 32'
    );
  }

  // Minimum length check for security
  if (secret.length < 32) {
    throw new Error(
      'ENCRYPTION_KEY must be at least 32 characters for secure encryption.\n' +
        'Generate one with: openssl rand -base64 32'
    );
  }

  // Use HKDF for proper key derivation
  // Salt is version-specific to enable key rotation
  const salt = `${KEY_DERIVATION_INFO}-${version}`;

  try {
    const derived = crypto.hkdfSync('sha256', secret, salt, '', 32);
    return Buffer.from(derived);
  } catch (error) {
    throw new Error(`Failed to derive encryption key: ${error}`);
  }
}

/**
 * Encrypt a plaintext string using AES-256-GCM with versioned key
 *
 * @param plaintext - The value to encrypt
 * @returns Base64-encoded string in format: version:iv:encrypted_data:auth_tag
 */
export function encrypt(plaintext: string): string {
  if (!plaintext || plaintext.trim() === '') {
    throw new Error('Cannot encrypt empty value');
  }

  const key = deriveEncryptionKey(CURRENT_KEY_VERSION);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Format: version:iv:encrypted_data:auth_tag (all base64 encoded except version)
  return `${CURRENT_KEY_VERSION}:${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`;
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 * Supports versioned decryption for key rotation
 *
 * @param ciphertext - The encrypted value in format: version:iv:encrypted_data:auth_tag
 * @returns Decrypted plaintext string
 */
export function decrypt(ciphertext: string): string {
  // Parse the ciphertext format: version:iv:encrypted_data:auth_tag
  const parts = ciphertext.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid ciphertext format. Expected: version:iv:encrypted_data:auth_tag');
  }

  const [version, ivBase64, encryptedBase64, authTagBase64] = parts;

  if (!version) {
    throw new Error('Missing encryption version');
  }

  // Derive key for the specific version
  const key = deriveEncryptionKey(version);

  const iv = Buffer.from(ivBase64, 'base64');
  const encrypted = Buffer.from(encryptedBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  // Validate buffer sizes
  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`);
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    let decrypted = decipher.update(encrypted.toString('base64'), 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // Auth tag verification failed or decryption error
    throw new Error(`Failed to decrypt config value: ${error}`, {
      cause: ERRORS.INTERNAL_SERVER_ERROR,
    });
  }
}

/**
 * Retrieve and decrypt a configuration value
 *
 * @param key - The configuration key (e.g., 'STRIPE_WEBHOOK_SECRET')
 * @returns Decrypted value or null if not found
 */
export async function getConfig(key: ConfigKey): Promise<string | null> {
  if (!key || key.trim() === '') {
    throw new Error('Config key cannot be empty', { cause: ERRORS.BAD_REQUEST });
  }

  const result = await db.select().from(systemConfig).where(eq(systemConfig.key, key)).limit(1);

  if (result.length === 0) {
    return null;
  }

  const encryptedValue = result[0]!.value;

  try {
    return decrypt(encryptedValue);
  } catch (error) {
    console.error(`Failed to decrypt config value for key: ${key}`, error);
    throw new Error(`Failed to decrypt config value for key: ${key}`, {
      cause: ERRORS.INTERNAL_SERVER_ERROR,
    });
  }
}

/**
 * Retrieve a configuration value from database or fall back to environment variable
 *
 * @param key - The configuration key from CONFIG_KEYS
 * @returns Decrypted value from database, env var fallback, or null if not found
 */
export async function getConfigOrEnv(key: ConfigKey): Promise<string | null> {
  const dbValue = await getConfig(key);
  if (dbValue) return dbValue;

  // Config key values match env var names directly
  return process.env[key] ?? null;
}

/**
 * Store or update an encrypted configuration value
 *
 * @param key - The configuration key (e.g., 'STRIPE_WEBHOOK_SECRET')
 * @param value - The plaintext value to encrypt and store
 * @param description - Optional human-readable description
 * @returns The created/updated configuration record
 */
export async function setConfig({
  key,
  value,
  description,
}: {
  key: ConfigKey;
  value: string;
  description?: string;
}): Promise<void> {
  if (!key || key.trim() === '') {
    throw new Error('Config key cannot be empty', { cause: ERRORS.BAD_REQUEST });
  }

  if (!value || value.trim() === '') {
    throw new Error('Config value cannot be empty', { cause: ERRORS.BAD_REQUEST });
  }

  const encryptedValue = encrypt(value);

  const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, key)).limit(1);

  if (existing.length > 0) {
    await db
      .update(systemConfig)
      .set({
        value: encryptedValue,
        description: description ?? existing[0]!.description,
        updatedAt: new Date(),
      })
      .where(eq(systemConfig.key, key));
  } else {
    const newConfig: NewSystemConfig = {
      key,
      value: encryptedValue,
      description: description ?? null,
    };

    await db.insert(systemConfig).values(newConfig);
  }
}

/**
 * Delete a configuration value
 *
 * @param key - The configuration key to delete
 * @returns true if deleted, false if not found
 */
export async function deleteConfig(key: ConfigKey): Promise<boolean> {
  if (!key || key.trim() === '') {
    throw new Error('Config key cannot be empty', { cause: ERRORS.BAD_REQUEST });
  }

  const result = await db.delete(systemConfig).where(eq(systemConfig.key, key)).returning();

  return result.length > 0;
}

/**
 * Status information for a configuration key
 */
interface ConfigStatus {
  exists: boolean;
  maskedValue: string | null;
}

/**
 * List configuration status for all CONFIG_KEYS
 * Provides masked values and existence status for each key
 *
 * @returns Record mapping ConfigKey to its status
 */
export async function listConfigStatus(): Promise<Record<ConfigKey, ConfigStatus>> {
  // Fetch all system configs in one query
  const allConfigs = await db
    .select({
      key: systemConfig.key,
      value: systemConfig.value,
    })
    .from(systemConfig);

  // Build status map server-side
  const configKeys = Object.values(CONFIG_KEYS);
  const statusMap: Record<ConfigKey, ConfigStatus> = {} as Record<ConfigKey, ConfigStatus>;

  for (const key of configKeys) {
    const config = allConfigs.find((c) => c.key === key);

    if (config) {
      try {
        const decryptedValue = decrypt(config.value);
        statusMap[key] = {
          exists: true,
          maskedValue: maskConfigValue(decryptedValue),
        };
      } catch (error) {
        console.error(`Failed to decrypt config value for key: ${key}`, error);
        statusMap[key] = {
          exists: true,
          maskedValue: '****',
        };
      }
    } else {
      statusMap[key] = {
        exists: false,
        maskedValue: null,
      };
    }
  }

  return statusMap;
}

/**
 * Mask a configuration value for display purposes
 * Shows first 4 and last 4 characters, masks the middle
 *
 * @param value - The value to mask
 * @returns Masked string (e.g., "sk_t****abcd")
 */
export function maskConfigValue(value: string): string {
  if (!value || value.length <= 8) {
    return '****';
  }

  const firstChars = value.slice(0, 4);
  const lastChars = value.slice(-4);
  return `${firstChars}****${lastChars}`;
}

/**
 * Rotate encryption key for a specific config value
 * Re-encrypts with the current key version
 *
 * @param key - The configuration key to rotate
 */
async function rotateConfigKey(key: ConfigKey): Promise<void> {
  const currentValue = await getConfig(key);

  if (!currentValue) {
    throw new Error(`Config key not found: ${key}`, { cause: ERRORS.NOT_FOUND });
  }

  const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, key)).limit(1);

  await setConfig({
    key,
    value: currentValue,
    description: existing[0]?.description ?? undefined,
  });

  console.log(`✅ Rotated encryption key for: ${key}`);
}

/**
 * Rotate all config keys to use the current encryption key version
 * Useful after changing ENCRYPTION_KEY
 */
async function _rotateAllConfigKeys(): Promise<void> {
  const configKeys = Object.values(CONFIG_KEYS);

  console.log(`🔄 Rotating ${configKeys.length} config keys...`);

  for (const key of configKeys) {
    try {
      await rotateConfigKey(key);
    } catch (error) {
      console.error(`❌ Failed to rotate key: ${key}`, error);
      throw error;
    }
  }

  console.log('✅ All config keys rotated successfully');
}

/**
 * Check if Google AI API key is configured
 * Used to gate AI features (Documents, Assistant) when key is missing
 * @returns True if configured, false otherwise
 */
export async function isGoogleApiKeyConfigured(): Promise<boolean> {
  const key = await getConfigOrEnv(CONFIG_KEYS.GOOGLE_AI_API_KEY);
  return !!key;
}

/**
 * Check if Stripe API key is configured
 * Used to gate billing features when key is missing
 * @returns True if configured, false otherwise
 */
export async function isStripeApiKeyConfigured(): Promise<boolean> {
  const key = await getConfigOrEnv(CONFIG_KEYS.STRIPE_SECRET_KEY);
  const webhookSecretKey = await getConfigOrEnv(CONFIG_KEYS.STRIPE_WEBHOOK_SECRET);

  return !!key && !!webhookSecretKey;
}
