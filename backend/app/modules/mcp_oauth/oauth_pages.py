from __future__ import annotations

from html import escape

from .config import settings


def _require_oauth_config() -> tuple[str, str]:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY are required for OAuth pages")
    return settings.supabase_url, settings.supabase_anon_key


def render_oauth_login_page(*, redirect: str = "/oauth/consent") -> str:
    supabase_url, supabase_anon_key = _require_oauth_config()
    safe_redirect = escape(redirect, quote=True)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RepCount — Sign in</title>
  <style>
    body {{ font-family: system-ui, sans-serif; background: #f4f4f5; margin: 0; min-height: 100vh; display: grid; place-items: center; }}
    .card {{ background: white; border-radius: 16px; padding: 32px; width: min(420px, 92vw); box-shadow: 0 8px 30px rgba(0,0,0,.08); }}
    h1 {{ margin: 0 0 8px; font-size: 1.5rem; }}
    p {{ color: #666; margin-top: 0; }}
    label {{ display: block; margin: 16px 0 6px; font-size: .9rem; font-weight: 600; }}
    input {{ width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; }}
    button {{ margin-top: 20px; width: 100%; padding: 12px; border: 0; border-radius: 8px; background: #111; color: white; font-weight: 600; }}
    .error {{ color: #dc2626; font-size: .9rem; margin-top: 12px; }}
  </style>
</head>
<body>
  <div class="card">
    <h1>Sign in to RepCount</h1>
    <p>Approve Claude&apos;s access to your workout data.</p>
    <form id="login-form">
      <label for="email">Email</label>
      <input id="email" type="email" autocomplete="email" required />
      <label for="password">Password</label>
      <input id="password" type="password" autocomplete="current-password" required />
      <button type="submit">Sign in</button>
      <div id="error" class="error"></div>
    </form>
  </div>
  <script type="module">
    import {{ createClient }} from "https://esm.sh/@supabase/supabase-js@2.49.1";
    const supabase = createClient({escape(supabase_url, quote=True)}, {escape(supabase_anon_key, quote=True)});
    const redirect = {safe_redirect!r};
    document.getElementById("login-form").addEventListener("submit", async (event) => {{
      event.preventDefault();
      const errorEl = document.getElementById("error");
      errorEl.textContent = "";
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const {{ error }} = await supabase.auth.signInWithPassword({{ email, password }});
      if (error) {{
        errorEl.textContent = error.message;
        return;
      }}
      window.location.href = redirect;
    }});
  </script>
</body>
</html>"""


def render_oauth_consent_page() -> str:
    supabase_url, supabase_anon_key = _require_oauth_config()
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RepCount — Authorize access</title>
  <style>
    body {{ font-family: system-ui, sans-serif; background: #f4f4f5; margin: 0; min-height: 100vh; display: grid; place-items: center; }}
    .card {{ background: white; border-radius: 16px; padding: 32px; width: min(480px, 92vw); box-shadow: 0 8px 30px rgba(0,0,0,.08); }}
    h1 {{ margin: 0 0 8px; font-size: 1.5rem; }}
    p {{ color: #666; }}
    .meta {{ background: #fafafa; border: 1px solid #eee; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: .95rem; }}
    .actions {{ display: flex; gap: 12px; }}
    button {{ flex: 1; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; }}
  #approve {{ background: #111; color: white; border: 0; }}
  #deny {{ background: white; border: 1px solid #ddd; }}
    .error {{ color: #dc2626; }}
  </style>
</head>
<body>
  <div class="card">
    <h1 id="title">Authorize access</h1>
    <p id="subtitle">Loading authorization request...</p>
    <div id="meta" class="meta" hidden></div>
    <div class="actions" id="actions" hidden>
      <button id="deny" type="button">Deny</button>
      <button id="approve" type="button">Approve</button>
    </div>
    <p id="error" class="error"></p>
  </div>
  <script type="module">
    import {{ createClient }} from "https://esm.sh/@supabase/supabase-js@2.49.1";
    const supabase = createClient({escape(supabase_url, quote=True)}, {escape(supabase_anon_key, quote=True)});
    const params = new URLSearchParams(window.location.search);
    const authorizationId = params.get("authorization_id");
    const errorEl = document.getElementById("error");
    const metaEl = document.getElementById("meta");
    const actionsEl = document.getElementById("actions");

    if (!authorizationId) {{
      errorEl.textContent = "Missing authorization_id in the URL.";
      document.getElementById("subtitle").textContent = "";
    }} else {{
      const {{ data: {{ user }} }} = await supabase.auth.getUser();
      if (!user) {{
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/oauth/login?redirect=${{redirect}}`;
      }} else {{
        const {{ data, error }} = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
        if (error) {{
          errorEl.textContent = error.message;
          document.getElementById("subtitle").textContent = "";
        }} else if (data.redirect_url && !("authorization_id" in data)) {{
          window.location.href = data.redirect_url;
        }} else {{
          document.getElementById("title").textContent = `${{data.client?.name || "Claude"}} wants access`;
          document.getElementById("subtitle").textContent = "Allow this app to use your RepCount workout data through MCP.";
          const scopes = (data.scope || "").split(" ").filter(Boolean);
          metaEl.innerHTML = `
            <div><strong>Application</strong><br>${{data.client?.name || "Unknown client"}}</div>
            <div style="margin-top:12px"><strong>Redirect URI</strong><br>${{data.redirect_uri || ""}}</div>
            ${{scopes.length ? `<div style="margin-top:12px"><strong>Permissions</strong><ul>${{scopes.map((s) => `<li>${{s}}</li>`).join("")}}</ul></div>` : ""}}
          `;
          metaEl.hidden = false;
          actionsEl.hidden = false;
          document.getElementById("approve").onclick = async () => {{
            const result = await supabase.auth.oauth.approveAuthorization(authorizationId);
            if (result.error) {{ errorEl.textContent = result.error.message; return; }}
            window.location.href = result.data.redirect_url;
          }};
          document.getElementById("deny").onclick = async () => {{
            const result = await supabase.auth.oauth.denyAuthorization(authorizationId);
            if (result.error) {{ errorEl.textContent = result.error.message; return; }}
            window.location.href = result.data.redirect_url;
          }};
        }}
      }}
    }}
  </script>
</body>
</html>"""
