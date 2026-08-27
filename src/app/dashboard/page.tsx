import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/actions/auth";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard | Community Book Exchange" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login?next=%2Fdashboard");
  }

  const [profileResult, booksResult, outgoingResult, incomingResult, loansResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase.from("books").select("id", { count: "exact", head: true }).eq("owner_id", userId),
    supabase.from("borrow_requests").select("id", { count: "exact", head: true }).eq("requester_id", userId).eq("status", "pending"),
    supabase.from("borrow_requests").select("id", { count: "exact", head: true }).eq("owner_id", userId).eq("status", "pending"),
    supabase.from("loans").select("id", { count: "exact", head: true }).or(`owner_id.eq.${userId},borrower_id.eq.${userId}`).in("status", ["active", "overdue"]),
  ]);

  return (
    <>
      <SiteHeader title="Community Book Exchange" />
      <main className="dashboard-main dashboard-main--wide">
        <section className="dashboard-overview" aria-labelledby="dashboard-title">
          <div className="dashboard-overview__heading">
            <div>
              <p className="dashboard-eyebrow">Dashboard</p>
              <h2 id="dashboard-title">Welcome{profileResult.data?.display_name ? `, ${profileResult.data.display_name}` : ""}</h2>
              <p>Manage your books, requests, and active community loans.</p>
            </div>
            <form action={logout}><button className="auth-submit auth-submit--compact" type="submit">Logout</button></form>
          </div>

          <div className="dashboard-grid">
            <Link className="dashboard-tile" href="/books"><strong>Browse Books</strong><span>Explore the public catalog</span></Link>
            <Link className="dashboard-tile" href="/books/new"><strong>Add Book</strong><span>Share another book</span></Link>
            <Link className="dashboard-tile" href="/my-books"><strong>My Books</strong><span>{booksResult.count ?? 0} owned · {incomingResult.count ?? 0} incoming</span></Link>
            <Link className="dashboard-tile" href="/my-requests"><strong>My Requests &amp; Loans</strong><span>{outgoingResult.count ?? 0} pending · {loansResult.count ?? 0} active loans</span></Link>
          </div>
        </section>
      </main>
    </>
  );
}
