"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Receipt,
  ShoppingBag,
  Warehouse,
  BarChart3,
  MessageCircle,
  Store,
  Settings,
  HelpCircle,
  ChevronLeft,
  Menu,
  Truck,
  Wallet,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, key: "nav.dashboard" },
  { href: "/pos", icon: ShoppingCart, key: "nav.pos" },
  { href: "/produits", icon: Package, key: "nav.products" },
  { href: "/clients", icon: Users, key: "nav.customers" },
  { href: "/fournisseurs", icon: Truck, key: "nav.suppliers" },
  { href: "/ventes", icon: Receipt, key: "nav.sales" },
  { href: "/achats", icon: ShoppingBag, key: "nav.purchases" },
  { href: "/stocks", icon: Warehouse, key: "nav.stock" },
  { href: "/depenses", icon: Wallet, key: "nav.expenses" },
  { href: "/rapports", icon: BarChart3, key: "nav.reports" },
];

const bottomItems = [
  { href: "/whatsapp", icon: MessageCircle, key: "nav.whatsapp" },
  { href: "/boutique", icon: Store, key: "nav.store" },
  { href: "/parametres", icon: Settings, key: "nav.settings" },
  { href: "/guide", icon: HelpCircle, key: "nav.help" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname.startsWith(href);

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) => (
    <Link
      href={href}
      onClick={() => setMobileOpen(false)}
      className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
        isActive(href)
          ? "bg-teranga-50 text-teranga-600 border-l-[3px] border-teranga-500"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
      } ${collapsed ? "justify-center px-2" : ""}`}
      title={collapsed ? label : undefined}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  const sidebarContent = (
    <div className={`flex flex-col h-full bg-[var(--bg-sidebar)] border-r border-[var(--border)] transition-all ${collapsed ? "w-16" : "w-60"}`}>
      <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--border)]">
        {!collapsed && (
          <Link href="/dashboard" className="font-semibold text-sm text-[var(--text-primary)]">
            Naatal
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded hover:bg-neutral-200 text-neutral-500"
          aria-label={collapsed ? "Agrandir la barre" : "Réduire la barre"}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded hover:bg-neutral-200 text-neutral-500"
          aria-label="Fermer la navigation"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1" role="navigation" aria-label="Navigation principale">
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href} icon={item.icon} label={t(item.key)} />
        ))}
      </nav>

      <div className="p-3 space-y-1 border-t border-[var(--border)]">
        {bottomItems.map((item) => (
          <NavLink key={item.href} href={item.href} icon={item.icon} label={t(item.key)} />
        ))}
        {!collapsed && (
          <div className="mt-4 px-3 py-2 text-xs text-neutral-500 bg-neutral-200/50 rounded">
            Plan: Pro
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 flex items-center justify-center w-10 h-10 rounded bg-[var(--bg-card)] border border-[var(--border)] shadow-sm"
        aria-label="Ouvrir la navigation"
      >
        <Menu className="w-5 h-5 text-[var(--text-primary)]" />
      </button>

      <aside className="hidden md:flex h-screen sticky top-0">{sidebarContent}</aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-30 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full z-40 md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}