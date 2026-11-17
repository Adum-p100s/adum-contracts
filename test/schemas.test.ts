import { describe, expect, it } from 'vitest';
import {
  Character, Dice, EnemyInstance, EnemyTemplate, GameEvent, Id, Item, MapAssembly, MapData, Power, Stats,
  statModifier, slotFor,
} from '../src/index.js';
import {
  sampleCharacter, sampleEnemyInstance, sampleEnemyTemplate, sampleEvents, sampleMapAssembly, sampleMapData,
  sampleEvadePower, samplePotion, samplePower, sampleStats, sampleStunPower, sampleWeapon,
} from '../src/samples.js';

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) => expect(schema.safeParse(v).success).toBe(true);
const bad = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) => expect(schema.safeParse(v).success).toBe(false);

describe('common', () => {
  it('Id', () => { ok(Id, 'iron_sword'); bad(Id, 'Iron Sword'); bad(Id, ''); });
  it('Dice', () => { ok(Dice, '1d8'); ok(Dice, '2d6+3'); bad(Dice, 'd8'); bad(Dice, '1d7'); bad(Dice, '8'); });
});

describe('Stats', () => {
  it('valid', () => ok(Stats, sampleStats));
  it('rejects scores above the cap of 20', () => bad(Stats, { ...sampleStats, STR: 21 }));
  it('rejects unknown stats', () => bad(Stats, { ...sampleStats, LUCK: 10 }));
  it('modifier matches D&D', () => {
    expect([1, 8, 9, 10, 11, 15, 20].map(statModifier)).toEqual([-5, -1, -1, 0, 0, 2, 5]);
  });
});

describe('Item', () => {
  it('valid weapon and potion', () => { ok(Item, sampleWeapon); ok(Item, samplePotion); });
  it('weapon without damage fails', () => bad(Item, { ...sampleWeapon, damage: undefined }));
  it('unknown rarity fails', () => bad(Item, { ...sampleWeapon, rarity: 'mythic' }));
  it('slotFor', () => { expect(slotFor('armor')).toBe('armor'); expect(slotFor('consumable')).toBeNull(); });
});

describe('Power', () => {
  it('valid', () => ok(Power, samplePower));
  it('needs damage or heal', () => bad(Power, { ...samplePower, damage: undefined }));
  it('negative mana cost fails', () => bad(Power, { ...samplePower, manaCost: -1 }));
});

describe('Enemy', () => {
  it('valid template + instance', () => { ok(EnemyTemplate, sampleEnemyTemplate); ok(EnemyInstance, sampleEnemyInstance); });
  it('template with bad dice fails', () => bad(EnemyTemplate, { ...sampleEnemyTemplate, damage: 'lots' }));
  it('instance hp above max fails', () => bad(EnemyInstance, { ...sampleEnemyInstance, hp: 99 }));
});

describe('Character', () => {
  it('valid', () => ok(Character, sampleCharacter));
  it('unknown class fails', () => bad(Character, { ...sampleCharacter, classId: 'bard' }));
  it('hp above maxHp fails', () => bad(Character, { ...sampleCharacter, hp: 50 }));
  it('level has no cap', () => ok(Character, { ...sampleCharacter, level: 250, xp: 9_999_999 }));
  it('unknown equipment slot fails', () => bad(Character, { ...sampleCharacter, equipment: { ...sampleCharacter.equipment, ring: null } }));
});

describe('MapData', () => {
  it('valid', () => ok(MapData, sampleMapData));
  it('size outside 64-128 fails', () => { bad(MapData, { ...sampleMapData, map_Size: 32 }); bad(MapData, { ...sampleMapData, map_Size: 256 }); });
  it('duplicate event character ids fail', () => {
    const ec = sampleMapData.componentData.eventCharacters[0];
    bad(MapData, { ...sampleMapData, componentData: { ...sampleMapData.componentData, eventCharacters: [ec, ec] } });
  });
  it('settlement placement with no settlements fails', () =>
    bad(MapData, { ...sampleMapData, componentData: { ...sampleMapData.componentData, settlementAmount: 0 } }));
  it('coordinates are not accepted from Gemini', () => {
    const ec = { ...sampleMapData.componentData.eventCharacters[1], x: 3, y: 4 };
    bad(MapData, { ...sampleMapData, componentData: { ...sampleMapData.componentData, eventCharacters: [ec] } });
  });
});

describe('MapAssembly', () => {
  it('valid 64x64 sample', () => ok(MapAssembly, sampleMapAssembly));
  it('wrong tile count fails', () => bad(MapAssembly, { ...sampleMapAssembly, tiles: sampleMapAssembly.tiles.slice(1) }));
  it('spawn outside the map fails', () => bad(MapAssembly, { ...sampleMapAssembly, spawns: [{ eventCharacterId: 'x', x: 64, y: 0 }] }));
});

describe('GameEvent', () => {
  it('every sample event parses', () => {
    for (const e of sampleEvents) expect(GameEvent.safeParse(e).success, e.type).toBe(true);
  });
  it('covers all 11 event types', () => {
    expect(new Set(sampleEvents.map((e) => e.type)).size).toBe(11);
  });
  it('unknown type fails', () => bad(GameEvent, { type: 'teleport' }));
  it('roll total must equal roll + modifier', () => bad(GameEvent, { ...sampleEvents[1], total: 99 }));
  it('d20 outside 1-20 fails', () => bad(GameEvent, { ...sampleEvents[1], roll: 21, total: 22 }));
  it('roll dice: 2 dice with advantage, the kept die is the roll', () => {
    const roll = sampleEvents[1];
    bad(GameEvent, { ...roll, dice: [14] }); // advantage needs both dice
    bad(GameEvent, { ...roll, dice: [14, 17] }); // 17 is higher, so roll 14 is wrong
    ok(GameEvent, { ...roll, advantage: 'disadvantage', dice: [14, 17] });
    bad(GameEvent, { ...roll, advantage: 'none', dice: [6, 14] });
    ok(GameEvent, { ...roll, advantage: undefined, dice: undefined }); // 0.2.0 shape still parses
  });
  it('choices need 2-4 options', () => bad(GameEvent, { ...sampleEvents[5], options: [{ id: 'a', label: 'only one' }] }));
  it('hardcore death must be permadeath', () => bad(GameEvent, { ...sampleEvents[10], difficulty: 'hardcore' }));
});

describe('v0.2.0: buffs and AI profile', () => {
  it('buff and debuff powers are valid', async () => {
    const { sampleBuffPower, sampleDebuffPower } = await import('../src/samples.js');
    ok(Power, sampleBuffPower);
    ok(Power, sampleDebuffPower);
  });
  it('a buff-only power no longer needs damage or heal', async () => {
    const { sampleBuffPower } = await import('../src/samples.js');
    expect(sampleBuffPower.damage).toBeUndefined();
    bad(Power, { ...sampleBuffPower, buff: undefined });
  });
  it('buff rules', async () => {
    const { sampleBuffPower } = await import('../src/samples.js');
    bad(Power, { ...sampleBuffPower, buff: { kind: 'ac', amount: 0, durationTurns: 3 } });
    bad(Power, { ...sampleBuffPower, buff: { kind: 'ac', amount: 2, durationTurns: 11 } });
    bad(Power, { ...sampleBuffPower, buff: { kind: 'check', amount: 2, durationTurns: 2 } });
    ok(Power, { ...sampleBuffPower, buff: { kind: 'check', amount: 2, durationTurns: 2, stat: 'WIS' } });
    bad(Power, { ...sampleBuffPower, buff: { kind: 'ac', amount: 2, durationTurns: 2, stat: 'WIS' } });
  });
  it('enemy aiProfile defaults to aggressive and rejects unknown styles', () => {
    const { aiProfile, ...noProfile } = sampleEnemyTemplate;
    expect(aiProfile).toBe('cowardly');
    expect(EnemyTemplate.parse(noProfile).aiProfile).toBe('aggressive');
    bad(EnemyTemplate, { ...sampleEnemyTemplate, aiProfile: 'berserk' });
  });
  it('effects on enemies and the player in combat', () => {
    ok(EnemyInstance, sampleEnemyInstance);
    expect(EnemyInstance.parse({ ...sampleEnemyInstance, effects: undefined }).effects).toEqual([]);
    bad(EnemyInstance, { ...sampleEnemyInstance, effects: [{ powerId: 'x', kind: 'speed', amount: 1, turnsLeft: 1 }] });
    const combat = sampleEvents.find((e) => e.type === 'combat_update');
    expect(combat && combat.type === 'combat_update' && combat.playerEffects.length).toBe(1);
  });
});

describe('v0.4.0: stun and evade', () => {
  it('stun and evade powers are valid', () => { ok(Power, sampleStunPower); ok(Power, sampleEvadePower); });
  it('a stun must have amount -1', () => bad(Power, { ...sampleStunPower, buff: { kind: 'stun', amount: -2, durationTurns: 1 } }));
  it('evade needs a positive amount', () => bad(Power, { ...sampleEvadePower, buff: { kind: 'evade', amount: -1, durationTurns: 2 } }));
  it('running stun and evade effects are valid on an enemy', () =>
    ok(EnemyInstance, { ...sampleEnemyInstance, effects: [{ powerId: 'force_push', kind: 'stun', amount: -1, turnsLeft: 1 }, { powerId: 'blink_step', kind: 'evade', amount: 1, turnsLeft: 2 }] }));
});
