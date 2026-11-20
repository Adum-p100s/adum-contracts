import { z } from 'zod';
import { Id } from './common.js';
import { MapData, PlacementZone } from './mapData.js';
import { RollAdvantage } from './gameEvent.js';
import { StatKey } from './stats.js';

export const NarrateToolSchema = z.strictObject({
  text: z.string().max(4000).describe('Narration to show the player. Use for story text, not game-state changes.'),
});
export type NarrateToolArgs = z.infer<typeof NarrateToolSchema>;

export const RequestRollToolSchema = z.strictObject({
  stat: StatKey.describe('Ability score to use for the check.'),
  dc: z.number().int().describe('Proposed difficulty class; the backend clamps it to 5-30.'),
  reason: z.string().max(200).describe('Short explanation shown to the player.'),
  advantage: RollAdvantage.optional().describe('Whether to roll with advantage or disadvantage; omit for a normal roll.'),
});
export type RequestRollToolArgs = z.infer<typeof RequestRollToolSchema>;

export const StartCombatToolSchema = z.strictObject({
  enemyTemplateIds: z.array(Id.describe('ID of an enemy template from the fixed seed table.')).min(1)
    .describe('Enemy template IDs for the encounter. Never send enemy stats.'),
});
export type StartCombatToolArgs = z.infer<typeof StartCombatToolSchema>;

export const GiveItemToolSchema = z.strictObject({
  itemId: Id.describe('ID of an item from the fixed seed table.'),
});
export type GiveItemToolArgs = z.infer<typeof GiveItemToolSchema>;

export const GrantXpToolSchema = z.strictObject({
  amount: z.number().int().min(0).describe('Non-negative experience points to grant; never send player stats.'),
});
export type GrantXpToolArgs = z.infer<typeof GrantXpToolSchema>;

export const SpawnNpcToolSchema = z.strictObject({
  templateId: Id.describe('ID of the NPC template or portrait to use.'),
  name: z.string().min(1).max(80).describe('Name to display for this non-player character.'),
  zone: PlacementZone.describe('Map zone where the backend should place the character; do not provide coordinates.'),
});
export type SpawnNpcToolArgs = z.infer<typeof SpawnNpcToolSchema>;

export const SetQuestToolSchema = z.strictObject({
  id: z.string().min(1).max(64).describe('Stable ID for the quest.'),
  title: z.string().min(1).max(120).describe('Short quest title.'),
  description: z.string().max(500).describe('Quest objective or description.'),
});
export type SetQuestToolArgs = z.infer<typeof SetQuestToolSchema>;

export const UpdateQuestToolSchema = z.strictObject({
  id: z.string().min(1).max(64).describe('ID of the existing quest to update.'),
  status: z.enum(['active', 'done', 'failed']).describe('New status of the quest.'),
});
export type UpdateQuestToolArgs = z.infer<typeof UpdateQuestToolSchema>;

export const OfferChoiceToolSchema = z.strictObject({
  prompt: z.string().max(300).describe('Question or decision prompt shown to the player.'),
  branches: z.array(z.strictObject({
    id: z.string().min(1).max(64).describe('Stable ID for this story branch.'),
    label: z.string().min(1).max(120).describe('Short choice label shown to the player.'),
  })).min(2).max(4).describe('Two to four mutually exclusive story branches for the player to choose from.'),
});
export type OfferChoiceToolArgs = z.infer<typeof OfferChoiceToolSchema>;

export const ShowPopupToolSchema = z.strictObject({
  title: z.string().min(1).max(80).describe('Short popup title.'),
  body: z.string().max(1000).describe('Popup message shown to the player.'),
  variant: z.enum(['info', 'warning', 'reward']).describe('Visual category for the popup.'),
});
export type ShowPopupToolArgs = z.infer<typeof ShowPopupToolSchema>;

export const EndChapterToolSchema = z.strictObject({
  branchTaken: z.string().max(120).describe('Short description of the story branch completed by the player.'),
});
export type EndChapterToolArgs = z.infer<typeof EndChapterToolSchema>;

export const GenerateMapToolSchema = z.strictObject({
  map_Data: MapData.describe('Map-generation instructions for the new chapter. Event characters use zones, never coordinates.'),
});
export type GenerateMapToolArgs = z.infer<typeof GenerateMapToolSchema>;

export const TOOL_SCHEMAS = {
  narrate: NarrateToolSchema,
  request_roll: RequestRollToolSchema,
  start_combat: StartCombatToolSchema,
  give_item: GiveItemToolSchema,
  grant_xp: GrantXpToolSchema,
  spawn_npc: SpawnNpcToolSchema,
  set_quest: SetQuestToolSchema,
  update_quest: UpdateQuestToolSchema,
  offer_choice: OfferChoiceToolSchema,
  show_popup: ShowPopupToolSchema,
  end_chapter: EndChapterToolSchema,
  generate_map: GenerateMapToolSchema,
} as const;

const TOOL_DESCRIPTIONS: Record<keyof typeof TOOL_SCHEMAS, string> = {
  narrate: 'Send story narration to the player without changing game state.',
  request_roll: 'Ask the backend to roll a d20 ability check when an action has an uncertain outcome.',
  start_combat: 'Start a combat encounter using enemy template IDs from the fixed seed table.',
  give_item: 'Give the player an item by its ID from the fixed seed table.',
  grant_xp: 'Grant experience points to the player.',
  spawn_npc: 'Spawn a non-player character in a named placement zone; never provide coordinates.',
  set_quest: 'Create a quest for the player.',
  update_quest: 'Change the status of an existing quest.',
  offer_choice: 'Present two to four story branches for the player to choose from.',
  show_popup: 'Show a brief informational, warning, or reward popup.',
  end_chapter: 'Mark the current chapter complete and record the story branch taken.',
  generate_map: 'Provide map-generation instructions for a new chapter.',
};

const TOOL_NAMES = [
  'narrate', 'request_roll', 'start_combat', 'give_item', 'grant_xp', 'spawn_npc',
  'set_quest', 'update_quest', 'offer_choice', 'show_popup', 'end_chapter', 'generate_map',
] as const satisfies readonly (keyof typeof TOOL_SCHEMAS)[];

function toGeminiSchema(schema: z.ZodType) {
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-07' });
  const { $schema: _schemaDialect, ...parameters } = jsonSchema;
  return parameters;
}

export const TOOL_DECLARATIONS = TOOL_NAMES.map((name) => ({
  name,
  description: TOOL_DESCRIPTIONS[name],
  parameters: toGeminiSchema(TOOL_SCHEMAS[name]),
}));
