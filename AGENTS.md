# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

This is a **uni-app** (Vue 3 + Vite) classroom management mobile app ("26S201 Class OS"). It targets H5 (web), WeChat Mini Program, and other platforms. The backend is either a hosted Supabase instance or a comprehensive in-memory mock backend.

### Running the development server

```bash
VITE_USE_MOCK=true npm run dev:h5
```

- The dev server starts on `http://localhost:5173/`.
- Setting `VITE_USE_MOCK=true` activates the built-in mock backend (`src/lib/mockBackend.js`) with seeded demo data — no external services required.
- To use the live Supabase backend instead, set `VITE_USE_MOCK=false` (requires valid credentials in `.env`).

### Mock backend login credentials

- **Admin user:** `test@class.com` (username: `alex_tan`) — no password required (any value works).
- **Class members:** Use any member's email from the roster. Default password: `123456`.

### Build

```bash
npm run build:h5
```

### Key caveats

- There is no ESLint, TypeScript strict mode, or pre-commit hooks configured in this repo.
- There is no test framework configured — no `npm test` command exists.
- The `package-lock.json` is the lockfile; always use `npm` (not pnpm/yarn).
- The `.env` file is committed to the repo with the Supabase anon key. For local dev with mock backend, override `VITE_USE_MOCK=true` either in `.env` or as an environment variable prefix.
- Vite is pinned to `^5.2.8` for uni-app compatibility — do not upgrade without verifying `@dcloudio/vite-plugin-uni` support.
