import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";

type AuthPageProps = {
  children: ReactNode;
  description: string;
  title: string;
};

export function AuthPage({ children, description, title }: AuthPageProps) {
  return (
    <>
      <SiteHeader title="Community Book Exchange" />
      <main className="auth-main">
        <section className="auth-card" aria-labelledby="auth-page-title">
          <div className="auth-card__heading">
            <h2 id="auth-page-title">{title}</h2>
            <p>{description}</p>
          </div>
          {children}
        </section>
      </main>
    </>
  );
}
