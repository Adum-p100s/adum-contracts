# adum-contracts

[![CI](https://github.com/Adum-p100s/adum-contracts/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Adum-p100s/adum-contracts/actions/workflows/ci.yml)

Shared schemas and types for **ADUM: Artificial Dungeon Master** (CSCI 318, The P100's). This is the single source of truth that `adum-frontend` and `adum-backend` both install.

**Owner:** Saba, with Mohamed for the Gemini tool schemas

## What lives here
- zod schemas + inferred types: Character, Stats (STR/DEX/CON/INT/WIS/CHA), Item, Power, Enemy, `map_Data`, GameEvent (SSE messages)
- Gemini function-calling tool schemas: `narrate`, `request_roll`, `start_combat`, `give_item`, `grant_xp`, `spawn_npc`, `set_quest`, `update_quest`, `offer_choice`, `show_popup`, `end_chapter`, `generate_map`
- Installed by the other repos as a git dependency, pinned to a tag (`v0.1.0`, ...)

Changing a schema here changes the contract for everyone, so bump the version and tell the team at Friday sync.

## Install (in adum-backend or adum-frontend)

```bash
npm install github:Adum-p100s/adum-contracts#v0.4.0
```
The repo is public, so this works anywhere, including CI and Render. npm builds the package on install (`prepare` script).

```ts
import { Character, GameEvent, MapData, statModifier } from 'adum-contracts';
import { sampleMapAssembly, sampleEvents } from 'adum-contracts/samples';

const result = GameEvent.safeParse(json);   // validate anything crossing a boundary
if (!result.success) console.error(result.error.issues);
type Event = GameEvent;                     // every schema is also a TS type
```

## What's in v0.4.0
| Schema | Key rules |
|---|---|
| `Stats` | STR, DEX, CON, INT, WIS, CHA; integers 1-20 (cap 20). `statModifier(score)` = floor((score-10)/2). `POINT_BUY`: 27 points, 8-15 |
| `ClassId` / `Difficulty` | `fighter`, `wizard`, `rogue` / `normal`, `hardcore` |
| `Item` | type, rarity (`common`..`legendary`), weapons need `damage` + `damageStat`, armor needs `armorBonus`, consumables need `heal` or `restoreMana` |
| `Power` | class (or any), mana cost, cooldown, target, stat, and at least one of damage dice, heal dice or a `buff` (`ac` / `attack` / `damage` / `check`, amount -10..10 but not 0, 1-10 turns; negative = debuff; or `stun` = target loses its turns, `evade` = the next N attacks miss) |
| `EnemyTemplate` / `EnemyInstance` | fixed template rows with `aiProfile` (`aggressive` default, `caster`, `cowardly`) / one enemy in a live fight, with its active `effects` |
| `Character` | class, difficulty, level (no cap), xp, stats, hp/mana <= max, inventory, equipment (`weapon`, `armor`, `accessory`), powers |
| `MapData` | what Gemini fills in: `map_Size` 64-128 (square), `levelNumber`, `environment_Type`, `componentData` (roads, `roadConnections` = map edges, settlements, event characters placed by **zone**, never coordinates) |
| `MapAssembly` | what map gen outputs: row-major `tiles` (opaque ground) + `walkable` (size x size), `overlays` (roads, blends, props, buildings; drawn in order on top), spawns, player start. `tileIndex(size, x, y)` gives the array index |
| Fog of war | `revealAround(revealed, size, x, y)` returns the new `revealed` array (circle of `FOG_REVEAL_RADIUS` = 6 tiles) |
| `GameEvent` | SSE messages, switch on `type`: `narration_chunk`, `roll_result` (with `advantage` and both `dice`), `stat_change`, `map`, `popup`, `choices`, `error`, `combat_update` (with `playerEffects`), `quest_update`, `chapter_end`, `game_over` |

Ids (`iron_sword`, `goblin`) are lowercase and point at rows in the fixed Supabase tables. Dice use notation like `1d8` or `2d6+3`.
`adum-contracts/samples` has a valid example of every schema.

### Mock map (T066)
A 64x64 mock map for building the renderer before map generation exists: forest, pond with shoreline blends, a village with three buildings, and a forked road. It uses the tile ids from the art guide and the exact `MapAssembly` shape the real generator will output.

```ts
import { mockMap, mockMapData, mockMapRevealed } from 'adum-contracts/samples';
```
The same data is committed as [`mock/mock-map.json`](mock/mock-map.json) (`{ contractsVersion, mapData, map, revealed }`) for anything that just wants a file. It is generated: edit `src/mockMap.ts`, then run `npm run build:mock`. A test fails if the file is stale.

Drawing order: `map.tiles[y * size + x]` first, then every entry of `map.overlays` in array order, then spawns and the player, then fog for cells where `revealed` is false.

## Changing a schema
1. Edit `src/`, add a valid and an invalid case in `test/`, run `npm test`.
2. Bump `version` in `package.json` and `CONTRACTS_VERSION` in `src/index.ts` (breaking change = minor bump while we're on 0.x).
3. After merge, tag it: `git tag v0.4.0 && git push origin v0.4.0`, then update the `#tag` in the other repos.

## Working rules

- **Never push straight to `main`.** Branch off `main`, open a pull request, and get **1 approval from someone other than you** before merging.
  CI ("Lint and Vitest") must pass before a PR can merge; GitHub enforces that on `main`. The approval is a team agreement. Please keep it.
- Branch names: `T###-short-description` (the Gantt ticket number), e.g. `T007-backend-skeleton`.
- Put the ticket number in the PR title, e.g. `T007: backend skeleton`. The PR template asks what / why / how tested.
- Secrets live only in Render and your local `.env` (git-ignored). Commit `.env.example` with variable names only.
- Squash-merge, then delete the branch.

## Who reviews

**Every PR here needs a review from the owner of each repo it affects** (frontend: Mate, backend: Saba), on top of the normal 1-approval rule.

| Author | Default reviewer | Backup |
|---|---|---|
| Saba | Mohamed | Mate |
| Mohamed | Saba | Mate |
| Anyone else | Saba | Mohamed |

## License
MIT, see [LICENSE](LICENSE).

## Changelog
- **0.4.0:** `BuffKind` gains `stun` (target loses its turns; amount -1) and `evade` (the next `amount` attacks against the holder miss), for the Wizard's Force Push and Blink Step. Additive: every 0.3.0 object still parses.
- **0.3.0:** mock map (T066): `mockMap`, `mockMapData`, `mockMapRevealed`, `mock/mock-map.json`; fog helpers `revealAround`, `tileIndex`, `FOG_REVEAL_RADIUS`; `roll_result` gains optional `advantage` and `dice` (T057). Additive: every 0.2.0 object still parses.
- **0.2.0:** `Power.buff` (buffs and debuffs, T062), `ActiveEffect` on `EnemyInstance.effects` and `combat_update.playerEffects`, `EnemyTemplate.aiProfile` (T064). Additive: every 0.1.0 object still parses.
- **0.1.0:** first schemas (T002).
