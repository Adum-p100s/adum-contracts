import { z } from 'zod';
import { Dice, Id, NonNegInt, PosInt } from './common.js';
import { Stats } from './stats.js';

/** A row of the fixed enemy-templates table. Instances are scaled to the player's level. */
export const EnemyTemplate = z.strictObject({
  id: Id,
  name: z.string().min(1).max(80),
  description: z.string().max(500).default(''),
  baseLevel: PosInt,
  hp: PosInt,
  armorClass: z.number().int().min(5).max(30),
  stats: Stats,
  attackBonus: z.number().int().min(-5).max(20),
  damage: Dice,
  powers: z.array(Id).default([]),
  xpReward: NonNegInt,
  tags: z.array(z.string().min(1).max(30)).default([]), // e.g. "undead", "beast", "boss"
});
export type EnemyTemplate = z.infer<typeof EnemyTemplate>;

/** One enemy in a live fight. */
export const EnemyInstance = z
  .strictObject({
    instanceId: z.string().min(1).max(64),
    templateId: Id,
    name: z.string().min(1).max(80),
    level: PosInt,
    hp: NonNegInt,
    maxHp: PosInt,
  })
  .refine((e) => e.hp <= e.maxHp, { message: 'hp cannot exceed maxHp', path: ['hp'] });
export type EnemyInstance = z.infer<typeof EnemyInstance>;
