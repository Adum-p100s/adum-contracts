import { z } from 'zod';
import { Id, NonNegInt, PosInt } from './common.js';
import { ClassId, Difficulty } from './classes.js';
import { Stats } from './stats.js';

export const InventoryEntry = z.strictObject({ itemId: Id, qty: PosInt });
export type InventoryEntry = z.infer<typeof InventoryEntry>;

export const Equipment = z.strictObject({
  weapon: Id.nullable(),
  armor: Id.nullable(),
  accessory: Id.nullable(),
});
export type Equipment = z.infer<typeof Equipment>;

/** The player's character. Supabase is the source of truth; this is its shape on the wire. */
export const Character = z
  .strictObject({
    id: z.string().min(1).max(64), // Supabase uuid
    name: z.string().min(1).max(40),
    classId: ClassId,
    difficulty: Difficulty,
    level: PosInt, // no level cap
    xp: NonNegInt,
    stats: Stats, // each capped at 20
    hp: NonNegInt,
    maxHp: PosInt,
    mana: NonNegInt,
    maxMana: NonNegInt,
    inventory: z.array(InventoryEntry).max(200),
    equipment: Equipment,
    powers: z.array(Id).max(50),
    portraitId: Id.nullable().default(null),
    alive: z.boolean().default(true),
  })
  .superRefine((c, ctx) => {
    if (c.hp > c.maxHp) ctx.addIssue({ code: 'custom', path: ['hp'], message: 'hp cannot exceed maxHp' });
    if (c.mana > c.maxMana) ctx.addIssue({ code: 'custom', path: ['mana'], message: 'mana cannot exceed maxMana' });
  });
export type Character = z.infer<typeof Character>;
