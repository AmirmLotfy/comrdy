"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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
  PanelLeft,
  ShoppingBag,
  TriangleAlert,
} from "lucide-react";
import { api, type Mode, type ServiceStatus } from "./types";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={`wordmark${inverse ? " inverse" : ""}`}
      aria-label="COMRDY home"
    >
      COMRDY<span className="wordmark-period">.</span>
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

export function MarketingNav() {
  return (
    <header className="marketing-header">
      <div className="marketing-nav container">
        <Brand />
        <nav aria-label="Main navigation">
          <Link href="/#mechanism">How it works</Link>
          <Link href="/docs">Documentation</Link>
          <Link href="/demo" className="button small dark">
            Open the lab <ArrowUpRight size={14} />
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer container">
      <div>
        <Brand />
        <p>Keep the purchase inside the promise.</p>
      </div>
      <nav aria-label="Footer">
        <Link href="/demo">
          Test lab <ArrowUpRight size={13} />
        </Link>
        <Link href="/store">
          Demo store <ArrowUpRight size={13} />
        </Link>
        <Link href="/docs">
          Documentation <ArrowUpRight size={13} />
        </Link>
      </nav>
      <span className="footer-note">
        A working prototype. Explicit evidence. Clear limits.
      </span>
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
  const [menu, setMenu] = useState(false);
  const links = [
    { href: "/demo", label: "Test lab", icon: FlaskConical },
    { href: "/compare", label: "Compare runs", icon: GitCompareArrows },
    { href: "/store", label: "Demo store", icon: ShoppingBag },
    { href: "/docs", label: "Documentation", icon: BookOpen },
  ];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            onClick={() => setMenu(false)}
            aria-label="Close navigation"
          >
            <PanelLeft size={18} />
          </button>
        </div>
        <div className="workspace-picker">
          <span className="workspace-avatar">C</span>
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
              onClick={() => setMenu(false)}
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
      {menu && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMenu(false)}
          aria-label="Close navigation"
        />
      )}
      <div className="app-main">
        <header className="app-topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              onClick={() => setMenu(true)}
              aria-label="Open navigation"
            >
              <PanelLeft size={18} />
            </button>
            <span>{section}</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{title}</strong>
          </div>
          <EnvironmentBadge
            mode={status?.mode}
            checking={!status && !error}
            unavailable={error}
          />
        </header>
        <main id="main" className="workspace-content">
          {children}
        </main>
        <footer className="app-footer">
          <span>Controlled merchant · No real money</span>
          <Link href="/docs#evidence">
            Understand the evidence <ArrowUpRight size={12} />
          </Link>
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
