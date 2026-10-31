"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CircleDot,
  ExternalLink,
  FlaskConical,
  GitCompareArrows,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  X,
  ShoppingBag,
  TriangleAlert,
} from "lucide-react";
import { BrandMark } from "./brand-mark";
import { api, type Mode, type ServiceStatus } from "./types";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={`wordmark${inverse ? " inverse" : ""}`}
      aria-label="COMRDY home"
    >
      <BrandMark />
      <span className="wordmark-name">
        COMRDY<span className="wordmark-period">.</span>
      </span>
    </Link>
  );
}

export function useServiceStatus() {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    api<ServiceStatus>("/api/v1/status")
      .then((data) => {
        if (active) setStatus(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return { status, error };
}

export function EnvironmentBadge({
  mode,
  checking = false,
  unavailable = false,
}: {
  mode?: Mode;
  checking?: boolean;
  unavailable?: boolean;
}) {
  return (
    <span
      className={`environment-badge ${mode === "sandbox" ? "sandbox" : ""}`}
    >
      {checking ? (
        <LoaderCircle size={12} className="spin" />
      ) : (
        <CircleDot size={12} />
      )}
      {unavailable
        ? "SERVICE UNAVAILABLE"
        : checking
          ? "CHECKING ENVIRONMENT"
          : mode === "sandbox"
            ? "PAYPAL SANDBOX"
            : "LOCAL SIMULATION"}
    </span>
  );
}

export function StatusPill({
  verdict,
  children,
}: {
  verdict?: string;
  children?: ReactNode;
}) {
  const good = /^(ALLOW|PASS|CAPTURED|COMPLETED)$/i.test(verdict ?? "");
  const bad = /DENY|BLOCK|FAIL/i.test(verdict ?? "");
  return (
    <span
      className={`status-pill ${good ? "success" : bad ? "danger" : "neutral"}`}
    >
      {good ? (
        <Check size={13} />
      ) : bad ? (
        <ArrowDownLeft size={13} />
      ) : (
        <CircleDot size={12} />
      )}
      {children ?? verdict ?? "Pending"}
    </span>
  );
}

const navigationLinks = [
  { href: "/demo", label: "Test lab" },
  { href: "/compare", label: "Compare runs" },
  { href: "/store", label: "Demo store" },
  { href: "/docs", label: "Documentation" },
];

function MobileNavigation({ workspace = false }: { workspace?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const id = workspace ? "workspace-mobile-menu" : "overview-mobile-menu";
  function close() {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  }
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 761px)");
    const resize = () => {
      if (desktop.matches) {
        dialog.current?.close();
        setOpen(false);
      }
    };
    desktop.addEventListener("change", resize);
    return () => {
      document.body.style.overflow = previous;
      desktop.removeEventListener("change", resize);
    };
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        className="mobile-menu-trigger"
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="dialog"
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
      >
        <Menu size={20} />
        <span>Menu</span>
      </button>
      <dialog
        id={id}
        ref={dialog}
        className="mobile-navigation"
        aria-label="COMRDY navigation"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const items = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              "a[href], button:not([disabled])",
            ),
          );
          const first = items[0];
          const last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="mobile-navigation-content">
          <div className="mobile-navigation-heading">
            <Brand />
            <button
              className="icon-button"
              aria-label="Close navigation"
              onClick={close}
            >
              <X size={21} />
            </button>
          </div>
          <p className="technical-label">Transaction workbench</p>
          <nav aria-label="Mobile navigation">
            {navigationLinks.map(({ href, label }, index) => (
              <Link
                key={href}
                href={href}
                onClick={close}
                aria-current={pathname === href ? "page" : undefined}
              >
                <span className="mono">0{index + 1}</span>
                {label}
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </nav>
          <Link href="/" className="mobile-overview-link" onClick={close}>
            Product overview <ArrowRight size={15} />
          </Link>
          <p className="mobile-navigation-note">
            Controlled merchant. No real money.
            <br />
            Every run identifies its environment.
          </p>
        </div>
      </dialog>
    </>
  );
}

export function MarketingNav() {
  return (
    <header className="marketing-header">
      <div className="marketing-nav container">
        <Brand />
        <nav className="desktop-navigation" aria-label="Main navigation">
          <Link href="/#mechanism">How it works</Link>
          <Link href="/docs">Documentation</Link>
          <Link href="/demo" className="button small dark">
            Open the lab <ArrowUpRight size={14} />
          </Link>
        </nav>
        <MobileNavigation />
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer-band">
      <div className="site-footer container">
        <div className="footer-brand">
          <Brand inverse />
          <p>
            Keep the purchase
            <br />
            inside the promise.
          </p>
          <span className="footer-note">
            A working prototype. Clear evidence. No real money.
          </span>
        </div>
        <nav aria-label="Footer">
          <span className="footer-nav-label">Explore the workbench</span>
          {navigationLinks.map(({ href, label }) => (
            <Link href={href} key={href}>
              {label}
              <ArrowUpRight size={15} />
            </Link>
          ))}
        </nav>
        <div className="footer-bottom">
          <span>
            Contract <span aria-hidden="true">→</span> observation{" "}
            <span aria-hidden="true">→</span> decision
          </span>
          <Link href="/docs#evidence">
            Evidence and limits <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function AppShell({
  children,
  title = "Test lab",
  section = "Workspace",
}: {
  children: ReactNode;
  title?: string;
  section?: string;
}) {
  const pathname = usePathname();
  const { status, error } = useServiceStatus();
  const links = [
    { href: "/demo", label: "Test lab", icon: FlaskConical },
    { href: "/compare", label: "Compare runs", icon: GitCompareArrows },
    { href: "/store", label: "Demo store", icon: ShoppingBag },
    { href: "/docs", label: "Documentation", icon: BookOpen },
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand />
        </div>
        <div className="workspace-picker">
          <span className="workspace-avatar">
            <BrandMark />
          </span>
          <div>
            <strong>COMRDY Lab</strong>
            <span>Controlled demo workspace</span>
          </div>
        </div>
        <p className="nav-section-label">WORKSPACE</p>
        <nav aria-label="Workspace navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`sidebar-link ${pathname === href || (href === "/demo" && pathname.startsWith("/cases/")) ? "active" : ""}`}
              aria-current={pathname === href ? "page" : undefined}
            >
              <Icon size={17} />
              {label}
              {href === "/store" && (
                <ExternalLink size={12} className="nav-trailing" />
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="scope-note">
            <span className="mini-label">THE BOUNDARY</span>
            <p>
              AI proposes the purchase.
              <br />
              Code checks the contract.
            </p>
          </div>
          <Link href="/" className="sidebar-link">
            <LayoutDashboard size={16} />
            Back to overview
            <ArrowUpRight size={13} className="nav-trailing" />
          </Link>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div className="breadcrumb">
            <div className="app-mobile-brand">
              <Brand />
            </div>
            <span>{section}</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <EnvironmentBadge
              mode={status?.mode}
              checking={!status && !error}
              unavailable={error}
            />
            <MobileNavigation workspace />
          </div>
        </header>
        <main id="main" className="workspace-content">
          {children}
        </main>
        <footer className="app-footer">
          <span>Controlled merchant · No real money</span>
          <nav aria-label="Workspace footer">
            <Link href="/demo">Test lab</Link>
            <Link href="/docs#evidence">
              Evidence guide <ArrowUpRight size={13} />
            </Link>
            <Link href="/">
              Overview <ArrowUpRight size={13} />
            </Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}

export function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="error-notice" role="alert">
      <TriangleAlert size={17} />
      <p>{message}</p>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  href = "/demo",
  label = "Start a test",
}: {
  title: string;
  children: ReactNode;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-rule">
        <CircleDot size={20} />
      </div>
      <h2>{title}</h2>
      <p>{children}</p>
      <Link className="button dark" href={href}>
        {label}
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}
