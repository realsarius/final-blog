"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AdminSidebarNav.module.css";

type NavItem = {
  href: string;
  label: string;
};

type NavGroup = {
  title: string;
  ariaLabel: string;
  items: ReadonlyArray<NavItem>;
};

type AdminSidebarNavProps = {
  navGroups: ReadonlyArray<NavGroup>;
};

function isRouteActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebarNav({ navGroups }: AdminSidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className={styles.navWrap}>
      {navGroups.map((group) => {
        const groupActive = group.items.some((item) =>
          isRouteActive(pathname, item.href),
        );

        return (
          <details key={group.title} className={styles.group} open={groupActive}>
            <summary className={styles.groupTitle}>
              <span>{group.title}</span>
              <span className={styles.chevron} aria-hidden>
                ▾
              </span>
            </summary>
            <nav className={styles.nav} aria-label={group.ariaLabel}>
              {group.items.map((item) => {
                const active = isRouteActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </details>
        );
      })}
    </div>
  );
}
