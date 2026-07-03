# Claude MCP + OAuth setup

## Backend / Render env

```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<service-role-or-existing-backend-key>
SUPABASE_ANON_KEY=<supabase-anon-key>
PUBLIC_APP_URL=https://<your-render-app>.onrender.com
```

## Frontend env (Vite)

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## Supabase dashboard

1. **Authentication → URL Configuration**
   - Site URL: `https://<your-render-app>.onrender.com`

2. **Authentication → OAuth Server**
   - Enable OAuth 2.1 server
   - **Authorization Path:** `/oauth/consent` (must be exact — not `/` or blank)

   If Authorization Path is wrong, Supabase redirects to your landing page instead of the consent screen.

3. **Authentication → OAuth Server → Clients**
   - Create a client for Claude
   - Redirect URI (exact): `https://claude.ai/api/mcp/auth_callback`

4. **Authentication → Users**
   - Create/sign in the account that will approve Claude access

## Add connector in Claude

1. Open [Customize → Connectors](https://claude.ai/customize/connectors)
2. Add custom connector
3. MCP URL: `https://<your-render-app>.onrender.com/mcp`

   Do **not** use `/mcp/mcp` — the server is mounted at `/mcp` only.
4. Advanced settings:
   - OAuth Client ID: from Supabase OAuth client
   - OAuth Client Secret: from Supabase OAuth client (if required)
5. Connect and complete the consent flow at `/oauth/consent`

## Local frontend routes

- `/oauth/login` — sign in before approving access
- `/oauth/consent` — approve/deny Claude access

## Notes

- Claude reaches your MCP server from Anthropic's cloud, so the Render URL must be public.
- MCP requests without a valid Supabase bearer token return `401` with OAuth discovery metadata.
- Authenticated MCP reads/writes are scoped to the approving user's `user_id` when present in `gym_logs`.
