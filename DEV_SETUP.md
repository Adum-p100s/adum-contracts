# ADUM contracts local setup

Use Node.js 22 or newer and npm. If you also run the frontend, use Node.js 22.12.0 or newer. You need access to the private ADUM repositories.

## Install, test, and build

```sh
git clone https://github.com/Adum-p100s/adum-contracts.git
cd adum-contracts
npm ci
npm test
npm run typecheck
npm run build
```

The `prepare` script also builds the package during installation. The build writes JavaScript and TypeScript declarations to `dist/`. This package has no server to start and needs no `.env` file, Supabase keys, or Gemini key.

## Use from the frontend or backend

When the app's manifest and lockfile already pin `adum-contracts`, install from the app root with `npm ci`. To add or update the dependency, use the agreed release tag. For example:

```sh
npm install github:Adum-p100s/adum-contracts#v0.1.0
```

Git credentials must allow access to the private contracts repository. npm builds the Git dependency using its `prepare` script.

To test an unreleased contracts change, keep the contracts and app clones in sibling directories. Run `npm ci` and `npm run build` in the contracts clone. Then run the following from the app root:

```sh
npm install --no-save --package-lock=false ../adum-contracts
```

Run the app's tests or build against the local package. To restore its locked dependencies, run `npm ci` in the app repo. Shared schemas come from `adum-contracts`, and sample data comes from `adum-contracts/samples`.
