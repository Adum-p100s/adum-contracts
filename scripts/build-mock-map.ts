/** Writes mock/mock-map.json from src/mockMap.ts. Run with: npm run build:mock */
import { writeFileSync } from 'node:fs';
import { CONTRACTS_VERSION } from '../src/index.js';
import { mockMap, mockMapData, mockMapRevealed } from '../src/mockMap.js';

const out = { contractsVersion: CONTRACTS_VERSION, mapData: mockMapData, map: mockMap, revealed: mockMapRevealed };
writeFileSync(new URL('../mock/mock-map.json', import.meta.url), JSON.stringify(out) + '\n');
console.log(`mock/mock-map.json written (${mockMap.size}x${mockMap.size}, ${mockMap.overlays.length} overlays)`);
