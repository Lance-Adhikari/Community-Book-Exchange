import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/actions/auth";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard | Community Book Exchange" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  return (
    <>
      <SiteHeader title="Community Book Exchange" />
      <main className="dashboard-main">
        <section className="dashboard-card" aria-labelledby="dashboard-title">
          <div>
            <p className="dashboard-eyebrow">Dashboard</p>
            <h2 id="dashboard-title">
              Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}
            </h2>
            <p>
              Browse the community catalog or manage books linked to your account.
            </p>
            <div className="dashboard-actions">
              <Link className="primary-link-button" href="/my-books">My Books</Link>
              <Link className="secondary-link-button" href="/books/new">Add Book</Link>
            </div>
          </div>
          <form action={logout}>
            <button className="auth-submit auth-submit--compact" type="submit">
              Logout
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
