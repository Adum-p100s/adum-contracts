/**
 * Valid example objects for every schema. Used by the tests, and handy for
 * mocks (e.g. the frontend can render sampleMapAssembly before map gen exists).
 * Import from "adum-contracts/samples".
 */
import type { Character, EnemyInstance, EnemyTemplate, GameEvent, Item, MapAssembly, MapData, Power, Stats } from './index.js';

export const sampleStats: Stats = { STR: 15, DEX: 12, CON: 14, INT: 8, WIS: 10, CHA: 10 };

export const sampleWeapon: Item = {
  id: 'iron_sword', name: 'Iron Sword', description: 'Plain but reliable.', type: 'weapon', rarity: 'common',
  price: 15, stackable: false, damage: '1d8', damageStat: 'STR',
};
export const samplePotion: Item = {
  id: 'healing_potion', name: 'Healing Potion', description: '', type: 'consumable', rarity: 'common',
  price: 25, stackable: true, heal: '2d4+2',
};

export const samplePower: Power = {
  id: 'firebolt', name: 'Firebolt', description: 'A mote of fire.', classId: 'wizard', minLevel: 1,
  manaCost: 2, cooldownTurns: 0, target: 'enemy', stat: 'INT', damage: '1d10',
};

export const sampleBuffPower: Power = {
  id: 'shield', name: 'Shield', description: 'A shimmering ward.', classId: 'wizard', minLevel: 1,
  manaCost: 2, cooldownTurns: 3, target: 'self', stat: 'INT', buff: { kind: 'ac', amount: 2, durationTurns: 3 },
};
export const sampleStunPower: Power = {
  id: 'force_push', name: 'Force Push', description: 'A blast that hurls a foe away.', classId: 'wizard', minLevel: 1,
  manaCost: 2, cooldownTurns: 2, target: 'enemy', stat: 'INT', damage: '1d6', buff: { kind: 'stun', amount: -1, durationTurns: 1 },
};
export const sampleEvadePower: Power = {
  id: 'blink_step', name: 'Blink Step', description: 'Swap places with an afterimage.', classId: 'wizard', minLevel: 1,
  manaCost: 2, cooldownTurns: 3, target: 'self', stat: 'INT', buff: { kind: 'evade', amount: 1, durationTurns: 3 },
};
export const sampleDebuffPower: Power = {
  id: 'hamstring', name: 'Hamstring', description: '', classId: 'rogue', minLevel: 2,
  manaCost: 1, cooldownTurns: 2, target: 'enemy', stat: 'DEX', damage: '1d4', buff: { kind: 'attack', amount: -2, durationTurns: 2 },
};

export const sampleEnemyTemplate: EnemyTemplate = {
  id: 'goblin', name: 'Goblin', description: '', baseLevel: 1, hp: 7, armorClass: 13,
  stats: { STR: 8, DEX: 14, CON: 10, INT: 10, WIS: 8, CHA: 8 }, attackBonus: 4, damage: '1d6+2',
  powers: [], xpReward: 50, aiProfile: 'cowardly', tags: ['humanoid'],
};
export const sampleEnemyInstance: EnemyInstance = {
  instanceId: 'goblin#1', templateId: 'goblin', name: 'Goblin Scout', level: 1, hp: 7, maxHp: 7,
  effects: [{ powerId: 'hamstring', kind: 'attack', amount: -2, turnsLeft: 2 }],
};

export const sampleCharacter: Character = {
  id: '0b9c1f9e-3c1a-4d2e-9a77-1f0c2b7d8e11', name: 'Brannoc', classId: 'fighter', difficulty: 'normal',
  level: 1, xp: 0, stats: sampleStats, hp: 12, maxHp: 12, mana: 0, maxMana: 0,
  inventory: [{ itemId: 'iron_sword', qty: 1 }, { itemId: 'healing_potion', qty: 2 }],
  equipment: { weapon: 'iron_sword', armor: null, accessory: null }, powers: [], portraitId: null, alive: true,
};

export const sampleMapData: MapData = {
  map_Size: 64, levelNumber: 1, environment_Type: 'forest',
  componentData: {
    roadAmount: 2, roadConnections: ['west', 'east'], settlementAmount: 1,
    eventCharacters: [
      { id: 'merchant_1', kind: 'npc', templateId: 'merchant', name: 'Old Hesk', zone: 'settlement' },
      { id: 'goblin_1', kind: 'enemy', templateId: 'goblin', name: 'Goblin Scout', zone: 'forest_edge' },
    ],
  },
};

/** A 64x64 grass field with a horizontal road through the middle. */
export function makeSampleMapAssembly(size = 64): MapAssembly {
  const tiles: string[] = [];
  const walkable: boolean[] = [];
  const mid = Math.floor(size / 2);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1;
    tiles.push(y === mid ? 'road_dirt_h' : edge ? 'tree_oak' : 'grass_plain');
    walkable.push(y === mid || !edge);
  }
  return {
    seed: 42, size, environment_Type: 'forest', tiles, walkable, overlays: [{ x: 5, y: mid - 1, tileId: 'blend_grass_dirt_s' }],
    spawns: [{ eventCharacterId: 'merchant_1', x: 10, y: mid - 2 }, { eventCharacterId: 'goblin_1', x: 40, y: mid + 3 }],
    playerStart: { x: 1, y: mid },
  };
}
export const sampleMapAssembly = makeSampleMapAssembly();

/** One of every GameEvent type, in roughly the order a turn would send them. */
export const sampleEvents: GameEvent[] = [
  { type: 'narration_chunk', text: 'The goblin lunges from the brush. ', done: false },
  { type: 'roll_result', rollId: 'r1', stat: 'DEX', reason: 'Dodge the goblin', roll: 14, advantage: 'advantage', dice: [6, 14], modifier: 1, total: 15, dc: 13, success: true, critical: 'none' },
  { type: 'stat_change', reason: 'Goblin hit you', hp: 9 },
  { type: 'map', map: sampleMapAssembly },
  { type: 'popup', id: 'p1', title: 'Item found', body: 'You found a Healing Potion.', variant: 'reward' },
  { type: 'choices', choiceId: 'c1', prompt: 'The road forks.', options: [{ id: 'north', label: 'Take the mountain pass' }, { id: 'south', label: 'Follow the river' }] },
  { type: 'error', code: 'GM_UNAVAILABLE', message: 'The GM needs a breath. Try again.', retryable: true },
  { type: 'combat_update', combatId: 'f1', round: 1, turnOrder: [{ id: 'player', name: 'Brannoc', kind: 'player' }, { id: 'goblin#1', name: 'Goblin Scout', kind: 'enemy' }], activeId: 'player', enemies: [sampleEnemyInstance], playerEffects: [{ powerId: 'shield', kind: 'ac', amount: 2, turnsLeft: 3 }], ended: false },
  { type: 'quest_update', quests: [{ id: 'q1', title: 'Reach the village', description: '', status: 'active' }] },
  { type: 'chapter_end', chapterNumber: 1, branchTaken: 'south', summary: 'You followed the river to Millbrook.' },
  { type: 'game_over', difficulty: 'normal', outcome: 'restart_chapter', reason: 'Fell to the goblin chief.' },
  { type: 'narration_chunk', text: 'It falls back, snarling.', done: true },
];

/** The richer T066 mock map (forest, pond, village, forked road) plus its map_Data and starting fog of war. */
export { MOCK_MAP_SEED, MOCK_MAP_SIZE, makeMockMap, mockMap, mockMapData, mockMapRevealed } from './mockMap.js';
