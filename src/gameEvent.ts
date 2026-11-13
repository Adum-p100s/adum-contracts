import { z } from 'zod';
import { NonNegInt, PosInt } from './common.js';
import { Difficulty } from './classes.js';
import { EnemyInstance } from './enemy.js';
import { ActiveEffect } from './power.js';
import { MapAssembly } from './mapData.js';
import { StatKey } from './stats.js';

/** Streamed narration text. done=true marks the last chunk of a GM reply. */
export const NarrationChunkEvent = z.strictObject({
  type: z.literal('narration_chunk'),
  text: z.string().max(4000),
  done: z.boolean(),
});

/** A d20 check: roll + modifier vs DC. Shown with the dice animation. */
export const RollResultEvent = z
  .strictObject({
    type: z.literal('roll_result'),
    rollId: z.string().min(1).max(64),
    stat: StatKey,
    reason: z.string().max(200),
    roll: z.number().int().min(1).max(20),
    modifier: z.number().int().min(-10).max(30),
    total: z.number().int(),
    dc: z.number().int().min(1).max(40),
    success: z.boolean(),
    critical: z.enum(['none', 'success', 'failure']),
  })
  .refine((r) => r.total === r.roll + r.modifier, { message: 'total must equal roll + modifier', path: ['total'] });

/** New values after a change (only the fields that changed are sent). */
export const StatChangeEvent = z.strictObject({
  type: z.literal('stat_change'),
  reason: z.string().max(200),
  hp: NonNegInt.optional(),
  maxHp: PosInt.optional(),
  mana: NonNegInt.optional(),
  maxMana: NonNegInt.optional(),
  xp: NonNegInt.optional(),
  level: PosInt.optional(),
  stats: z
    .strictObject({
      STR: z.number().int().optional(), DEX: z.number().int().optional(), CON: z.number().int().optional(),
      INT: z.number().int().optional(), WIS: z.number().int().optional(), CHA: z.number().int().optional(),
    })
    .optional(),
});

export const MapEvent = z.strictObject({ type: z.literal('map'), map: MapAssembly });

export const PopupEvent = z.strictObject({
  type: z.literal('popup'),
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(80),
  body: z.string().max(1000),
  variant: z.enum(['info', 'warning', 'reward']),
});

/** A story fork: the player picks one branch. */
export const ChoicesEvent = z.strictObject({
  type: z.literal('choices'),
  choiceId: z.string().min(1).max(64),
  prompt: z.string().max(300),
  options: z.array(z.strictObject({ id: z.string().min(1).max(64), label: z.string().min(1).max(120) })).min(2).max(4),
});

export const ErrorEvent = z.strictObject({
  type: z.literal('error'),
  code: z.string().min(1).max(64),
  message: z.string().max(500),
  retryable: z.boolean(),
});

export const CombatUpdateEvent = z.strictObject({
  type: z.literal('combat_update'),
  combatId: z.string().min(1).max(64),
  round: PosInt,
  turnOrder: z.array(z.strictObject({ id: z.string().min(1).max(64), name: z.string().max(80), kind: z.enum(['player', 'enemy']) })).min(1),
  activeId: z.string().min(1).max(64),
  enemies: z.array(EnemyInstance),
  playerEffects: z.array(ActiveEffect).default([]),
  ended: z.boolean(),
  outcome: z.enum(['victory', 'defeat', 'fled']).optional(),
});

export const QuestUpdateEvent = z.strictObject({
  type: z.literal('quest_update'),
  quests: z.array(
    z.strictObject({
      id: z.string().min(1).max(64),
      title: z.string().min(1).max(120),
      description: z.string().max(500).default(''),
      status: z.enum(['active', 'done', 'failed']),
    }),
  ),
});

export const ChapterEndEvent = z.strictObject({
  type: z.literal('chapter_end'),
  chapterNumber: PosInt,
  branchTaken: z.string().max(120),
  summary: z.string().max(2000),
});

/** Normal: restart the chapter from its checkpoint. Hardcore: permadeath. */
export const GameOverEvent = z
  .strictObject({
    type: z.literal('game_over'),
    difficulty: Difficulty,
    outcome: z.enum(['restart_chapter', 'permadeath']),
    reason: z.string().max(300),
  })
  .refine((g) => (g.difficulty === 'normal') === (g.outcome === 'restart_chapter'), {
    message: 'normal -> restart_chapter, hardcore -> permadeath',
    path: ['outcome'],
  });

/** Every message the backend streams to the frontend over SSE. Switch on `type`. */
export const GameEvent = z.discriminatedUnion('type', [
  NarrationChunkEvent,
  RollResultEvent,
  StatChangeEvent,
  MapEvent,
  PopupEvent,
  ChoicesEvent,
  ErrorEvent,
  CombatUpdateEvent,
  QuestUpdateEvent,
  ChapterEndEvent,
  GameOverEvent,
]);
export type GameEvent = z.infer<typeof GameEvent>;
export type GameEventType = GameEvent['type'];
