---
name: deleteUserAllData transaction requirement
description: Why deleteUserAllData must use db.transaction() and what data it cannot clean up.
---

## Rule
`deleteUserAllData(userId)` in `server/storage.ts` must be wrapped in `db.transaction(async (tx) => { ... })` with every `db.delete(...)` changed to `tx.delete(...)`.

**Why:** Without a transaction, the 18 sequential deletes can fail partway through (network blip, constraint violation). The user record would remain in the `users` table but with some or all of their financial/learning data already gone — a permanently inconsistent state with no automatic recovery.

**How to apply:** Any new table added to the deletion sequence must also use `tx.delete(...)` inside the same transaction block, not a separate `db.delete(...)` after the `await db.transaction(...)` call.

## Known gap: conversations are NOT deleted
The `conversations` and `messages` tables (defined in `shared/models/chat.ts`) have no `userId` column. They cannot be cleaned up by `deleteUserAllData`. AI chat history is effectively orphaned after a user is purged.

Fixing this requires:
1. `ALTER TABLE conversations ADD COLUMN user_id varchar REFERENCES users(id)` 
2. Update `createConversation` in storage.ts to store the userId
3. Add `tx.delete(messages).where(inArray(messages.conversationId, subquery))` + `tx.delete(conversations).where(eq(conversations.userId, userId))`

This is a GDPR/privacy gap — not a silent failure in the current write path.
