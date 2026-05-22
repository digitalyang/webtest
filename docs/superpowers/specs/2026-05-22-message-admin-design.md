# Message Admin Design

## Goal

Add an administrator page for the guestbook so the site owner can search messages and permanently delete unwanted entries.

The first version should:

- Reuse the existing portfolio administrator login and session cookie.
- Keep the public message board API focused on public read/write behavior.
- Add a separate administrator API for message search, pagination, and deletion.
- Permanently delete selected messages from D1.

## Current Context

The public guestbook is implemented with:

- `app/messages/page.jsx`
- `components/MessagesBoard.jsx`
- `app/api/messages/route.js`
- `lib/server/messages.js`
- D1 table `messages`

The existing administrator authentication is implemented with:

- `components/admin/PortfolioAdminLogin.jsx`
- `app/api/admin/session/route.js`
- `lib/server/admin-auth.js`

The new message administrator page should follow that existing authentication pattern instead of introducing a second login system.
The current login component redirects to the portfolio upload page after success, so it should be updated to accept a configurable post-login destination before it is reused by the message administrator page.

## Approved Direction

Use a separate administrator surface:

```text
/admin/messages
/api/admin/messages
/api/admin/messages/:messageId
```

The administrator API must call `requireAdminSession()` before reading or deleting messages.

The public `/api/messages` endpoint remains unchanged for visitors. It continues to support public reads and submissions only.

## Administrator Page

Add `/admin/messages` as the message management page.

When the administrator is not logged in, the page should present the existing administrator login component with a message-admin redirect target. After successful login, the user can access the message management UI.

The management UI should include:

- A search input for nickname or message content.
- A list of messages with nickname, created time, and content preview.
- A permanent delete button for each message.
- Pagination status and previous/next controls.
- Clear feedback for loading, empty results, delete success, and errors.

Search should preserve the current query while paging and after deleting a message.

No D1 migration is required because this version only reads from and deletes rows in the existing `messages` table.

## Administrator API

### List Messages

`GET /api/admin/messages?page=1&pageSize=10&q=keyword`

Behavior:

- Require a valid administrator session.
- Clamp `page` to at least `1`.
- Clamp `pageSize` to a small supported range, with `10` as the default.
- If `q` is empty, return messages ordered by newest first.
- If `q` is present, match both `name` and `content` with `LIKE`.
- Return `messages`, `total`, `page`, and `pageSize`.

Response shape:

```json
{
  "messages": [
    {
      "id": 1,
      "name": "摄影师小羊",
      "content": "网站越来越完整了。",
      "time": "2026-05-22 10:08:12"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

### Delete Message

`DELETE /api/admin/messages/:messageId`

Behavior:

- Require a valid administrator session.
- Validate `messageId` as a numeric id.
- Delete from `messages` with `DELETE FROM messages WHERE id = ?`.
- Return a clear `404` response if the message does not exist or was already deleted.
- Return `{ "ok": true }` on success.

Deletion is permanent. No soft-delete column or recovery flow is included in this version.

## Client Data Flow

The client component loads page data from `GET /api/admin/messages`.

When the administrator searches:

1. Trim the query.
2. Reset to page `1`.
3. Fetch matching messages.

When the administrator deletes a message:

1. Show a confirmation dialog explaining that deletion is permanent.
2. Send `DELETE /api/admin/messages/:messageId`.
3. Refresh the current query and page.
4. If the current page becomes empty and it is not the first page, move back one page and reload.

The public `/messages` page does not need special refresh logic. Deleted messages disappear naturally the next time the public list is fetched.

## Error Handling

Administrator API errors should return JSON with an `error` field and `Cache-Control: no-store`.

Expected messages:

- Unauthenticated: `管理员登录已过期，请重新登录。`
- Invalid message id: `留言 ID 无效。`
- Missing deleted message: `留言不存在或已被删除。`
- Generic list/delete failure: `留言管理请求失败，请稍后重试。`

The client should display these errors in the administrator panel and keep the current search state when possible.

## Testing

Add focused tests for the administrator API helper:

- Rejects list requests without a valid administrator session.
- Returns paginated messages ordered newest first.
- Filters messages by nickname or content.
- Deletes an existing message.
- Returns `404` for a missing message.

Add focused component/page tests where practical:

- Renders search input and pagination status.
- Submits search and displays returned messages.
- Confirms before permanent deletion.
- Shows an expired-login error state.

## Out Of Scope

This version does not include:

- Soft deletion or restore.
- Bulk deletion.
- Moderation queues.
- Editing message content.
- A full unified `/admin` dashboard redesign.
