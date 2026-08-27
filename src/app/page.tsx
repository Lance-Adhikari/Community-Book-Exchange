import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && Boolean(data?.claims?.sub);
  const invitation = isAuthenticated
    ? { message: "Ready to find your next book?", label: "Browse Books", href: "/books" }
    : { message: "Come and join us!", label: "Get Started", href: "/register" };

  return (
    <>
      <SiteHeader title="Community Book Exchange" isAuthenticated={isAuthenticated} />

      <main>
        <section className="motto" aria-label="Community Book Exchange introduction">
          <p>Give books, Get books, and Grow with books (3G)</p>
          <p>Add Books, Search for Books</p>
          <p>Community Book Exchange is a place where people get to exchange books with others.</p>
          <p>{invitation.message}</p>
        </section>

        <div className="homepage-registration">
          <Link className="regbutton" href={invitation.href}>
            {invitation.label}
          </Link>
        </div>

        <div className="commvideo">
          {/* A verified caption or transcript is required before production. */}
          <video controls preload="metadata" playsInline aria-label="Community Book Exchange introduction video">
            <source src="/Images/combookexchange.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </main>
    </>
  );
}
