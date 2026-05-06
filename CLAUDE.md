# CLAUDE.md — Project Memory for List-App

> This file is read by Claude when working in this repo. It keeps Claude oriented across sessions so you don't have to re-explain the architecture every time.

## What this is

A multi-list todo app built as a **learning vehicle for full-stack JavaScript/React**. The user is a part-time ServiceNow developer learning React and full-stack development. **Code is a teaching artifact** — comment generously, prefer mainstream patterns, explain *why*.

It will eventually be used by 1–3 people (mostly the owner) and integrated with a Discord bot.

## Phase tracker

- [x] **Phase 1 — local frontend.** Multi-list todo app with localStorage persistence, drag-and-drop, light/dark theme, multi-select, all delete variants with confirmation, fully responsive (desktop + mobile drawer).
- [ ] **Phase 2 — backend.** Next.js API routes + Neon Postgres (via Vercel Marketplace) + Drizzle ORM + Auth.js (Credentials provider, email + bcrypt password). Swap `localStorageAdapter` → `apiAdapter`.
- [ ] **Phase 3 — Discord bot.** discord.js bot with slash commands. One-time link via 6-digit code flow (web app generates code → user DMs bot → bot calls API → backend ties Discord ID to app account). Bot uses a shared bot secret for server-to-server auth.

## Tech stack (Phase 1)

| Layer | Library / pattern |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (CSS-first config via `@theme inline` in globals.css — no `tailwind.config.ts`) |
| Drag-and-drop | `@dnd-kit/core` + `@dnd-kit/sortable` (PointerSensor with 5px activation distance, KeyboardSensor for a11y) |
| Icons | `lucide-react` |
| State | React Context + `useState` hooks. No external state library. |
| Storage | `StorageAdapter` interface in `lib/storage/types.ts` — Phase 1 impl is `localStorageAdapter.ts`, single JSON blob under `list-app:data:v1`. |
| Theming | CSS variables on `:root` and `.dark`. `@custom-variant dark` directive. Theme persisted in `list-app-theme` localStorage key. |
| ID generation | `crypto.randomUUID()` via `lib/id.ts` |

## Architecture (the seam that matters)

The single most important design decision: **UI components never touch storage directly.** They use the `useLists()` hook, which reads/writes via the active `StorageAdapter`. When Phase 2 swaps `localStorageAdapter` for `apiAdapter`, no component changes.

```
UI components → useLists() hook → StorageAdapter → localStorage (Phase 1) or fetch /api/* (Phase 2)
```

Storage methods are async even in Phase 1 to match Phase 2's network calls — no UI rewrite needed.

## Repo layout

```
app/                    # Next.js App Router
  layout.tsx            # Root <html>, theme bootstrap script, mounts <Providers>
  page.tsx              # Main app shell (top bar + responsive sidebar + list view)
  providers.tsx         # ThemeProvider + DataProvider
  globals.css           # Tailwind import, CSS vars, dark variant config
components/
  ConfirmDialog.tsx     # Reusable destructive-action confirmation modal
  ThemeToggle.tsx       # Sun/moon button
  lists/
    ListSidebar.tsx     # Left rail (or mobile drawer) — list of lists
    ListView.tsx        # Right pane — header + add input + items + bulk bar
  items/
    AddItemInput.tsx
    ItemRow.tsx         # One sortable row (drag handle, completed, text, edit, delete)
    ItemList.tsx        # DndContext + SortableContext wrapper
    BulkActionBar.tsx   # Sticky footer for "delete selected" / "delete all"
hooks/
  useTheme.tsx          # ThemeProvider + useTheme() hook
  useLists.tsx          # DataProvider + useLists() hook (lists, items, all actions)
lib/
  cn.ts                 # clsx wrapper for conditional classes
  id.ts                 # crypto.randomUUID() wrapper
  storage/
    types.ts            # StorageAdapter interface, List, Item types
    localStorageAdapter.ts
    index.ts            # getStorageAdapter() — adapter selector
```

## Conventions

- Every component starts with a 2–4 line block comment describing its job.
- Non-obvious React idioms / dnd-kit / theme tricks get a short `// why:` comment.
- Touch targets are ≥44px on every interactive element (Apple HIG / WCAG).
- Inputs use `text-base` (16px) so iOS Safari doesn't auto-zoom on focus.
- Confirmation dialogs go through `<ConfirmDialog>` — don't roll new ones.
- Single-item delete uses a custom event (`list-app:request-delete-item`) so the row doesn't have to thread a callback through dnd-kit's drag wrapping.

## Phase 2 plan (when we get there)

1. `npx vercel` link the project, install Neon Postgres via Vercel Marketplace.
2. Add `drizzle-orm` + `drizzle-kit`. Schema: `users(id, email, passwordHash, discordId)`, `lists(id, userId, name, createdAt)`, `items(id, listId, text, completed, position, createdAt)`.
3. Add Auth.js with Credentials provider. Sign up / sign in pages under `app/(auth)/`.
4. Add API routes mirroring `StorageAdapter`: `app/api/lists/route.ts`, `app/api/lists/[id]/route.ts`, `app/api/items/route.ts`, etc. Each route reads the session and scopes queries to `userId`.
5. Add `apiAdapter` in `lib/storage/apiAdapter.ts` — same interface, calls `fetch`.
6. Switch `getStorageAdapter()` to return `apiAdapter` when `NEXT_PUBLIC_USE_API === "true"`.
7. Optional: "Sync local data to cloud" button that bulk-uploads localStorage data on first sign-in.

## Phase 3 plan (Discord bot)

- Separate `bot/` package or repo using `discord.js` v14.
- Slash commands: `/lists`, `/items <list>`, `/add <list> <text>`, `/done <id>`, `/delete <id>`, `/link <code>`, `/unlink`.
- Bot calls back into the Next.js API at `https://list-app.vercel.app/api/discord/...` with a `BOT_SECRET` header.
- Linking flow: web app generates 6-digit code (5 min TTL, single use), user DMs `/link 123456`, bot API call associates Discord ID with user. Rate limit linking endpoint to 5 attempts per IP per minute.

## Glossary (for the user, who's learning React)

- **Component** — a function that returns JSX. The building block of every UI.
- **Hook** — a function whose name starts with `use` (`useState`, `useEffect`, our `useLists`). Hooks let function components have state and side effects.
- **Context** — React's built-in dependency injection. A `Provider` makes a value available to every component below it; a `useContext` call reads it.
- **Effect** — `useEffect(() => {...}, [deps])` runs the callback after render. Used for talking to non-React things (timers, network, localStorage).
- **JSX** — HTML-like syntax inside JS files. Compiled to `React.createElement(...)` calls.
- **Props** — the inputs to a component (its function arguments).
- **State** — values managed by React that, when changed, trigger a re-render.
- **Adapter** — an object that implements an interface. We have `localStorageAdapter` now; `apiAdapter` later. Same shape, different backend.
