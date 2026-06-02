const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");

export function getSiteOrigin() {
  if (typeof window !== "undefined") {
    return configuredSiteUrl || window.location.origin;
  }
  return configuredSiteUrl || "";
}

/** Counselly auth emails branch on `app=counselly` in RedirectTo (shared Supabase with Lerno). */
export function getAuthCallbackUrl(next?: string) {
  const origin = getSiteOrigin();
  const url = new URL("/auth/callback", origin || "http://localhost:3000");
  if (next) url.searchParams.set("next", next);
  url.searchParams.set("app", "counselly");
  return url.toString();
}

export function isEmailSendRateLimit(error: { code?: string; message?: string }) {
  return (
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit" ||
    /rate limit/i.test(error.message ?? "")
  );
}
