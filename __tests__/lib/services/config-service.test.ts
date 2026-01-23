/**
 * Config Service Tests
 * Tests for encrypted configuration management and environment variable fallback
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';
import {
  decrypt,
  deleteConfig,
  encrypt,
  getConfig,
  getConfigOrEnv,
  listConfigStatus,
  maskConfigValue,
  setConfig,
} from '@/lib/services/config-service';
import { CONFIG_KEYS } from '@/lib/services/constants';

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Config Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a value successfully', () => {
      const plaintext = 'whsec_test_secret_value';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':'); // Format check: version:iv:data:tag
    });

    it('should throw error when encrypting empty value', () => {
      expect(() => encrypt('')).toThrow('Cannot encrypt empty value');
      expect(() => encrypt('   ')).toThrow('Cannot encrypt empty value');
    });

    it('should throw error when decrypting invalid format', () => {
      expect(() => decrypt('invalid')).toThrow('Invalid ciphertext format');
    });

    it('should use versioned encryption format', () => {
      const plaintext = 'test-value';
      const encrypted = encrypt(plaintext);
      const parts = encrypted.split(':');

      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe('v1'); // Current version
    });
  });

  describe('getConfig', () => {
    it('should retrieve and decrypt a config value', async () => {
      const plaintext = 'whsec_test_secret';
      const encrypted = encrypt(plaintext);

      const mockResult = [{ key: CONFIG_KEYS.STRIPE_WEBHOOK_SECRET, value: encrypted }];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockResult),
          }),
        }),
      } as any);

      const result = await getConfig(CONFIG_KEYS.STRIPE_WEBHOOK_SECRET);

      expect(result).toBe(plaintext);
    });

    it('should return null if config not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await getConfig(CONFIG_KEYS.STRIPE_WEBHOOK_SECRET);

      expect(result).toBeNull();
    });

    it('should throw error for empty key', async () => {
      await expect(getConfig('' as any)).rejects.toThrow('Config key cannot be empty');
    });
  });

  describe('getConfigOrEnv', () => {
    it('should return database value if available', async () => {
      const plaintext = 'whsec_from_database';
      const encrypted = encrypt(plaintext);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValue([{ key: CONFIG_KEYS.STRIPE_WEBHOOK_SECRET, value: encrypted }]),
          }),
        }),
      } as any);

      vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_from_env');

      const result = await getConfigOrEnv(CONFIG_KEYS.STRIPE_WEBHOOK_SECRET);

      expect(result).toBe(plaintext);
    });

    it('should fall back to environment variable if database value not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_from_env');

      const result = await getConfigOrEnv(CONFIG_KEYS.STRIPE_WEBHOOK_SECRET);

      expect(result).toBe('whsec_from_env');
    });

    it('should return null if neither database nor env var available', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');

      const result = await getConfigOrEnv(CONFIG_KEYS.STRIPE_WEBHOOK_SECRET);

      expect(result).toEqual('');
    });

    it('should prefer database value over environment variable', async () => {
      const plaintext = 'whsec_from_database';
      const encrypted = encrypt(plaintext);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValue([{ key: CONFIG_KEYS.STRIPE_WEBHOOK_SECRET, value: encrypted }]),
          }),
        }),
      } as any);

      vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_from_env');

      const result = await getConfigOrEnv(CONFIG_KEYS.STRIPE_WEBHOOK_SECRET);

      expect(result).toBe('whsec_from_database');
      expect(result).not.toBe('whsec_from_env');
    });
  });

  describe('setConfig', () => {
    it('should insert new config when it does not exist', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const mockValues = vi.fn().mockResolvedValue(undefined);
      const mockInsert = vi.fn().mockReturnValue({
        values: mockValues,
      });
      vi.mocked(db.insert).mockImplementation(mockInsert as any);

      await setConfig({
        key: CONFIG_KEYS.STRIPE_WEBHOOK_SECRET,
        value: 'whsec_new_value',
        description: 'Test description',
      });

      expect(db.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalled();
    });

    it('should update existing config when it exists', async () => {
      const existingEncrypted = encrypt('old_value');

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                key: CONFIG_KEYS.STRIPE_WEBHOOK_SECRET,
                value: existingEncrypted,
                description: 'Old description',
              },
            ]),
          }),
        }),
      } as any);

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn().mockReturnValue({
        where: mockWhere,
      });
      const mockUpdate = vi.fn().mockReturnValue({
        set: mockSet,
      });
      vi.mocked(db.update).mockImplementation(mockUpdate as any);

      await setConfig({
        key: CONFIG_KEYS.STRIPE_WEBHOOK_SECRET,
        value: 'whsec_updated_value',
        description: 'New description',
      });

      expect(db.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });

    it('should throw error for empty key', async () => {
      await expect(setConfig({ key: '' as any, value: 'value' })).rejects.toThrow(
        'Config key cannot be empty'
      );
    });

    it('should throw error for empty value', async () => {
      await expect(
        setConfig({ key: CONFIG_KEYS.STRIPE_WEBHOOK_SECRET, value: '' })
      ).rejects.toThrow('Config value cannot be empty');
    });
  });

  describe('deleteConfig', () => {
    it('should delete config and return true if found', async () => {
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1 }]),
        }),
      } as any);

      const result = await deleteConfig(CONFIG_KEYS.STRIPE_WEBHOOK_SECRET);

      expect(result).toBe(true);
      expect(db.delete).toHaveBeenCalled();
    });

    it('should return false if config not found', async () => {
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await deleteConfig(CONFIG_KEYS.STRIPE_WEBHOOK_SECRET);

      expect(result).toBe(false);
    });

    it('should throw error for empty key', async () => {
      await expect(deleteConfig('' as any)).rejects.toThrow('Config key cannot be empty');
    });
  });

  describe('maskConfigValue', () => {
    it('should mask values longer than 8 characters', () => {
      expect(maskConfigValue('whsec_1234567890abcdef')).toBe('whse****cdef');
      expect(maskConfigValue('sk_test_1234567890')).toBe('sk_t****7890');
    });

    it('should return **** for short values', () => {
      expect(maskConfigValue('short')).toBe('****');
      expect(maskConfigValue('12345678')).toBe('****');
      expect(maskConfigValue('')).toBe('****');
    });
  });

  describe('listConfigStatus', () => {
    it('should return status for all CONFIG_KEYS', async () => {
      const webhookEncrypted = encrypt('whsec_test_secret');
      const secretKeyEncrypted = encrypt('sk_test_secret');

      // Mock DB to return only 2 configs (missing STRIPE_PUBLISHABLE_KEY)
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([
          { key: CONFIG_KEYS.STRIPE_WEBHOOK_SECRET, value: webhookEncrypted },
          { key: CONFIG_KEYS.STRIPE_SECRET_KEY, value: secretKeyEncrypted },
        ]),
      } as any);

      const result = await listConfigStatus();

      // Should have entries for all CONFIG_KEYS
      expect(Object.keys(result)).toHaveLength(Object.keys(CONFIG_KEYS).length);

      // Existing configs should have masked values
      expect(result[CONFIG_KEYS.STRIPE_WEBHOOK_SECRET]).toEqual({
        exists: true,
        maskedValue: 'whse****cret',
      });
      expect(result[CONFIG_KEYS.STRIPE_SECRET_KEY]).toEqual({
        exists: true,
        maskedValue: 'sk_t****cret',
      });

      // Missing config should not exist
      expect(result[CONFIG_KEYS.STRIPE_PUBLISHABLE_KEY]).toEqual({
        exists: false,
        maskedValue: null,
      });
    });

    it('should handle decryption errors gracefully', async () => {
      // Mock DB to return invalid encrypted value
      vi.mocked(db.select).mockReturnValue({
        from: vi
          .fn()
          .mockResolvedValue([
            { key: CONFIG_KEYS.STRIPE_WEBHOOK_SECRET, value: 'invalid:encrypted:value:format' },
          ]),
      } as any);

      const result = await listConfigStatus();

      // Should return **** for failed decryption
      expect(result[CONFIG_KEYS.STRIPE_WEBHOOK_SECRET]).toEqual({
        exists: true,
        maskedValue: '****',
      });
    });

    it('should return all keys as non-existent when database is empty', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await listConfigStatus();

      // All keys should be non-existent
      Object.values(CONFIG_KEYS).forEach((key) => {
        expect(result[key]).toEqual({
          exists: false,
          maskedValue: null,
        });
      });
    });
  });
});
