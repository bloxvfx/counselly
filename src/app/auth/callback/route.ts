import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const redirectUrl = new URL(next, requestUrl.origin);

  const supabase = await createClient();

  if (!supabase) {
    redirectUrl.pathname = "/auth";
    redirectUrl.search = "?error=Supabase%20is%20not%20configured.";
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      redirectUrl.pathname = "/auth";
      redirectUrl.search = `?error=${encodeURIComponent(error.message)}`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.redirect(redirectUrl);
}
