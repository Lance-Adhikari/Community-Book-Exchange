import Image from "next/image";
import Link from "next/link";

import { logout } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";

const anonymousLinks = [
  { href: "/books", label: "Browse Books" },
  { href: "/login", label: "Login" },
  { href: "/register", label: "Register" },
] as const;

const authenticatedLinks = [
  { href: "/books", label: "Browse Books" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

export async function SiteHeader({ title }: { title: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && Boolean(data?.claims?.sub);
  const links = isAuthenticated ? authenticatedLinks : anonymousLinks;

  return (
    <header className="site-header">
      <h1>{title}</h1>

      <Link
        className="site-header__logo-link"
        href="/"
        aria-label="Go to the Community Book Exchange homepage"
      >
        <Image
          src="/Images/logo.jpg"
          width={110}
          height={110}
          className="logo_move"
          alt="Community Book Exchange logo"
          priority
        />
      </Link>

      <nav
        className={`site-header__nav ${
          isAuthenticated
            ? "site-header__nav--authenticated"
            : "site-header__nav--anonymous"
        }`}
        aria-label="Primary navigation"
      >
        {links.map((link) => (
          <Link href={link.href} key={link.href}>
            {link.label}
          </Link>
        ))}
        {isAuthenticated ? (
          <form action={logout}>
            <button type="submit">Logout</button>
          </form>
        ) : null}
      </nav>
    </header>
  );
}
