import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && Boolean(data?.claims?.sub);
  const homepageAction = isAuthenticated
    ? { heroLabel: "Browse Books", finalLabel: "Browse Books", href: "/books" }
    : {
        heroLabel: "Get Started",
        finalLabel: "Join Community Book Exchange",
        href: "/register",
      };

  return (
    <>
      <SiteHeader title="Community Book Exchange" isAuthenticated={isAuthenticated} />

      <main className="home-page">
        <section className="home-hero" aria-labelledby="home-hero-title">
          <div className="home-container home-hero__layout">
            <div className="home-hero__content">
              <p className="home-eyebrow">Community Book Exchange</p>
              <h2 id="home-hero-title">Give books, Get books, and Grow with books.</h2>
              <p className="home-hero__three-g" aria-label="Give, Get, Grow">
                Give <span aria-hidden="true">•</span> Get <span aria-hidden="true">•</span> Grow
              </p>
              <p className="home-hero__description">
                Community Book Exchange is a place where people get to exchange books with others.
              </p>

              <div className="home-hero__actions">
                <Link className="regbutton" href={homepageAction.href}>
                  {homepageAction.heroLabel}
                </Link>
                <a className="home-secondary-link" href="#how-it-works">
                  Learn How It Works
                </a>
              </div>
            </div>

            <div className="home-video-card">
              <p className="home-video-card__label">See Community Book Exchange in action</p>
              <div className="commvideo">
                {/* A verified caption or transcript is required before production. */}
                <video
                  controls
                  preload="metadata"
                  playsInline
                  aria-label="Community Book Exchange introduction video"
                >
                  <source src="/Images/combookexchange.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </section>

        <section className="home-section home-features" aria-labelledby="home-features-title">
          <div className="home-container">
            <div className="home-section__heading">
              <p className="home-eyebrow">The 3G community</p>
              <h2 id="home-features-title">How Community Book Exchange helps</h2>
            </div>

            <div className="home-feature-grid">
              <article className="home-feature-card">
                <span className="home-feature-card__mark" aria-hidden="true">G</span>
                <h3>Give</h3>
                <p>Share books you no longer need with others in your community.</p>
              </article>
              <article className="home-feature-card">
                <span className="home-feature-card__mark" aria-hidden="true">G</span>
                <h3>Get</h3>
                <p>Discover books shared by other members and request the ones you want to read.</p>
              </article>
              <article className="home-feature-card">
                <span className="home-feature-card__mark" aria-hidden="true">G</span>
                <h3>Grow</h3>
                <p>Read more, learn more, and help books reach new readers.</p>
              </article>
            </div>
          </div>
        </section>

        <section
          className="home-section home-how-it-works"
          id="how-it-works"
          aria-labelledby="home-how-it-works-title"
        >
          <div className="home-container">
            <div className="home-section__heading">
              <p className="home-eyebrow">Simple book sharing</p>
              <h2 id="home-how-it-works-title">How It Works</h2>
            </div>

            <ol className="home-steps">
              <li className="home-step">
                <span className="home-step__number" aria-hidden="true">1</span>
                <div>
                  <h3>Add or Browse</h3>
                  <p>Share a book of your own or browse books available in the community.</p>
                </div>
              </li>
              <li className="home-step">
                <span className="home-step__number" aria-hidden="true">2</span>
                <div>
                  <h3>Request</h3>
                  <p>Request a book you would like to borrow.</p>
                </div>
              </li>
              <li className="home-step">
                <span className="home-step__number" aria-hidden="true">3</span>
                <div>
                  <h3>Exchange &amp; Read</h3>
                  <p>The owner approves the request, and the book can be exchanged and enjoyed.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="home-final-cta" aria-labelledby="home-final-cta-title">
          <div className="home-container home-final-cta__panel">
            <div>
              <p className="home-eyebrow">Community Book Exchange</p>
              <h2 id="home-final-cta-title">Ready to find your next book?</h2>
              <p>
                {isAuthenticated
                  ? "Explore books shared by the community."
                  : "Come and join us to share books and discover your next read."}
              </p>
            </div>
            <Link className="regbutton" href={homepageAction.href}>
              {homepageAction.finalLabel}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
