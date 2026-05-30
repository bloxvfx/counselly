import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

const PROTECTED = ["/dashboard", "/onboarding"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isStatic =
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname === "/favicon.ico" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/.test(pathname);

  if (isStatic || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const env = getSupabaseEnv();
  const response = NextResponse.next({ request });

  if (!env) {
    if (isProtected) {
      const loginUrl = new URL("/auth", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh session on every request so rotating tokens never cause redirect loops
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (isProtected && !session) {
    const loginUrl = new URL("/auth", request.url);
    loginUrl.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value));
    return redirect;
  }

  // Redirect logged-in users away from auth pages and the landing page
  const AUTH_ROUTES = ["/auth", "/login", "/signup"];
  const isAuthRoute =
    (AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/")) || pathname === "/") &&
    !pathname.startsWith("/auth/callback") &&
    !pathname.startsWith("/auth/signout");

  const isResetMode = pathname === "/auth" && request.nextUrl.searchParams.get("mode") === "reset";

  if (session && isAuthRoute && !isResetMode) {
    const dashboardUrl = new URL("/dashboard", request.url);
    const redirect = NextResponse.redirect(dashboardUrl);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
