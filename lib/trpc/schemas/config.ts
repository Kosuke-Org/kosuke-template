import { z } from 'zod';

import { CONFIG_KEYS } from '@/lib/services/constants';

export const getConfigSchema = z.object({
  key: z.enum(Object.values(CONFIG_KEYS)),
});

export const setConfigSchema = z.object({
  key: z.enum(Object.values(CONFIG_KEYS)),
  value: z.string().min(1, 'Config value cannot be empty'),
  description: z.string().optional(),
});

export const deleteConfigSchema = z.object({
  key: z.enum(Object.values(CONFIG_KEYS)),
});

export const listConfigsSchema = z.object({}).optional();
