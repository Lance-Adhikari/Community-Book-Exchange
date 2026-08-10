import Image from "next/image";

type SiteHeaderProps = {
  title: string;
};

export function SiteHeader({ title }: SiteHeaderProps) {
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

      <nav className="site-header__nav" aria-label="Primary navigation">
        <a href="/contactUs.html">Contact Us</a>
        <a href="/aboutUs.html">About Us</a>
      </nav>
    </header>
  );
}
