# List-App

A multi-list todo app built with **Next.js + React + TypeScript**. Designed to grow from a local-only prototype into a full-stack app with auth and a Discord bot — without rewriting the frontend.

This README is also a learning guide. It explains *how* the code works, not just how to run it.

---

## Features (Phase 1)

- 📋 **Multiple lists** — create, rename, delete, switch between them
- ✅ **Per-item actions** — add, edit, mark complete, delete
- 🔃 **Drag-and-drop reordering** — works with mouse, touch, and keyboard
- ☑️ **Multi-select** — pick items with checkboxes for bulk operations
- 🗑️ **Three delete modes** — single, selected, all — every one with confirmation
- 🌗 **Light & dark mode** — dark by default, persisted across reloads, no flash on page load
- 📱 **Fully responsive** — two-pane layout on desktop, slide-in drawer on mobile
- 💾 **Local-first storage** — everything saves to your browser's localStorage
- 🏗️ **Backend-ready architecture** — swap localStorage for an API later without changing UI code

---

## Quick start

```bash
git clone https://github.com/Sam24854/List-App.git
cd List-App
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To make a production build:

```bash
npm run build
npm start
```

---

## Project structure

```
app/                  # Next.js pages (App Router)
  layout.tsx          # Root HTML, theme bootstrap, providers
  page.tsx            # Main app shell
  providers.tsx       # React Context wiring
  globals.css         # Theme tokens (CSS variables), Tailwind setup
components/           # All UI components
  ConfirmDialog.tsx
  ThemeToggle.tsx
  lists/              # Sidebar with all your lists
  items/              # Items in the active list (rows, drag-and-drop, add input, bulk bar)
hooks/
  useTheme.tsx        # Light/dark toggle hook
  useLists.tsx        # The big one — everything you can do with data
lib/
  cn.ts               # Tailwind class helper
  id.ts               # ID generation
  storage/            # Storage abstraction (the swap-in point for Phase 2)
    types.ts
    localStorageAdapter.ts
    index.ts
```

---

## How React works in this app

If you're new to React, here's the data flow in plain English. **Read the files in the order below** — each one builds on the last.

### 1. Storage adapter — `lib/storage/types.ts`

This file defines an *interface* (a contract): "anything that wants to store our lists must have these methods". It also defines the shape of `List` and `Item`.

```ts
export interface StorageAdapter {
  getLists(): Promise<List[]>;
  createList(name: string): Promise<List>;
  // ...etc
}
```

Why bother? Because the rest of the app talks to *the interface*, not to localStorage. Later, when we add a real database, we just write a second adapter that fulfills the same contract — and nothing else changes.

### 2. The actual implementation — `lib/storage/localStorageAdapter.ts`

This is where the contract is fulfilled for Phase 1. It reads and writes a single JSON blob to `localStorage` under the key `list-app:data:v1`. Notice every method is `async` even though `localStorage` is synchronous — that's so when we swap to a network adapter later, we don't have to change every place that calls these methods.

### 3. The hook — `hooks/useLists.tsx`

This is the biggest file in the project. It's two things in one:

- **`DataProvider`** — a React component that owns all the data state (the list of lists, the items in the active list, which items are selected, etc.) and exposes "actions" you can call (`addItem`, `deleteList`, `reorderItems`, …).
- **`useLists()`** — a hook that reads from the provider. Any component below the provider can call `useLists()` to get the data and actions.

When you call an action like `addItem("buy milk")`:

1. The hook calls `adapter.createItem(activeListId, "buy milk")`. The adapter writes to localStorage.
2. The hook updates its React state (`setItems(...)`).
3. React re-renders everything that uses `useLists()`. The new item appears.

### 4. Theme hook — `hooks/useTheme.tsx`

Same pattern, smaller scope. `ThemeProvider` holds the current theme and a `toggleTheme` function. `useTheme()` reads them. When you toggle, we (a) flip React state, (b) add/remove the `.dark` class on `<html>`, (c) save to localStorage.

### 5. Providers — `app/providers.tsx`

Glues `<ThemeProvider>` and `<DataProvider>` around your app. Components inside can call both hooks.

### 6. Components — `components/`

These read state via the hooks and render UI. None of them touch localStorage. None of them know there *is* a localStorage.

---

## How the theme works

Tailwind v4 introduced CSS-first configuration. We define theme tokens in `app/globals.css`:

```css
:root {                      /* light mode */
  --color-bg: #ffffff;
  --color-fg: #0a0a0a;
  --color-accent: #991b1b;   /* darkish red */
  /* ... */
}

.dark {                      /* dark mode overrides */
  --color-bg: #0a0a0a;
  --color-fg: #fafafa;
  --color-accent: #b91c1c;
  /* ... */
}

@theme inline {              /* expose vars as Tailwind utility colors */
  --color-bg: var(--color-bg);
  --color-fg: var(--color-fg);
  --color-accent: var(--color-accent);
}
```

After this, you can write `bg-bg`, `text-fg`, `bg-accent` in any component and the colors automatically swap when `.dark` is on `<html>`.

**No flash of light mode**: if React added the `.dark` class on first render, you'd see a white page for a split second before it caught up. Instead, an inline `<script>` in `layout.tsx` runs *before* React hydrates, reads localStorage, and sets the class immediately.

To change the accent color, edit two lines in `globals.css` and you're done.

---

## How drag-and-drop works

Drag-and-drop uses [`@dnd-kit`](https://dndkit.com), the modern React DnD library.

Three concepts:

- **`DndContext`** — wraps anything that can be dragged. Owns drag state and fires `onDragEnd`. Lives in `ItemList.tsx`.
- **`SortableContext`** — tells dnd-kit which items participate in this sortable list. Order matters here — pass IDs in the order they currently appear.
- **`useSortable({ id })`** — a hook each draggable item calls. Returns:
  - `attributes`, `listeners` — spread these onto the **drag handle** element only (the grip icon). That way tapping the row doesn't accidentally start a drag on touch devices.
  - `transform`, `transition` — CSS to apply to the row so it animates while being dragged.
  - `isDragging` — true while this row is the one being dragged.

**Sensors** decide what gestures start a drag. We use `PointerSensor` (covers mouse + touch) with a 5px activation distance — tapping doesn't drag, but holding-and-moving does. We also include `KeyboardSensor` so users can reorder with space + arrow keys.

When the user drops an item, `onDragEnd` calculates the new order and calls `reorderItems(orderedIds)` from `useLists`. The hook updates state immediately and persists to localStorage.

---

## How to add a new feature

The patterns are consistent. To add (say) **due dates on items**:

1. **Add a field** to `Item` in `lib/storage/types.ts`: `dueDate?: number` (unix ms).
2. **Update the adapter**: `localStorageAdapter.updateItem` already accepts a `Partial<Pick<Item, ...>>`. Widen the pick to include `dueDate`.
3. **Add a hook action**: in `useLists.tsx`, add `setDueDate(id, dueDate)` that calls `adapter.updateItem` and updates state.
4. **Render it**: add a date picker to `ItemRow.tsx`, hooked up to `setDueDate`.

You will not need to touch the layout, the theme, the storage selector, or the providers.

---

## Phase 2 — adding a backend (planned)

When we're ready, we'll:

1. Provision Neon Postgres via the Vercel Marketplace.
2. Add `drizzle-orm` and a schema file: `users`, `lists`, `items`, plus `discordLinkCodes`.
3. Add Auth.js (NextAuth) with the **Credentials provider** — email + password, with `bcrypt` hashing (work factor 12). This teaches password hashing, secure session cookies (`httpOnly`, `secure`, `sameSite=lax`), and CSRF tokens — all the foundational auth concepts.
4. Add API routes under `app/api/` mirroring the `StorageAdapter` methods. Each route reads the session and scopes every query to the logged-in user's ID.
5. Write `apiAdapter.ts` — same interface as `localStorageAdapter`, but calls `fetch('/api/...')`.
6. Flip the active adapter in `lib/storage/index.ts`.
7. **No UI components change.**

The README will gain a "How auth works" section walking through password hashing, sessions, and the bonus exercises (email verification, password reset).

---

## Phase 3 — Discord bot (planned)

A `discord.js` bot you DM to interact with your lists from Discord.

**Linking flow** (the safe, one-time registration):

1. Sign in to the web app, click "Link Discord" in settings.
2. The app generates a 6-digit code, valid for 5 minutes, single use.
3. DM the bot: `/link 123456`.
4. The bot calls a server-only API endpoint with `{ code, discordId, botSecret }`. The endpoint verifies the bot secret, looks up the code, marks it used, and sets `users.discordId` on your account.
5. Done. Every future bot command authenticates by sending `{ discordId, botSecret }`.

**Why this is safe:**
- The code expires fast and works only once.
- The linking endpoint is rate-limited (5 attempts per IP per minute) to defeat brute-forcing.
- The bot's secret lives in the bot host's environment, never on user devices.
- Your password never goes near Discord. The bot is a trusted server, not a logged-in user.

**Slash commands the bot will support:** `/lists`, `/items <list>`, `/add <list> <text>`, `/done <id>`, `/delete <id>`, `/link <code>`, `/unlink`.

---

## Deployment

Pushed to `main` on GitHub → Vercel auto-deploys. Pull requests get preview URLs.

To set up Vercel: in the Vercel dashboard, click **Import Project**, pick `Sam24854/List-App`, accept the auto-detected Next.js settings, and click **Deploy**. ~60 seconds later you'll have a `https://list-app-*.vercel.app` URL.

---

## Roadmap (what's next)

**Phase 1 polish (small, optional):**
- [ ] Show item count next to each list name in the sidebar
- [ ] Sort completed items to the bottom (toggle)
- [ ] Keyboard shortcut: ⌘/Ctrl+K to focus the add-item input
- [ ] Export / import all data as JSON (useful before Phase 2 cutover)

**Phase 2 — backend:** see section above.

**Phase 3 — Discord bot:** see section above.

---

## License

MIT. Use it freely.
