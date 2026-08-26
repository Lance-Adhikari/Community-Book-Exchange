import Image from "next/image";
import Link from "next/link";

type SiteHeaderProps = {
  title: string;
  navigation?: "legacy" | "homepage";
};

const homepageLinks = [
  { href: "/books", label: "Browse Books" },
  { href: "/login", label: "Login" },
  { href: "/register", label: "Register" },
] as const;

export function SiteHeader({
  title,
  navigation = "legacy",
}: SiteHeaderProps) {
  return (
    <header className="site-header">
      <h1>{title}</h1>

      <Image
        src="/Images/logo.jpg"
        width={110}
        height={110}
        className="logo_move"
        alt="Community Book Exchange logo"
        priority
      />

      <nav
        className={`site-header__nav${navigation === "homepage" ? " site-header__nav--homepage" : ""}`}
        aria-label="Primary navigation"
      >
        {navigation === "homepage" ? (
          homepageLinks.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))
        ) : (
          <>
            <Link href="/">Home</Link>
            <Link href="/books">Browse Books</Link>
          </>
        )}
      </nav>
    </header>
  );
}
