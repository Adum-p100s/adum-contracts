import { z } from 'zod';
import { Id, NonNegInt } from './common.js';

export const MAP_SIZE_MIN = 64;
export const MAP_SIZE_MAX = 128;

/** Biomes available for the MVP. */
export const ENVIRONMENT_TYPES = ['grassland', 'forest', 'settlement', 'dungeon', 'cave', 'desert', 'snow'] as const;
export const EnvironmentType = z.enum(ENVIRONMENT_TYPES);
export type EnvironmentType = z.infer<typeof EnvironmentType>;

/** Map edges a road network must reach (exits to the next area). */
export const MapEdge = z.enum(['north', 'south', 'east', 'west']);
export type MapEdge = z.infer<typeof MapEdge>;

/** Where the generator should place an event character. Gemini never gives coordinates. */
export const PlacementZone = z.enum(['settlement', 'road', 'forest_edge', 'water_edge', 'dungeon_entrance', 'wilderness', 'random']);
export type PlacementZone = z.infer<typeof PlacementZone>;

export const EventCharacter = z.strictObject({
  id: z.string().min(1).max(64), // unique within this map, e.g. "merchant_1"
  kind: z.enum(['npc', 'enemy']),
  templateId: Id, // enemy template or NPC portrait/template id
  name: z.string().min(1).max(80),
  zone: PlacementZone,
});
export type EventCharacter = z.infer<typeof EventCharacter>;

/**
 * map_Data: what Gemini fills in at the start of a chapter (via generate_map).
 * Field names follow the midterm report. Placement lives on each event character
 * (zone), so there is no separate eventCPlacements list.
 */
export const MapData = z
  .strictObject({
    map_Size: z.number().int().min(MAP_SIZE_MIN).max(MAP_SIZE_MAX), // square: 64 -> 64x64
    levelNumber: z.number().int().min(1),
    environment_Type: EnvironmentType,
    seed: z.number().int().min(0).optional(), // set by the backend if Gemini leaves it out
    componentData: z.strictObject({
      roadAmount: z.number().int().min(0).max(20),
      roadConnections: z.array(MapEdge).max(4),
      settlementAmount: z.number().int().min(0).max(10),
      eventCharacters: z.array(EventCharacter).max(20),
    }),
  })
  .superRefine((m, ctx) => {
    const ids = m.componentData.eventCharacters.map((e) => e.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: 'custom', path: ['componentData', 'eventCharacters'], message: 'event character ids must be unique' });
    if (new Set(m.componentData.roadConnections).size !== m.componentData.roadConnections.length)
      ctx.addIssue({ code: 'custom', path: ['componentData', 'roadConnections'], message: 'each edge at most once' });
    if (m.componentData.eventCharacters.some((e) => e.zone === 'settlement') && m.componentData.settlementAmount === 0)
      ctx.addIssue({ code: 'custom', path: ['componentData', 'settlementAmount'], message: 'a character is placed in a settlement but settlementAmount is 0' });
  });
export type MapData = z.infer<typeof MapData>;

const Point = z.strictObject({ x: NonNegInt, y: NonNegInt });

/**
 * Map assembly: what the generator outputs and the frontend renders.
 * - tiles: the opaque ground layer, row-major (index = y * size + x), tile ids from the art database.
 * - overlays: everything with a transparent background, drawn on top of the ground in array order:
 *   blend edges, roads, details, obstacles, buildings. A cell may have several.
 * - walkable: same indexing as tiles; already accounts for obstacles, buildings and water.
 */
export const MapAssembly = z
  .strictObject({
    seed: z.number().int().min(0),
    size: z.number().int().min(MAP_SIZE_MIN).max(MAP_SIZE_MAX),
    environment_Type: EnvironmentType,
    tiles: z.array(Id),
    overlays: z.array(z.strictObject({ x: NonNegInt, y: NonNegInt, tileId: Id })).default([]),
    walkable: z.array(z.boolean()), // same indexing as tiles
    spawns: z.array(z.strictObject({ eventCharacterId: z.string().min(1).max(64), x: NonNegInt, y: NonNegInt })),
    playerStart: Point,
  })
  .superRefine((m, ctx) => {
    const n = m.size * m.size;
    if (m.tiles.length !== n) ctx.addIssue({ code: 'custom', path: ['tiles'], message: `expected ${n} tiles (size x size)` });
    if (m.walkable.length !== n) ctx.addIssue({ code: 'custom', path: ['walkable'], message: `expected ${n} walkable flags` });
    const inside = (p: { x: number; y: number }) => p.x < m.size && p.y < m.size;
    if (!inside(m.playerStart)) ctx.addIssue({ code: 'custom', path: ['playerStart'], message: 'outside the map' });
    m.spawns.forEach((s, i) => { if (!inside(s)) ctx.addIssue({ code: 'custom', path: ['spawns', i], message: 'outside the map' }); });
    m.overlays.forEach((o, i) => { if (!inside(o)) ctx.addIssue({ code: 'custom', path: ['overlays', i], message: 'outside the map' }); });
  });
export type MapAssembly = z.infer<typeof MapAssembly>;

/** Row-major index of a cell, the same indexing `tiles`, `walkable` and fog arrays use. */
export function tileIndex(size: number, x: number, y: number): number {
  return y * size + x;
}

/** How far the player sees, in tiles (a circle around the player). */
export const FOG_REVEAL_RADIUS = 6;

/**
 * Fog of war: returns a new `revealed` array (size x size, row-major) with every cell within
 * `radius` of (x, y) set to true. Pass `undefined` to start from a fully hidden map.
 */
export function revealAround(revealed: readonly boolean[] | undefined, size: number, x: number, y: number, radius = FOG_REVEAL_RADIUS): boolean[] {
  const out = revealed ? revealed.slice() : new Array<boolean>(size * size).fill(false);
  for (let cy = Math.max(0, y - radius); cy <= Math.min(size - 1, y + radius); cy++)
    for (let cx = Math.max(0, x - radius); cx <= Math.min(size - 1, x + radius); cx++)
      if ((cx - x) ** 2 + (cy - y) ** 2 <= radius * radius) out[tileIndex(size, cx, cy)] = true;
  return out;
}
