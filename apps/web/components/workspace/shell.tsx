"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  Compass,
  Flower2,
  Grid2X2,
  House,
  Leaf,
  Menu,
  Search,
  Settings2,
  Sparkles,
  Sprout,
  X,
} from "lucide-react";
import { NavAuth } from "@/components/nav-auth";

const links = [
  { href: "/", label: "Today", icon: House },
  { href: "/gardens", label: "My gardens", icon: Grid2X2 },
  { href: "/plants", label: "Plant library", icon: Sprout },
  { href: "/tasks", label: "Care tasks", icon: CheckCheck },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/explore", label: "Community", icon: Compass },
];
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const menuButton = menuRef.current;
    document.body.style.overflow = "hidden";
    const elements = () =>
      Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>("a[href], button") ??
          [],
      ).filter((el) => el.getClientRects().length);
    elements()[0]?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
      }
      if (event.key === "Tab") {
        const items = elements(),
          first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      menuButton?.focus();
    };
  }, [menuOpen]);
  const demo = pathname === "/demo" || pathname.startsWith("/demo/");
  const localPath = demo ? pathname.slice(5) || "/" : pathname;
  const href = (path: string) =>
    demo ? `/demo${path === "/" ? "" : path}` : path;
  const label =
    links.find((item) =>
      item.href === "/" ? localPath === "/" : localPath.startsWith(item.href),
    )?.label ??
    (localPath.startsWith("/designer")
      ? "Bed designer"
      : localPath.startsWith("/settings")
        ? "Settings"
        : localPath.startsWith("/botanist")
          ? "Garden botanist"
          : "Welcome");
  return (
    <div className="workspace-shell">
      <a href="#workspace-content" className="skip-link">
        Skip to content
      </a>
      {menuOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        id="main-navigation"
        className={`workspace-sidebar ${menuOpen ? "is-open" : ""}`}
      >
        <Link
          href={href("/")}
          className="wordmark"
          onClick={() => setMenuOpen(false)}
        >
          <span className="brand-symbol">
            <Sprout size={25} strokeWidth={1.7} />
          </span>
          we<span>garden</span>
          <span className="brand-period">.</span>
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        >
          <X size={20} />
        </button>
        <div className="sidebar-label">YOUR GROWING SPACE</div>
        <nav aria-label="Primary navigation" className="sidebar-nav">
          {links.map(({ href: path, label: itemLabel, icon: Icon }) => {
            const active =
              path === "/" ? localPath === "/" : localPath.startsWith(path);
            return (
              <Link
                key={path}
                href={href(path)}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`sidebar-link ${active ? "is-active" : ""}`}
              >
                <Icon size={19} strokeWidth={1.7} />
                {itemLabel}
                {active && <span className="active-dot" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-rule" />
        <Link
          className={`sidebar-link ${localPath === "/botanist" ? "is-active" : ""}`}
          href={href("/botanist")}
          onClick={() => setMenuOpen(false)}
        >
          <Sparkles size={19} strokeWidth={1.6} />
          Ask the botanist
          <ArrowUpRight size={15} className="ml-auto" />
        </Link>
        <div className="sidebar-note">
          <Flower2 size={28} strokeWidth={1.2} />
          <p>
            A little care.
            <br />A lot of possibility.
          </p>
          <span>Make room for something good.</span>
        </div>
        <div className="sidebar-bottom">
          <Link
            className="sidebar-link"
            href={href("/settings")}
            onClick={() => setMenuOpen(false)}
          >
            <Settings2 size={19} />
            Settings
          </Link>
          <div className="sidebar-account">
            <span className="account-avatar">
              <Leaf size={18} />
            </span>
            <div>
              <strong>
                {demo ? "The sample garden" : "Your growing space"}
              </strong>
              <span>
                {demo ? "A place to try things out" : "Plan. Grow. Enjoy."}
              </span>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <button
            ref={menuRef}
            className="mobile-menu icon-button"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            <span>My workspace</span>
            <ChevronRight size={13} />
            <strong>{label}</strong>
          </div>
          <form action={href("/plants")} className="topbar-search">
            <Search size={16} />
            <input
              aria-label="Search the plant library"
              name="q"
              placeholder="Find your next plant…"
            />
            <kbd>↵</kbd>
          </form>
          {demo ? (
            <Link className="topbar-account" href="/auth">
              Create an account <ArrowUpRight size={14} />
            </Link>
          ) : (
            <NavAuth />
          )}
        </header>
        {demo && (
          <div className="demo-banner">
            <span className="demo-dot" />
            <strong>Sample garden</strong>
            <span>Explore freely. Changes stay in this browser.</span>
            <Link href="/">
              Exit demo <ArrowUpRight size={13} />
            </Link>
          </div>
        )}
        <div id="workspace-content" tabIndex={-1} className="workspace-content">
          {children}
        </div>
        <footer className="workspace-footer">
          <Sprout size={15} /> Good things take a little growing.
          <span>WeGarden</span>
        </footer>
      </div>
    </div>
  );
}
