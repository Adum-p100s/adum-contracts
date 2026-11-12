import { z } from 'zod';

/** The six D&D ability scores. */
export const STAT_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
export const StatKey = z.enum(STAT_KEYS);
export type StatKey = z.infer<typeof StatKey>;

/** Ability scores are capped at 20, even though character level has no cap. */
export const STAT_MIN = 1;
export const STAT_MAX = 20;
export const StatValue = z.number().int().min(STAT_MIN).max(STAT_MAX);

export const Stats = z.strictObject({
  STR: StatValue,
  DEX: StatValue,
  CON: StatValue,
  INT: StatValue,
  WIS: StatValue,
  CHA: StatValue,
});
export type Stats = z.infer<typeof Stats>;

/** Partial stat bonuses (items, class bonuses), each -5..+5. */
export const StatBonuses = z.strictObject({
  STR: z.number().int().min(-5).max(5).optional(),
  DEX: z.number().int().min(-5).max(5).optional(),
  CON: z.number().int().min(-5).max(5).optional(),
  INT: z.number().int().min(-5).max(5).optional(),
  WIS: z.number().int().min(-5).max(5).optional(),
  CHA: z.number().int().min(-5).max(5).optional(),
});
export type StatBonuses = z.infer<typeof StatBonuses>;

/** D&D modifier: floor((score - 10) / 2). 10 -> 0, 15 -> +2, 8 -> -1, 20 -> +5. */
export function statModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * 5e point buy: 27 points, each score bought between 8 and 15 before class bonuses.
 * The rules engine (stats module, T060) enforces it; the numbers live here so the
 * frontend's character-creation screen uses the same table.
 */
export const POINT_BUY = {
  budget: 27,
  min: 8,
  max: 15,
  cost: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 } as Record<number, number>,
} as const;
