import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTRACTS_VERSION, FOG_REVEAL_RADIUS, GameEvent, MapAssembly, MapData, revealAround, tileIndex } from '../src/index.js';
import { makeMockMap, mockMap, mockMapData, mockMapRevealed } from '../src/samples.js';

const ROAD_SIDES = ['none', 'n', 'e', 's', 'w', 'ns', 'ew', 'ne', 'es', 'sw', 'nw', 'nes', 'new', 'nsw', 'esw', 'nesw'];
const BIOMES = ['grassland', 'forest', 'settlement', 'dungeon', 'cave', 'desert', 'snow', 'shared'];
const at = (x: number, y: number) => tileIndex(mockMap.size, x, y);

describe('mock map (T066)', () => {
  it('validates against MapAssembly and MapData', () => {
    expect(MapAssembly.safeParse(mockMap).success).toBe(true);
    expect(MapData.safeParse(mockMapData).success).toBe(true);
    expect(GameEvent.safeParse({ type: 'map', map: mockMap }).success).toBe(true);
  });

  it('is deterministic', () => expect(makeMockMap()).toEqual(mockMap));

  it('mock/mock-map.json is up to date (run npm run build:mock)', () => {
    const file = JSON.parse(readFileSync(new URL('../mock/mock-map.json', import.meta.url), 'utf8'));
    expect(file).toEqual({ contractsVersion: CONTRACTS_VERSION, mapData: mockMapData, map: mockMap, revealed: mockMapRevealed });
  });

  it('every tile id follows the art naming: biome first, known road pieces', () => {
    for (const id of [...mockMap.tiles, ...mockMap.overlays.map((o) => o.tileId)]) {
      expect(BIOMES, id).toContain(id.split('_')[0]);
      if (id.startsWith('shared_road_dirt_')) expect(ROAD_SIDES, id).toContain(id.slice('shared_road_dirt_'.length));
    }
    expect(mockMap.tiles.every((id) => /_base_/.test(id))).toBe(true); // ground layer is opaque base tiles only
  });

  it('spawns match map_Data and stand on walkable cells', () => {
    expect(mockMap.spawns.map((s) => s.eventCharacterId).sort()).toEqual(mockMapData.componentData.eventCharacters.map((e) => e.id).sort());
    for (const s of mockMap.spawns) expect(mockMap.walkable[at(s.x, s.y)], s.eventCharacterId).toBe(true);
  });

  it('the player can walk from the start to every spawn and both road exits', () => {
    const seen = new Set<number>([at(mockMap.playerStart.x, mockMap.playerStart.y)]);
    const queue = [mockMap.playerStart];
    while (queue.length) {
      const { x, y } = queue.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= mockMap.size || ny >= mockMap.size) continue;
        if (!mockMap.walkable[at(nx, ny)] || seen.has(at(nx, ny))) continue;
        seen.add(at(nx, ny));
        queue.push({ x: nx, y: ny });
      }
    }
    for (const s of mockMap.spawns) expect(seen.has(at(s.x, s.y)), s.eventCharacterId).toBe(true);
    expect(seen.has(at(mockMap.size - 1, mockMap.playerStart.y))).toBe(true);
    for (const o of mockMap.overlays) if (o.tileId.startsWith('shared_road_')) expect(mockMap.walkable[at(o.x, o.y)]).toBe(true);
  });

  it('water and buildings block movement', () => {
    mockMap.tiles.forEach((id, i) => { if (id.startsWith('shared_water_')) expect(mockMap.walkable[i]).toBe(false); });
    for (const o of mockMap.overlays) if (/_(building|obstacle)_/.test(o.tileId)) expect(mockMap.walkable[at(o.x, o.y)], o.tileId).toBe(false);
  });
});

describe('fog of war', () => {
  it('starts hidden except a circle around the player', () => {
    const { x, y } = mockMap.playerStart;
    expect(mockMapRevealed).toHaveLength(mockMap.size ** 2);
    expect(mockMapRevealed[at(x, y)]).toBe(true);
    expect(mockMapRevealed[at(x + FOG_REVEAL_RADIUS, y)]).toBe(true);
    expect(mockMapRevealed[at(x + FOG_REVEAL_RADIUS + 1, y)]).toBe(false);
  });
  it('revealAround keeps what was already revealed and does not mutate its input', () => {
    const next = revealAround(mockMapRevealed, mockMap.size, 30, 32);
    expect(next[at(1, 32)]).toBe(true);
    expect(next[at(30, 32)]).toBe(true);
    expect(mockMapRevealed[at(30, 32)]).toBe(false);
  });
  it('clips at the map edge', () => expect(revealAround(undefined, 64, 0, 0, 3).filter(Boolean).length).toBeGreaterThan(0));
});
