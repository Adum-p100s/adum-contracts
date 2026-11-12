import { z } from 'zod';
import { Dice, Id, NonNegInt, PosInt } from './common.js';
import { ClassId } from './classes.js';
import { StatKey } from './stats.js';

export const PowerTarget = z.enum(['self', 'enemy', 'all_enemies']);
export type PowerTarget = z.infer<typeof PowerTarget>;

/** A row of the fixed powers table. */
export const Power = z
  .strictObject({
    id: Id,
    name: z.string().min(1).max(80),
    description: z.string().max(500).default(''),
    classId: ClassId.nullable(), // null = any class
    minLevel: PosInt.default(1),
    manaCost: NonNegInt,
    cooldownTurns: NonNegInt.default(0),
    target: PowerTarget,
    stat: StatKey, // stat that powers the roll
    damage: Dice.optional(),
    heal: Dice.optional(),
  })
  .refine((p) => p.damage || p.heal, { message: 'a power needs damage or heal', path: ['damage'] });
export type Power = z.infer<typeof Power>;
