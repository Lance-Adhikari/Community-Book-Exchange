import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const SAFE_REDIRECTS = new Set(["/dashboard", "/update-password"]);

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedRedirect = requestUrl.searchParams.get("next");
  const redirectPath =
    requestedRedirect && SAFE_REDIRECTS.has(requestedRedirect)
      ? requestedRedirect
      : "/dashboard";

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?message=authentication-failed", requestUrl.origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/login?message=authentication-failed", requestUrl.origin),
    );
  }

  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
