/**
 * A hand-built 64x64 mock map (T066) so the frontend can render before the real generator exists.
 * It uses the tile ids from the art guide (biome_category_name_nn, shared_road_dirt_<sides>, ...)
 * and the exact MapAssembly shape the generator will output.
 * Deterministic: the same call always returns the same map.
 */
import { revealAround, tileIndex, type MapAssembly, type MapData } from './mapData.js';

export const MOCK_MAP_SIZE = 64;
export const MOCK_MAP_SEED = 7;

/** The map_Data that would have produced the mock map. */
export const mockMapData: MapData = {
  map_Size: MOCK_MAP_SIZE, levelNumber: 1, environment_Type: 'grassland', seed: MOCK_MAP_SEED,
  componentData: {
    roadAmount: 2, roadConnections: ['west', 'east'], settlementAmount: 1,
    eventCharacters: [
      { id: 'merchant_1', kind: 'npc', templateId: 'merchant', name: 'Old Hesk', zone: 'settlement' },
      { id: 'goblin_1', kind: 'enemy', templateId: 'goblin', name: 'Goblin Scout', zone: 'forest_edge' },
      { id: 'wolf_1', kind: 'enemy', templateId: 'wolf', name: 'Grey Wolf', zone: 'wilderness' },
    ],
  },
};

/** Small seeded PRNG (mulberry32) so the mock never changes between runs. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Ground = 'grass' | 'forest' | 'water' | 'cobble';

const ROAD_Y = 32; // west-east road
const BRANCH_X = 40; // side road north to the settlement
const VILLAGE = { x0: 33, y0: 11, x1: 48, y1: 22 }; // cobbled square, inclusive
const BUILDINGS: { id: string; x: number; y: number }[] = [
  { id: 'settlement_building_tavern', x: 35, y: 13 },
  { id: 'settlement_building_house-a', x: 43, y: 13 },
  { id: 'settlement_building_house-b', x: 44, y: 18 },
];

export function makeMockMap(): MapAssembly {
  const size = MOCK_MAP_SIZE;
  const rng = mulberry32(MOCK_MAP_SEED);
  const pick = <T,>(options: [T, number][]): T => {
    let r = rng() * options.reduce((sum, [, w]) => sum + w, 0);
    for (const [value, weight] of options) if ((r -= weight) < 0) return value;
    return options[0][0];
  };
  const at = (x: number, y: number) => tileIndex(size, x, y);

  // 1. Ground: grass everywhere, a forest in the north-west, a pond in the south-east, a cobbled village.
  const ground: Ground[] = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const inForest = (x - 12) ** 2 + (y - 12) ** 2 <= 11 ** 2 + Math.sin(x * 1.3 + y * 0.7) * 14;
    const inPond = ((x - 50) / 7) ** 2 + ((y - 46) / 5) ** 2 < 1; // strict: no one-cell tips
    const inVillage = x >= VILLAGE.x0 && x <= VILLAGE.x1 && y >= VILLAGE.y0 && y <= VILLAGE.y1;
    ground.push(inVillage ? 'cobble' : inPond ? 'water' : inForest ? 'forest' : 'grass');
  }
  const groundAt = (x: number, y: number): Ground | undefined => (x < 0 || y < 0 || x >= size || y >= size ? undefined : ground[at(x, y)]);

  const tiles = ground.map((g) =>
    g === 'grass' ? pick([['grassland_base_grass_01', 50], ['grassland_base_grass_02', 25], ['grassland_base_grass_03', 15], ['grassland_base_grass_04', 10]])
    : g === 'forest' ? pick([['forest_base_floor_01', 70], ['forest_base_floor_02', 30]])
    : g === 'water' ? pick([['shared_water_base_01', 60], ['shared_water_base_02', 25], ['shared_water_base_03', 15]])
    : pick([['settlement_base_cobble_01', 70], ['settlement_base_cobble_02', 30]]),
  );
  const walkable = ground.map((g) => g !== 'water');
  const overlays: MapAssembly['overlays'] = [];
  const taken = new Set<number>(); // cells that already hold a road, building or prop

  // 2. Blend overlays: grass creeping over the pond's shoreline (drawn on the water cell).
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (groundAt(x, y) !== 'water') continue;
    const land = (dx: number, dy: number) => { const g = groundAt(x + dx, y + dy); return g !== undefined && g !== 'water'; };
    const sides = (land(0, -1) ? 'n' : '') + (land(1, 0) ? 'e' : '') + (land(0, 1) ? 's' : '') + (land(-1, 0) ? 'w' : '');
    const inner: Record<string, string> = { ne: 'inner-ne', nw: 'inner-nw', es: 'inner-se', sw: 'inner-sw' };
    if (sides.length === 1) overlays.push({ x, y, tileId: `shared_overlay_grass-over-water_${sides}` });
    else if (inner[sides]) overlays.push({ x, y, tileId: `shared_overlay_grass-over-water_${inner[sides]}` });
    else if (sides === '') {
      for (const [dx, dy, corner] of [[1, -1, 'ne'], [-1, -1, 'nw'], [1, 1, 'se'], [-1, 1, 'sw']] as const)
        if (land(dx, dy)) overlays.push({ x, y, tileId: `shared_overlay_grass-over-water_${corner}` });
    }
  }

  // 3. Roads: one west-east road, one branch north into the village. Sides are listed n, e, s, w.
  const road = new Set<number>();
  for (let x = 0; x < size; x++) road.add(at(x, ROAD_Y));
  for (let y = VILLAGE.y1 + 1; y < ROAD_Y; y++) road.add(at(BRANCH_X, y));
  for (const i of road) {
    const x = i % size, y = Math.floor(i / size);
    const joins = (dx: number, dy: number) => {
      const nx = x + dx, ny = y + dy;
      if (ny === ROAD_Y && (nx < 0 || nx >= size)) return true; // the main road leaves through the west and east edges
      if (nx === BRANCH_X && ny === VILLAGE.y1) return true; // the branch meets the village square
      return nx >= 0 && ny >= 0 && nx < size && ny < size && road.has(at(nx, ny));
    };
    const sides = (joins(0, -1) ? 'n' : '') + (joins(1, 0) ? 'e' : '') + (joins(0, 1) ? 's' : '') + (joins(-1, 0) ? 'w' : '');
    overlays.push({ x, y, tileId: `shared_road_dirt_${sides}` });
    taken.add(i);
  }

  // 4. Buildings: 2 x 2 blocks cut into quarters (tl, tr, bl, br). Not walkable.
  for (const b of BUILDINGS)
    for (const [dx, dy, quarter] of [[0, 0, 'tl'], [1, 0, 'tr'], [0, 1, 'bl'], [1, 1, 'br']] as const) {
      overlays.push({ x: b.x + dx, y: b.y + dy, tileId: `${b.id}_${quarter}` });
      walkable[at(b.x + dx, b.y + dy)] = false;
      taken.add(at(b.x + dx, b.y + dy));
    }

  // 5. Props. Obstacles block movement; details are decoration only.
  const prop = (x: number, y: number, tileId: string, blocks: boolean) => {
    overlays.push({ x, y, tileId });
    if (blocks) walkable[at(x, y)] = false;
    taken.add(at(x, y));
  };
  prop(40, 17, 'settlement_obstacle_well_01', true);
  prop(38, 19, 'settlement_obstacle_stall_01', true);
  prop(34, 20, 'settlement_obstacle_barrel_01', true);
  prop(47, 12, 'settlement_obstacle_crate_01', true);
  prop(46, 21, 'settlement_detail_hay_01', false);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = at(x, y);
    const roll = rng(); // one draw per cell keeps the layout stable if rules above change
    if (taken.has(i)) continue;
    const g = ground[i];
    if (g === 'forest') {
      if (roll < 0.3) prop(x, y, pick([['forest_obstacle_oak_01', 30], ['forest_obstacle_oak_02', 20], ['forest_obstacle_pine_01', 25], ['forest_obstacle_pine_02', 15], ['forest_obstacle_bush_01', 10]]), true);
      else if (roll < 0.4) prop(x, y, pick([['forest_detail_leaves_01', 60], ['forest_detail_mushrooms_01', 40]]), false);
    } else if (g === 'grass') {
      if (Math.abs(y - ROAD_Y) <= 1) continue; // keep the roadside clear
      if (roll < 0.015) prop(x, y, 'forest_obstacle_oak_01', true);
      else if (roll < 0.07) prop(x, y, pick([['grassland_detail_flowers_01', 30], ['grassland_detail_flowers_02', 20], ['grassland_detail_pebbles_01', 25], ['grassland_detail_tallgrass_01', 25]]), false);
    } else if (g === 'water' && roll < 0.06) {
      overlays.push({ x, y, tileId: pick([['shared_water_detail_lilypads_01', 50], ['shared_water_detail_reeds_01', 50]]) });
    }
  }

  return {
    seed: MOCK_MAP_SEED, size, environment_Type: 'grassland', tiles, overlays, walkable,
    spawns: [
      { eventCharacterId: 'merchant_1', x: 39, y: 20 },
      { eventCharacterId: 'goblin_1', x: 25, y: 16 },
      { eventCharacterId: 'wolf_1', x: 20, y: 48 },
    ],
    playerStart: { x: 1, y: ROAD_Y },
  };
}

export const mockMap = makeMockMap();

/** Fog of war at the start of the chapter: only the area around the player is revealed. */
export const mockMapRevealed = revealAround(undefined, mockMap.size, mockMap.playerStart.x, mockMap.playerStart.y);
