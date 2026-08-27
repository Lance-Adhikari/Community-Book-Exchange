import Link from "next/link";

import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <>
      <SiteHeader title="Community Book Exchange" />

      <main>
        <section className="motto" aria-label="Community Book Exchange introduction">
          <p>Give books, Get books, and Grow with books (3G)</p>
          <p>Add Books, Search for Books</p>
          <p>Community Book Exchange is a place where people get to exchange books with others.</p>
          <p>Come and join us!</p>
        </section>

        <div className="homepage-registration">
          <Link className="regbutton" href="/register">
            Get Started
          </Link>
        </div>

        <div className="commvideo">
          {/* A verified caption or transcript is required before production. */}
          <video controls preload="metadata" playsInline aria-label="Community Book Exchange introduction video">
            <source src="/Images/combookexchange.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        <section className="updates_and_fixes" aria-label="Updates and fixes">
          <p>Updates &amp; Fixes</p>
        </section>

        <section className="media_platform" aria-label="Social media platforms">
          <p>Social Media Platforms</p>
        </section>
      </main>
    </>
  );
}
