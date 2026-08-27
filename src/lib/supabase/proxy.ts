import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnvironment } from "@/lib/env";
import type { Database } from "@/types/database.types";

const AUTH_ENTRY_PATHS = new Set(["/login", "/register"]);

function isProtectedPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/my-books" ||
    pathname.startsWith("/my-books/") ||
    pathname === "/my-requests" ||
    pathname.startsWith("/my-requests/") ||
    pathname === "/books/new" ||
    /^\/books\/[1-9]\d*\/edit$/.test(pathname)
  );
}

function redirectWithSessionCookies(url: URL, sessionResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);

  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  for (const headerName of ["cache-control", "expires", "pragma"]) {
    const headerValue = sessionResponse.headers.get(headerName);

    if (headerValue) {
      redirectResponse.headers.set(headerName, headerValue);
    }
  }

  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const environment = getPublicEnvironment();

  const supabase = createServerClient<Database>(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });

          Object.entries(headers).forEach(([name, value]) => {
            supabaseResponse.headers.set(name, value);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();
  const hasVerifiedClaims = !error && Boolean(data?.claims?.sub);
  const pathname = request.nextUrl.pathname;

  if (!hasVerifiedClaims && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname);
    return redirectWithSessionCookies(loginUrl, supabaseResponse);
  }

  if (hasVerifiedClaims && AUTH_ENTRY_PATHS.has(pathname)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return redirectWithSessionCookies(dashboardUrl, supabaseResponse);
  }

  return supabaseResponse;
}
