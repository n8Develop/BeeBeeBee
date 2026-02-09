# BeeBeeBee

Pictochat-inspired drawing chat app. Lightweight, drawing-first communication for friends.

**Design thesis:** "Why is every app so heavy and gets in the way? I just want to talk to friends."
Every feature decision filters through this. If it helps people talk to their friends, it belongs. If it makes the app feel "feature-complete," it doesn't.

## Tech Stack

```
Frontend:  Svelte 5 (SvelteKit, SPA mode) + HTML5 Canvas API
Backend:   Node.js + Socket.io + Express/Fastify
Database:  Redis (messages, 48h TTL) + SQLite (accounts, friends, rooms)
Email:     Resend (verification + password reset)
Desktop:   Tauri (post-launch)
```

## Project Structure

```
src/                    ← SvelteKit frontend
  lib/
    chat/               ← Chat feed, message rendering, reactions
    canvas/             ← Drawing canvas, tools, operations export
    social/             ← Friends list, room management
    settings/           ← User settings components
  routes/               ← SvelteKit pages
server/                 ← Node.js backend
  socket/               ← Socket.io server, room logic
  redis/                ← Redis connection, message storage
  rooms/                ← Room creation, invite links, passwords
  social/               ← Friend requests, presence tracking
  uploads/              ← Image upload endpoint, validation
  routes/               ← REST API routes (auth, settings)
  db/                   ← SQLite schema, migrations, queries
uploads/                ← User-uploaded files (gitignored)
  avatars/              ← Persistent avatar images
```

## Architecture Decisions

- **Messages auto-delete after 48 hours.** Redis TTL handles this natively.
- **Images stored on disk** (`/uploads/`), URL reference in Redis. Cron cleans orphaned files.
- **Avatars persistent** in `/uploads/avatars/{userId}.png`. 128x128 stored, 48x48 displayed.
- **Drawing data** is a unified operations array (strokes, shapes, fills, text, stamps), not raster. Replayed client-side with Canvas API. See spec for full schema.
- **Email must be verified** (Resend confirmation link) before unlocking avatar uploads and password reset.
- **28-color palette** (MS Paint XP). No color picker.
- **48 built-in stamps:** 24 icons (32x32) + 24 expressions (48x48/64x64).

## Key Constraints

- Max 16 users per room. 17th gets "This room is full."
- Max 20 rooms per user.
- Max 2MB image uploads. PNG, JPG, GIF, WebP.
- Max 2000 characters per text message.
- Rate limit: 1 message per second per user.
- Canvas: 600x200px fixed dimensions.

## Conventions

- Frontend files in `src/`, backend in `server/`. Never cross these boundaries in imports.
- Socket.io event names use colon notation: `room:join`, `message:send`, `reaction:add`.
- SQLite for persistent data (accounts, friends, rooms). Redis for ephemeral data (messages, presence, typing indicators).
- Commit messages: conventional commits (feat/fix/chore/refactor prefix).

## Code Style

- No over-engineering. Solve the current problem, not hypothetical future ones.
- No layers of abstraction for one-time operations.
- Error handling at system boundaries (user input, external APIs), not internal code.
- Comments only where logic isn't self-evident.

## Spec vs Implementation

When asked to plan, review, or discuss: do only that, no code.
When asked to implement: follow the plan, don't reinterpret.

## Verification Requirement

Every phase has a verification gate. Do not consider work complete without running the gate. See the implementation plan in the daclue workspace for phase-specific gates.
