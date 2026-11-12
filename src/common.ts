import { z } from 'zod';

/** Reference to a row in a fixed Supabase table (items, powers, enemy templates, tiles). */
export const Id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/, 'must be a lowercase id like "iron_sword" (a-z, 0-9, _ or -)');
export type Id = z.infer<typeof Id>;

/** Dice notation used everywhere damage or healing is rolled, e.g. "1d8", "2d6+3". */
export const Dice = z
  .string()
  .regex(/^[1-9]\d?d(4|6|8|10|12|20|100)([+-]\d{1,3})?$/, 'must be dice notation like "1d8" or "2d6+3"');
export type Dice = z.infer<typeof Dice>;

export const NonNegInt = z.number().int().min(0);
export const PosInt = z.number().int().min(1);
