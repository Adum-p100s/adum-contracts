import { z } from 'zod';
import { Dice, Id, NonNegInt, PosInt } from './common.js';
import { ClassId } from './classes.js';
import { StatKey } from './stats.js';

export const PowerTarget = z.enum(['self', 'enemy', 'all_enemies']);

/**
 * What a buff changes while it lasts. A negative amount is a debuff (e.g. on an enemy).
 * ac: armor class, attack: attack rolls, damage: damage rolls, check: ability checks with `stat`.
 */
export const BuffKind = z.enum(['ac', 'attack', 'damage', 'check']);
export type BuffKind = z.infer<typeof BuffKind>;

export const Buff = z
  .strictObject({
    kind: BuffKind,
    amount: z.number().int().min(-10).max(10).refine((n) => n !== 0, 'amount cannot be 0'),
    durationTurns: z.number().int().min(1).max(10),
    stat: StatKey.optional(), // required for kind "check"
  })
  .superRefine((b, ctx) => {
    if (b.kind === 'check' && !b.stat) ctx.addIssue({ code: 'custom', path: ['stat'], message: 'a check buff needs a stat' });
    if (b.kind !== 'check' && b.stat) ctx.addIssue({ code: 'custom', path: ['stat'], message: 'only check buffs take a stat' });
  });
export type Buff = z.infer<typeof Buff>;

/** A buff currently running on someone in combat (player or enemy). */
export const ActiveEffect = z.strictObject({
  powerId: Id,
  kind: BuffKind,
  amount: z.number().int().min(-10).max(10),
  stat: StatKey.optional(),
  turnsLeft: z.number().int().min(1).max(10),
});
export type ActiveEffect = z.infer<typeof ActiveEffect>;
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
    buff: Buff.optional(), // e.g. Shield: { kind: 'ac', amount: 2, durationTurns: 3 }
  })
  .refine((p) => p.damage || p.heal || p.buff, { message: 'a power needs damage, heal or buff', path: ['damage'] });
export type Power = z.infer<typeof Power>;
