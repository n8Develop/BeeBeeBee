# Phase 3: Real-Time Messaging

## Context

Phase 2 (drawing canvas) is complete. This phase adds real-time messaging so two people in a room can draw, type, and share images. Socket.io handles WebSocket transport, Redis stores ephemeral messages with 48h TTL, SQLite stores persistent room/membership data.

## New Dependencies

```
npm install socket.io socket.io-client ioredis multer nanoid cookie
```

## Layer 0: Foundation (before teams diverge)

These changes touch shared files. Do them first, sequentially.

### 0.1 Config + Environment

Add to `server/config.js`: `REDIS_URL` (default `redis://localhost:6379`).
Add to `.env.example`: `REDIS_URL=redis://localhost:6379`.

### 0.2 Redis Client — `server/redis/index.js`

```js
import Redis from 'ioredis';
import { config } from '../config.js';
export const redis = new Redis(config.REDIS_URL);
```

### 0.3 SQLite Schema — append to `server/db/schema.sql`

```sql
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id INTEGER NOT NULL,
  password_hash TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  max_members INTEGER NOT NULL DEFAULT 16,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS room_members (
  room_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 0.4 Room Queries — append to `server/db/queries.js`

Prepared statements: `createRoom`, `findRoomById`, `findRoomByInviteCode`, `deleteRoom`, `addRoomMember`, `removeRoomMember`, `isRoomMember`, `getRoomMembers`, `getRoomMemberCount`, `getUserRooms`, `getUserRoomCount`.

### 0.5 Server Entry — modify `server/index.js`

- Wrap `app` with `createServer(app)` from `http`
- Call `initSocket(server)` (stubbed initially)
- Add `express.static('uploads')` for serving uploaded images
- Mount room routes at `/api/rooms` and upload route at `/api/upload`
- Change `app.listen()` → `server.listen()`

### 0.6 Vite Proxy — modify `vite.config.js`

```js
proxy: {
  '/api': 'http://localhost:3001',
  '/socket.io': { target: 'http://localhost:3001', ws: true },
  '/uploads': 'http://localhost:3001'
}
```

---

## Socket.io Event Contract

### Client → Server

| Event | Payload |
|-------|---------|
| `room:join` | `{ roomId }` |
| `room:leave` | `{ roomId }` |
| `message:send` | `{ roomId, type: "drawing"\|"text"\|"image", content }` |
| `message:delete` | `{ roomId, messageId }` |
| `reaction:add` | `{ roomId, messageId, emoji }` |
| `reaction:remove` | `{ roomId, messageId, emoji }` |
| `typing:start` | `{ roomId }` |
| `typing:stop` | `{ roomId }` |

### Server → Client

| Event | Payload |
|-------|---------|
| `room:history` | `{ roomId, messages: [...] }` |
| `room:members` | `{ roomId, members: [{ userId, username, online }] }` |
| `message:new` | `{ roomId, id, userId, username, type, content, reactions: [], timestamp }` |
| `message:deleted` | `{ roomId, messageId }` |
| `reaction:updated` | `{ roomId, messageId, reactions: [{ emoji, userIds }] }` |
| `room:user-joined` | `{ roomId, userId, username }` |
| `room:user-left` | `{ roomId, userId, username }` |
| `typing:update` | `{ roomId, users: [{ userId, username }] }` |
| `error` | `{ code, message }` |

Content format — drawing: `{ operations: [...], width: 600, height: 200 }`, text: string (max 2000 chars), image: URL string from upload endpoint.

Emoji set (fixed, not arbitrary): `"heart"`, `"laugh"`, `"fire"`, `"sad"`, `"thumbsup"`, `"thumbsdown"`, `"star"`, `"question"`.

Error codes: `RATE_LIMITED`, `ROOM_FULL`, `NOT_MEMBER`, `NOT_FOUND`, `UNAUTHORIZED`, `VALIDATION_ERROR`.

---

## Redis Data Model

| Key | Type | TTL | Purpose |
|-----|------|-----|---------|
| `bbb:msg:{messageId}` | String (JSON) | 48h | Individual message with reactions |
| `bbb:room:{roomId}:msglist` | List | None | Ordered message IDs per room |
| `bbb:room:{roomId}:online` | Set | None | Online user IDs |
| `bbb:room:{roomId}:typing` | Hash | None | Typing user IDs → timestamps |
| `bbb:ratelimit:{userId}` | String | 1s | Rate limit flag (`SET ... EX 1 NX`) |

Message IDs in `msglist` may point to expired keys — filter nulls from `MGET` on read, prune stale IDs lazily.

---

## REST Endpoints

### Rooms — `server/routes/rooms.js` (all require `requireAuth`)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/rooms` | Create room `{ name, password? }` → room object |
| `GET` | `/api/rooms` | List my rooms |
| `GET` | `/api/rooms/:id` | Room details (members only) |
| `DELETE` | `/api/rooms/:id` | Delete room (owner only) |
| `POST` | `/api/rooms/:id/join` | Join by ID `{ password? }` |
| `POST` | `/api/rooms/join-by-code` | Join by invite `{ inviteCode, password? }` |
| `POST` | `/api/rooms/:id/leave` | Leave room (owner leaving deletes room) |

Validations: name 1-50 chars, room not full (16), user under 20 rooms, password match.

### Upload — `server/routes/upload.js` (requires `requireAuth`)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/upload` | Upload image → `{ url }` |

Multer, field name `"image"`, max 2MB, PNG/JPG/GIF/WebP only (check MIME + magic bytes). Store as `uploads/messages/{nanoid}.{ext}`.

---

## File Manifest

### Team 1: Socket Server

| File | Purpose |
|------|---------|
| `server/redis/messages.js` | `storeMessage`, `getMessage`, `deleteMessage`, `getRoomMessages`, `addReaction`, `removeReaction` |
| `server/socket/index.js` | Socket.io init, JWT cookie auth middleware, exports `initSocket(httpServer)` |
| `server/socket/handlers.js` | All event handlers (join, leave, send, delete, reactions, typing, disconnect) |
| `server/socket/rateLimiter.js` | `checkRateLimit(userId)` via Redis SET NX |

### Team 2: Socket Client + Chat UI

| File | Purpose |
|------|---------|
| `src/lib/socket.svelte.js` | Socket.io client singleton (follows `createAuth()` pattern) |
| `src/lib/chat/ChatFeed.svelte` | Scrollable message list |
| `src/lib/chat/MessageBubble.svelte` | Single message: header + content + reactions |
| `src/lib/chat/DrawingMessage.svelte` | Canvas replay component (receives ops, replays on inline canvas) |
| `src/lib/chat/TextMessage.svelte` | Text message display |
| `src/lib/chat/ImageMessage.svelte` | Image display |
| `src/lib/chat/ReactionBar.svelte` | Reaction display + add/remove |
| `src/lib/chat/MessageInput.svelte` | Compose area: Draw / Text / Image tabs, send button |
| `src/lib/chat/TypingIndicator.svelte` | "alice is typing..." |
| `src/lib/social/RoomList.svelte` | User's rooms list |
| `src/lib/social/CreateRoomModal.svelte` | Room creation form |
| `src/lib/social/JoinRoomModal.svelte` | Join by invite code + password |
| `src/routes/app/+page.svelte` | **Modify:** replace canvas demo with room list |
| `src/routes/app/room/[id]/+page.svelte` | Room chat view |
| `src/routes/app/room/[id]/+page.js` | Extract roomId from params |
| `src/routes/join/[code]/+page.svelte` | Invite link handler |
| `src/routes/join/[code]/+page.js` | Extract invite code from params |

### Team 3: Image Pipeline + Room REST

| File | Purpose |
|------|---------|
| `server/routes/rooms.js` | All room CRUD endpoints |
| `server/routes/upload.js` | Image upload endpoint with multer |
| `server/uploads/validate.js` | File type (magic bytes) + size validation |
| `server/uploads/cleanup.js` | Delete files in `uploads/messages/` older than 50h (runs on hourly interval) |

### Modified shared files (Layer 0, before teams)

| File | Change |
|------|--------|
| `server/index.js` | HTTP server wrap, Socket.io attach, static serving, new route mounts |
| `server/config.js` | Add REDIS_URL |
| `server/db/schema.sql` | Add rooms + room_members tables |
| `server/db/queries.js` | Add room query prepared statements |
| `vite.config.js` | Add socket.io + uploads proxy |
| `.env.example` | Add REDIS_URL |
| `package.json` | New dependencies |

---

## Team Dependencies

```
Layer 0 (foundation) ──┬── Team 1: Socket Server (no deps on other teams)
                       ├── Team 2: Socket Client (needs Team 3's room REST API)
                       └── Team 3: Image + Room REST (no deps on other teams)
```

**Team 2 depends on Team 3's room REST routes.** Resolution: Team 3 implements room routes first (simple CRUD, fast), then moves to image pipeline. Team 2 can start with socket client + chat UI components, integrate room list once Team 3 delivers.

No shared files between teams after Layer 0. Pure message-passing interfaces (socket events + REST).

---

## Socket Auth

Socket.io middleware reads JWT from the `token` cookie in the handshake headers. Reuses the same `jwt.verify` + `findUserById` logic as `requireAuth`. Sets `socket.user = { id, username }`.

```js
io.use((socket, next) => {
  const cookies = cookie.parse(socket.handshake.headers.cookie || '');
  const token = cookies.token;
  if (!token) return next(new Error('Not authenticated'));
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    const user = findUserById.get(payload.id);
    if (!user) return next(new Error('Not authenticated'));
    socket.user = { id: user.id, username: user.username };
    next();
  } catch { next(new Error('Not authenticated')); }
});
```

---

## Message Lifecycle

1. Client composes → emits `message:send`
2. Server: rate limit check → validate membership + content → generate ID (nanoid) → store in Redis (`SET bbb:msg:{id} ... EX 172800` + `RPUSH bbb:room:{roomId}:msglist {id}`) → broadcast `message:new` to room
3. On `room:join`: `LRANGE msglist` → `MGET` all IDs → filter nulls (expired) → emit `room:history`
4. On `message:delete`: verify ownership → `DEL` message key → `LREM` from list → if image, delete file → broadcast `message:deleted`
5. Redis TTL auto-expires messages at 48h. Stale list entries pruned lazily on join.

---

## Prerequisites

- **Install Redis** before starting Phase 3:
  - **Windows:** `winget install Redis.Redis` or download from https://github.com/tporadowski/redis/releases — then start with `redis-server`
  - **Linux:** `sudo apt install redis-server && sudo systemctl start redis`
  - **Docker alternative:** `docker run -d -p 6379:6379 redis:alpine`
  - Verify with: `redis-cli ping` → should return `PONG`
- `uploads/messages/` directory must exist (created on server startup)

---

## Execution Strategy

**Layer 0 → Team Split.** The new Claude session should:

1. **Layer 0 (single agent):** Install deps, create Redis client, add schema/queries, modify `server/index.js` and `vite.config.js`. Commit.
2. **Spawn 3-agent team:**
   - **"socket-server"** (`general-purpose`): owns `server/socket/` and `server/redis/messages.js`
   - **"socket-client"** (`general-purpose`): owns `src/lib/chat/`, `src/lib/social/`, `src/routes/app/room/`, `src/routes/join/`
   - **"image-pipeline"** (`general-purpose`): owns `server/routes/rooms.js`, `server/routes/upload.js`, `server/uploads/`
3. **Coordination:** Team 3 delivers room REST routes first → Team 2 integrates. All teams work to the event contract defined in this plan.
4. **Integration test:** After all teams complete, verify the full flow end-to-end.

---

## Verification Gate

1. Two browser windows, same room — User A draws and sends, User B sees it rendered
2. Text messages send and receive with correct username/timestamp
3. Images upload, display, and reject files over 2MB or wrong format
4. Message deletion works (own messages only, disappears for all)
5. Emoji reactions appear for all users in the room
6. Rate limiting blocks rapid-fire sends (1/sec)
7. Room full: 17th user gets "This room is full"
8. Message history loads on room join
9. Typing indicators show for other users
10. Disconnect triggers `room:user-left` for others
