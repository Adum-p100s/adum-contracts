import { z } from 'zod';
import { Dice, Id, NonNegInt } from './common.js';
import { StatBonuses, StatKey } from './stats.js';

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export const Rarity = z.enum(RARITIES);
export type Rarity = z.infer<typeof Rarity>;

export const EQUIP_SLOTS = ['weapon', 'armor', 'accessory'] as const;
export const EquipSlot = z.enum(EQUIP_SLOTS);
export type EquipSlot = z.infer<typeof EquipSlot>;

export const ItemType = z.enum(['weapon', 'armor', 'accessory', 'consumable', 'quest', 'misc']);
export type ItemType = z.infer<typeof ItemType>;

/** A row of the fixed items table. Gemini only ever refers to items by id. */
export const Item = z
  .strictObject({
    id: Id,
    name: z.string().min(1).max(80),
    description: z.string().max(500).default(''),
    type: ItemType,
    rarity: Rarity,
    price: NonNegInt.default(0),
    stackable: z.boolean().default(false),
    // weapons
    damage: Dice.optional(),
    damageStat: StatKey.optional(),
    // armor
    armorBonus: z.number().int().min(0).max(10).optional(),
    // any equippable item
    statBonuses: StatBonuses.optional(),
    // consumables
    heal: Dice.optional(),
    restoreMana: Dice.optional(),
  })
  .superRefine((it, ctx) => {
    if (it.type === 'weapon' && (!it.damage || !it.damageStat))
      ctx.addIssue({ code: 'custom', path: ['damage'], message: 'weapons need damage and damageStat' });
    if (it.type === 'armor' && it.armorBonus === undefined)
      ctx.addIssue({ code: 'custom', path: ['armorBonus'], message: 'armor needs armorBonus' });
    if (it.type === 'consumable' && !it.heal && !it.restoreMana)
      ctx.addIssue({ code: 'custom', path: ['heal'], message: 'consumables need heal or restoreMana' });
  });
export type Item = z.infer<typeof Item>;

/** Which slot an item type goes into (null = cannot be equipped). */
export function slotFor(type: ItemType): EquipSlot | null {
  return type === 'weapon' || type === 'armor' || type === 'accessory' ? type : null;
}
