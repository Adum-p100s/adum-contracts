# adum-contracts

Shared schemas and types for **ADUM: Artificial Dungeon Master** (CSCI 318, The P100's). This is the single source of truth that `adum-frontend` and `adum-backend` both install.

**Owner:** Saba, with Mohamed for the Gemini tool schemas

## What lives here
- zod schemas + inferred types: Character, Stats (STR/DEX/CON/INT/WIS/CHA), Item, Power, Enemy, `map_Data`, GameEvent (SSE messages)
- Gemini function-calling tool schemas: `narrate`, `request_roll`, `start_combat`, `give_item`, `grant_xp`, `spawn_npc`, `set_quest`, `update_quest`, `offer_choice`, `show_popup`, `end_chapter`, `generate_map`
- Installed by the other repos as a git dependency, pinned to a tag (`v0.1.0`, ...)

Changing a schema here changes the contract for everyone, so bump the version and tell the team at Friday sync.

## Setup
Package setup arrives with ticket T002 (zod schemas v0).

## Working rules

- **Never push straight to `main`.** Branch off `main`, open a pull request, and get **1 approval from someone other than you** before merging.
  The repo is private on GitHub's free plan, so GitHub does not enforce this; it is a team agreement. Please keep it.
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
