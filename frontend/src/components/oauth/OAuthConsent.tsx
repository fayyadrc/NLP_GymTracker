import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type AuthorizationDetails = {
  authorization_id?: string;
  redirect_url?: string;
  client?: { name?: string };
  redirect_uri?: string;
  scope?: string;
};

export function OAuthConsent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authorizationId = searchParams.get("authorization_id");

  const [authDetails, setAuthDetails] = useState<AuthorizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAuthorizationDetails() {
      if (!authorizationId) {
        setError("Missing authorization_id in the URL.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const redirect = encodeURIComponent(
          `/oauth/consent?authorization_id=${authorizationId}`,
        );
        navigate(`/oauth/login?redirect=${redirect}`);
        return;
      }

      const oauth = supabase.auth.oauth as {
        getAuthorizationDetails: (
          id: string,
        ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
      };

      const { data, error: detailsError } =
        await oauth.getAuthorizationDetails(authorizationId);

      if (detailsError) {
        setError(detailsError.message);
        setLoading(false);
        return;
      }

      if (data && "redirect_url" in data && !("authorization_id" in data)) {
        window.location.href = data.redirect_url!;
        return;
      }

      setAuthDetails(data);
      setLoading(false);
    }

    void loadAuthorizationDetails();
  }, [authorizationId, navigate]);

  async function handleDecision(decision: "approve" | "deny") {
    if (!authorizationId) {
      return;
    }

    setSubmitting(decision);
    setError(null);

    const oauth = supabase.auth.oauth as {
      approveAuthorization: (
        id: string,
      ) => Promise<{ data: { redirect_url: string } | null; error: { message: string } | null }>;
      denyAuthorization: (
        id: string,
      ) => Promise<{ data: { redirect_url: string } | null; error: { message: string } | null }>;
    };

    const action =
      decision === "approve"
        ? oauth.approveAuthorization(authorizationId)
        : oauth.denyAuthorization(authorizationId);

    const { data, error: actionError } = await action;

    if (actionError) {
      setError(actionError.message);
      setSubmitting(null);
      return;
    }

    if (data?.redirect_url) {
      window.location.href = data.redirect_url;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading authorization request...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm space-y-4 text-center">
          <h1 className="text-xl font-semibold">Authorization error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back to RepCount
          </Link>
        </div>
      </div>
    );
  }

  const scopes = authDetails?.scope?.split(" ").filter(Boolean) ?? [];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Authorize access
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {authDetails?.client?.name ?? "Claude"} wants access
          </h1>
          <p className="text-sm text-muted-foreground">
            This app is requesting permission to use your RepCount workout data through MCP.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 text-sm">
          <div>
            <p className="font-medium">Application</p>
            <p className="text-muted-foreground">{authDetails?.client?.name ?? "Unknown client"}</p>
          </div>
          {authDetails?.redirect_uri ? (
            <div>
              <p className="font-medium">Redirect URI</p>
              <p className="text-muted-foreground break-all">{authDetails.redirect_uri}</p>
            </div>
          ) : null}
          {scopes.length > 0 ? (
            <div>
              <p className="font-medium">Requested permissions</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {scopes.map((scope) => (
                  <li key={scope}>{scope}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            disabled={submitting !== null}
            onClick={() => void handleDecision("deny")}
          >
            {submitting === "deny" ? "Denying..." : "Deny"}
          </Button>
          <Button
            className="flex-1"
            disabled={submitting !== null}
            onClick={() => void handleDecision("approve")}
          >
            {submitting === "approve" ? "Approving..." : "Approve"}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          You can disconnect this connector later from Claude settings.
        </p>
      </div>
    </div>
  );
}
