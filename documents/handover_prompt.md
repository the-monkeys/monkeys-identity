
# Handover Prompt: OIDC Frontend Integration

You are an expert Full-Stack Developer picking up an ongoing project: **Monkeys Identity OIDC Implementation**.

## Context
We have successfully implemented the **Backend Foundation** for OIDC Federation (Phase 4).
-   **Service**: `internal/services/oidc_service.go` (Client validation, Token minting, JWKS).
-   **Handlers**: `internal/handlers/oidc_handler.go` (Endpoints implemented).
-   **Infrastructure**: The app runs via `docker compose up`.
-   **Verification**: We have verified `/.well-known/openid-configuration` and `/.well-known/jwks.json` are verifiable via `curl`.

## Current Goal
Your task is to implement the **Frontend Integration** to make the Authorization Code flow actually work for users in the browser.

## Resources
I have prepared a detailed plan for you:
-   **Plan**: `documents/frontend_integration_plan.md` (Note: Check artifacts directory if not in repo).

## Your Tasks
1.  **Read the Plan**: Review `frontend_integration_plan.md` carefully.
2.  **Backend Adjustments**:
    -   Modify `OIDCHandler.Authorize` to `Redirect` to the frontend instead of returning JSON.
    -   Implement a new endpoint to fetch public client info for the consent screen.
3.  **Frontend Implementation**:
    -   Create the `ConsentPage` in the React UI (`ui/src`).
    -   Handle the `return_to` logic in `LoginPage`.
4.  **Verification**:
    -   Use [OIDC Debugger](https://oidcdebugger.com/) to test the full flow:
        -   Authorize -> Login -> Consent -> Exchange Code -> Get Token.

## Important Notes
-   The backend runs on port `8085` (Docker) or `8080` (Local).
-   The frontend runs on port `5173`.
-   Database schemas (`oauth_clients`, etc.) are already migrated.
