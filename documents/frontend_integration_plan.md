
# Frontend Integration Plan - Monkeys Identity OIDC

## Overview
Status: **Backend OIDC Foundation Complete** (Phase 4).
Goal: Implement the **User Interface** for the OIDC Authorization flows, specifically the **Consent Screen** and **Login Redirection** logic.

The current system uses a decoupled architecture:
-   **Backend**: Go (Fiber) at `http://localhost:8080` (or `8085` in Docker).
-   **Frontend**: React (Vite) at `http://localhost:5173`.

## 1. The Authorization Flow (Hybrid)

We need to bridge the browser-based OIDC flow with our SPA frontend.

### Step 1: User hits Backend Authorize Endpoint
*   **URL**: `GET http://localhost:8080/oauth2/authorize?client_id=...&response_type=code&scope=...`
*   **Current Behavior**: Checks auth. If not logged in, returns 401. If logged in & consent needed, returns JSON.
*   **Required Change (Backend)**:
    1.  **Not Authenticated**: Redirect to Frontend Login.
        -   `302 Found` -> `http://localhost:5173/login?return_to=<url_encoded_original_request>`
    2.  **Consent Required**: Redirect to Frontend Consent Page.
        -   `302 Found` -> `http://localhost:5173/consent?client_id=...&scope=...&state=...`
        -   *Security Note*: Ideally, pass a short-lived `request_token` (JWT) to the frontend instead of raw params to prevent tampering, or re-validate params on the frontend call. For MVP, passing params is acceptable if validated again on submission.

### Step 2: Frontend Consent Screen (`/consent`)
*   **Location**: `ui/src/pages/Consent.tsx` (New Page).
*   **Behavior**:
    1.  Parse query parameters (`client_id`, `scope`).
    2.  fetch **Client Details** (`client_name`, `logo_url`) to display to the user.
        -   *New Backend Endpoint Needed*: `GET /api/v1/oauth2/clients/:client_id/public` (Publicly accessible or requiring user auth).
    3.  Render UI:
        -   "**[Client Name]** wants to access your account."
        -   List of requested scopes (e.g., "Read your profile", "View email").
        -   [Allow] / [Deny] buttons.
    4.  **Submission**:
        -   **Allow**: `POST /api/v1/oauth2/authorize/decision` (New Endpoint) OR reuse `Authorize` with a `consent_confirmed=true` flag.
        -   *Recommendation*: Create a dedicated `POST /oauth2/consent` endpoint.
        -   **Payload**: `{ "client_id": "...", "scope": "...", "decision": "allow" }`
        -   **Response**: `{ "redirect_to": "https://client-app.com/callback?code=..." }`
    5.  Frontend performs the final redirect to the client.

## 2. Implementation Tasks

### Backend (Go)
1.  **Modify `Authorize` Handler** (`internal/handlers/oidc_handler.go`):
    -   Replace JSON responses with `c.Redirect(...)`.
    -   Use `config.FrontendURL` (need to add to `config.go`, default `http://localhost:5173`).
2.  **Add `GetPublicClientInfo` Handler**:
    -   Route: `GET /oauth2/client-info?client_id=...`
    -   Returns: `{ "client_id": "...", "client_name": "...", "logo_url": "...", "policy_uri": "..." }`
    -   Security: Ensure `client_id` exists.

### Frontend (React)
1.  **Add Route**: `ui/src/App.tsx` (or router config).
    -   Path: `/consent`
    -   Component: `<ConsentPage />`
2.  **Create `ConsentPage` Component**:
    -   Use `useSearchParams` to get params.
    -   Call `GetPublicClientInfo`.
    -   Design the card using existing UI components (`@the-monkeys/ui` or similar).
3.  **Update `LoginPage`**:
    -   Handle `return_to` parameter. After successful login, check if `return_to` is present and absolute/relative safest validation. If valid, window.location.href = `return_to`.

## 3. Verification Steps
1.  **Mock Client**: Use a tool like [OIDC Debugger](https://oidcdebugger.com/) or create a simple `test-client.html`.
    -   Configure Client ID in DB: `INSERT INTO oauth_clients ...`
    -   Set Redirect URI to `https://oidcdebugger.com/debug`.
2.  **Start Flow**:
    -   Click "Authorize" on OIDC Debugger.
    -   Should be redirected to `Monkeys Identity Login`.
    -   Login.
    -   Should be redirected to `Monkeys Identity Consent`.
    -   Click "Allow".
    -   Should be redirected back to `OIDC Debugger` with a code.
    -   OIDC Debugger exchanges code for token.
    -   **Success!**
