# List-App

A multi-list todo app built with **Next.js + React + TypeScript**. Designed to grow from a local-only prototype into a full-stack app with auth and a Discord bot — without rewriting the frontend.

This README is also a learning guide. It explains *how* the code works, not just how to run it.

---

## Features (Phase 1)

- 📋 **Multiple lists** — create, rename, delete, switch between them
- ✅ **Per-item actions** — add, edit, mark complete, delete
- 🔃 **Drag-and-drop reordering** — works with mouse, touch, and keyboard
- 🧹 **Bulk delete via completion** — mark items complete, then "Delete completed" wipes them all out (no separate multi-select column to clutter the row)
- 🗑️ **Three delete modes** — single, completed, all — every one with confirmation
- 📑 **List multi-select** — sidebar "Select" button reveals checkboxes for deleting many lists at once
- 🏆 **List completion indicator** — a list with items shows as complete (✓ + strikethrough) when every item is done; empty lists never show as complete
- ⚙️ **Settings menu** — gear icon in the top-right with theme toggle and 8 accent color presets (Crimson default, plus Rose, Amber, Emerald, Cyan, Indigo, Violet, Slate)
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
  SettingsMenu.tsx    # Gear icon → theme toggle + accent picker
  lists/              # Sidebar with all your lists (with select mode + completion indicator)
  items/              # Items in the active list (rows, drag-and-drop, add input, bulk bar)
hooks/
  useAppearance.tsx   # Theme + accent color hook (with named presets)
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

### 4. Appearance hook — `hooks/useAppearance.tsx`

Same pattern, smaller scope. `AppearanceProvider` holds the current `theme` ('light' | 'dark') and `accent` (one of 8 named presets like `'crimson'` or `'emerald'`). `useAppearance()` reads them. When you change either, we (a) update React state, (b) write CSS variables on `<html>` to the right colors for the new theme + accent, (c) save the choice to localStorage.

The accent presets are defined right at the top of the file. Each has separate light-mode and dark-mode color values so contrast against the background stays good in both. Want to change the default red? Edit `crimson` and you're done. Want to add a new color? Add an entry to `ACCENT_PRESETS` and update the matching map in `app/layout.tsx` (the inline bootstrap script needs the same data to avoid a flash on page load).

### 5. Providers — `app/providers.tsx`

Glues `<AppearanceProvider>` and `<DataProvider>` around your app. Components inside can call both hooks.

### 6. Components — `components/`

These read state via the hooks and render UI. None of them touch localStorage. None of them know there *is* a localStorage.

---

## How theming works

Tailwind v4 introduced CSS-first configuration. We define base theme tokens in `app/globals.css`:

```css
:root { --color-bg: #ffffff; --color-fg: #0a0a0a; ...; --color-accent: #991b1b; }
.dark { --color-bg: #0a0a0a; --color-fg: #fafafa; ...; --color-accent: #b91c1c; }

@theme inline {              /* expose vars as Tailwind utility colors */
  --color-bg: var(--color-bg);
  --color-fg: var(--color-fg);
  --color-accent: var(--color-accent);
}
```

After this, you can write `bg-bg`, `text-fg`, `bg-accent` in any component and the colors automatically swap when `.dark` is on `<html>`.

**Two layers of theming:**

1. **Theme** (light vs dark) — the `.dark` class on `<html>` flips between the two color sets above.
2. **Accent** (8 named presets in `useAppearance.tsx`) — when you pick a different accent in the settings menu, JavaScript writes inline CSS variables on `<html>`, overriding `--color-accent`, `--color-accent-hover`, and `--color-ring` with the values for the chosen accent + current theme.

**No flash of wrong colors on load**: if React added these classes after first render, you'd see the page in default colors for a split second. Instead, an inline `<script>` in `layout.tsx` runs *before* React hydrates, reads both `list-app-theme` and `list-app-accent` from localStorage, and applies them immediately. Important detail: that script has a duplicate of the accent preset table — when you change one, change the other (the comment in `layout.tsx` reminds you).

To add a new accent: add an entry to `ACCENT_PRESETS` in `hooks/useAppearance.tsx`, copy the same entry into the `ACCENTS` map in `app/layout.tsx`, done.

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

## How list completion works

A list shows a ✓ and strikethrough in the sidebar when:

```ts
items.length > 0 && items.every(i => i.completed)
```

Empty lists are intentionally **not** marked complete — the user probably just hasn't added anything yet, so showing it as "done" would be misleading.

Computing this for every list (not just the active one) means the hook needs to know about items in all lists. So `useLists` keeps a `Record<listId, Item[]>` map in memory and derives both:
- `items` — items for the currently active list (what the right-pane renders)
- `listStats` — `{ total, completed, isComplete }` per list (what the sidebar shows)

For Phase 1, loading every item is fine (localStorage is fast, datasets are tiny). For Phase 2, we'll replace `getAllItemsByList()` with a SQL aggregate that returns counts only — the same `listStats` shape, far less data.

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
