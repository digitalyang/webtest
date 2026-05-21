# Portfolio Login Upload Flow Design

## Goal

Change the portfolio admin entry flow so the site owner must log in first, then is redirected to a dedicated upload/admin page.

The new flow should remove the hidden token field from the UI and keep password-based admin sessions as the protection for all portfolio admin APIs.

## Current Context

The current admin page lives at `/admin/portfolio` and renders `PortfolioAdmin` directly. That single client component contains:

- Token and password login.
- Portfolio snapshot loading.
- Work and role creation.
- Cloudinary image upload.
- Cover selection.
- Hide and restore controls.
- Snapshot lists for works, roles, and images.

Admin mutation APIs already require a valid `portfolio_admin` HttpOnly session cookie through the shared admin auth helpers. The current session creation API also checks `ADMIN_TOKEN`; this design removes that token requirement.

## Approved Direction

Use a split route flow:

```text
/admin/portfolio
  password login only
  |
  | successful login
  v
/admin/portfolio/upload
  full portfolio admin management screen
```

If an unauthenticated or expired-session user visits `/admin/portfolio/upload`, the page redirects back to `/admin/portfolio`.

The upload/admin page still relies on server-side session checks in every admin API. Frontend redirects are only for user experience, not authorization.

## Routes

### `/admin/portfolio`

This route becomes the login entry page.

It should show:

- Page heading for portfolio administration.
- Password input.
- Login button.
- Login error message when authentication fails.

It should not show:

- Hidden token input.
- Work, role, upload, cover, hide, or snapshot management controls.

On successful login, it creates the existing admin session cookie and redirects to:

```text
/admin/portfolio/upload
```

### `/admin/portfolio/upload`

This route becomes the authenticated portfolio management page.

It should show the full existing management functionality:

- Status messages.
- Login/session state.
- Logout button.
- Work creation.
- Role creation.
- Image upload.
- Cover setting.
- Hide and restore controls.
- Full work, role, and image snapshot cards.

When the page loads, it should request a session-protected admin endpoint that also provides the portfolio snapshot. If the endpoint responds with `401`, the page redirects to `/admin/portfolio`.

## Authentication

The session API should accept password-only login:

```json
{
  "password": "admin-password"
}
```

`ADMIN_TOKEN` should no longer be required for login verification.

Required server environment variable:

```text
ADMIN_PASSWORD_HASH
```

Existing Cloudinary and D1-related configuration remains unchanged.

The existing `portfolio_admin` HttpOnly cookie behavior should remain:

- `HttpOnly`
- `Secure`
- `SameSite=Lax`
- Short-lived max age
- `Cache-Control: no-store` on login and logout responses

## User Flow

### Successful Login

1. User opens `/admin/portfolio`.
2. User enters the admin password.
3. Browser posts the password to `/api/admin/session`.
4. Server validates the password hash and sets the `portfolio_admin` cookie.
5. Browser redirects to `/admin/portfolio/upload`.
6. Upload page loads the protected portfolio snapshot.
7. Full portfolio admin controls become available.

### Failed Login

1. User opens `/admin/portfolio`.
2. User enters an invalid password.
3. Server responds with a generic authentication failure.
4. Login page stays visible and shows the error.

The error should not reveal whether configuration is missing or the password is wrong.

### Expired or Missing Session

1. User opens `/admin/portfolio/upload`.
2. Upload page requests the protected admin snapshot.
3. Server responds with `401`.
4. Browser redirects to `/admin/portfolio`.

### Logout

1. User clicks logout on `/admin/portfolio/upload`.
2. Browser calls `DELETE /api/admin/session`.
3. Server clears the `portfolio_admin` cookie.
4. Browser redirects to `/admin/portfolio`.

## Component Design

Split the current single admin component into smaller units with clear responsibilities.

### Login Component

Responsibility:

- Hold the password input state.
- Submit the login request.
- Show pending and error states.
- Redirect after success.

Dependencies:

- `POST /api/admin/session`
- Next.js client navigation

### Portfolio Admin Component

Responsibility:

- Load the protected portfolio snapshot.
- Redirect to login when unauthorized.
- Render the full management UI.
- Perform work, role, upload, cover, hide, restore, and logout actions.

Dependencies:

- `GET /api/admin/portfolio`
- Existing portfolio admin mutation APIs
- `DELETE /api/admin/session`
- Next.js client navigation

The existing upload naming, Cloudinary upload, D1 metadata saving, cover URL generation, and public portfolio rendering behavior remain unchanged.

## Error Handling

Login errors should be shown on the login page.

Upload/admin page errors should keep the current status/error display pattern. Unauthorized snapshot or mutation responses should send the user back to the login page when appropriate.

Cloudinary upload errors, validation errors, and D1/API errors should keep their current user-facing messages unless they depend on the removed token behavior.

## Security

This change removes the hidden token entrance guard and relies on the admin password plus HttpOnly session cookie.

Every portfolio admin API must continue to validate the session server-side. The upload page redirect must not be treated as an authorization boundary.

The password hash stays server-only. No raw password, password hash, or Cloudinary secret is exposed to the browser.

## Testing

Update or add tests for:

- `/admin/portfolio` renders a password-only login page.
- `/admin/portfolio` no longer renders the token input or full admin controls.
- `/admin/portfolio/upload` renders the full portfolio admin controls.
- Session login succeeds with `{ password }` and a matching `ADMIN_PASSWORD_HASH`.
- Session login no longer requires `ADMIN_TOKEN`.
- Failed login responses remain `no-store` and generic.
- Logout still clears the session cookie with `no-store`.
- Protected portfolio admin APIs still reject unauthenticated requests.

Existing tests around Cloudinary upload plans, metadata validation, and portfolio merging should continue to pass without behavior changes.

## Out of Scope

- Changing Cloudinary upload naming.
- Changing D1 schema.
- Changing public portfolio pages.
- Migrating old local portfolio images.
- Adding role-based permissions.
- Adding token-based or multi-factor login.
