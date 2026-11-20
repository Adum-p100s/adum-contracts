import { describe, expect, it } from 'vitest';
import {
  TOOL_DECLARATIONS, TOOL_SCHEMAS,
} from '../src/index.js';
import { sampleMapData } from '../src/samples.js';

function expectFieldDescriptions(schema: unknown, path: string): void {
  if (typeof schema !== 'object' || schema === null) return;
  const record = schema as Record<string, unknown>;
  if (typeof record.properties === 'object' && record.properties !== null) {
    for (const [name, field] of Object.entries(record.properties)) {
      expect(field, `${path}.${name}`).toMatchObject({ description: expect.any(String) });
      expectFieldDescriptions(field, `${path}.${name}`);
    }
  }
  if (record.items) expectFieldDescriptions(record.items, `${path}[]`);
}

const validArgs = {
  narrate: { text: 'The old gate creaks open.' },
  request_roll: { stat: 'STR', dc: 15, reason: 'Force the gate open.', advantage: 'none' },
  start_combat: { enemyTemplateIds: ['goblin', 'skeleton'] },
  give_item: { itemId: 'iron_sword' },
  grant_xp: { amount: 25 },
  spawn_npc: { templateId: 'village_merchant', name: 'Mira', zone: 'settlement' },
  set_quest: { id: 'find_relic', title: 'Find the relic', description: 'Recover the lost relic.' },
  update_quest: { id: 'find_relic', status: 'done' },
  offer_choice: {
    prompt: 'Which path will you take?',
    branches: [{ id: 'forest', label: 'Enter the forest' }, { id: 'road', label: 'Follow the road' }],
  },
  show_popup: { title: 'Quest complete', body: 'The relic is yours.', variant: 'reward' },
  end_chapter: { branchTaken: 'The player recovered the relic.' },
  generate_map: { map_Data: sampleMapData },
} as const;

describe('Gemini tool schemas', () => {
  it('accepts a valid argument object for every declared tool', () => {
    for (const [name, schema] of Object.entries(TOOL_SCHEMAS)) {
      expect(schema.safeParse(validArgs[name as keyof typeof validArgs]).success, name).toBe(true);
    }
  });

  it('rejects invalid arguments for every tool', () => {
    const invalidArgs = {
      narrate: { text: 'story', extra: true },
      request_roll: { stat: 'LUCK', dc: 15, reason: 'Try luck.' },
      start_combat: { enemyTemplateIds: ['Goblin'] },
      give_item: { itemId: 'not an item id' },
      grant_xp: { amount: -1 },
      spawn_npc: { templateId: 'merchant', name: 'Mira', zone: 'village' },
      set_quest: { id: '', title: 'Quest', description: 'Objective' },
      update_quest: { id: 'quest', status: 'pending' },
      offer_choice: { prompt: 'Choose', branches: [{ id: 'one', label: 'Only one' }] },
      show_popup: { title: 'Popup', body: 'Text', variant: 'success' },
      end_chapter: { branchTaken: 'x'.repeat(121) },
      generate_map: { map_Data: { ...sampleMapData, map_Size: 32 } },
    } as const;

    for (const [name, schema] of Object.entries(TOOL_SCHEMAS)) {
      expect(schema.safeParse(invalidArgs[name as keyof typeof invalidArgs]).success, name).toBe(false);
    }
  });

  it('generates one Gemini declaration for every tool schema', () => {
    expect(TOOL_DECLARATIONS.map((declaration) => declaration.name)).toEqual(Object.keys(TOOL_SCHEMAS));
    for (const declaration of TOOL_DECLARATIONS) {
      expect(declaration.description.length).toBeGreaterThan(0);
      expect(declaration.parameters).toMatchObject({ type: 'object', properties: expect.any(Object) });
      expect(declaration.parameters).not.toHaveProperty('$schema');
    }
  });

  it('documents every tool argument field in generated JSON Schema', () => {
    for (const declaration of TOOL_DECLARATIONS) expectFieldDescriptions(declaration.parameters, declaration.name);
  });
});
