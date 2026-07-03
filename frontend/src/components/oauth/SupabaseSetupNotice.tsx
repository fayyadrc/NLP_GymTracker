import { Link } from "react-router-dom";

export function SupabaseSetupNotice() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">OAuth not configured</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Supabase credentials are missing. OAuth login and consent pages need the anon key
          from your Supabase project.
        </p>
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm font-mono space-y-2">
          <p className="text-muted-foreground font-sans text-xs font-medium uppercase tracking-wide">
            frontend/.env
          </p>
          <p>VITE_SUPABASE_URL=https://&lt;project&gt;.supabase.co</p>
          <p>VITE_SUPABASE_ANON_KEY=&lt;anon-key&gt;</p>
        </div>
        <p className="text-sm text-muted-foreground">
          For local dev, you can also set <code className="text-xs">SUPABASE_URL</code> and{" "}
          <code className="text-xs">SUPABASE_ANON_KEY</code> in <code className="text-xs">backend/.env</code>{" "}
          — Vite will pick them up automatically.
        </p>
        <p className="text-center text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            Back to RepCount
          </Link>
        </p>
      </div>
    </div>
  );
}
