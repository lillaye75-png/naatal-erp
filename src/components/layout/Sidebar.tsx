"use client"

import Link from "next/link"
import { ROUTES } from "@/constants/routes"
import { useAppTranslation } from "@/hooks/useTranslation"
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  ShoppingCart,
  FileText,
  ShoppingBag,
  Calculator,
  ClipboardList,
  PackageSearch,
  HandCoins,
  Banknote,
  BarChart3,
  Globe,
  Settings,
  Tags,
  Bookmark,
  Receipt,
  Warehouse,
  Ruler,
  UserCog,
  ListOrdered,
  Building2,
  Repeat,
  ShieldCheck,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  divider?: boolean
}

const navItems: NavItem[] = [
  { label: "nav.dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: "nav.products", href: ROUTES.PRODUCTS, icon: Package },
  { label: "nav.customers", href: ROUTES.CUSTOMERS, icon: Users },
  { label: "nav.suppliers", href: ROUTES.SUPPLIERS, icon: Truck },
  { label: "nav.sales", href: ROUTES.SALES, icon: ShoppingCart },
  { label: "nav.invoices", href: ROUTES.INVOICES, icon: FileText },
  { label: "nav.pos", href: ROUTES.POS, icon: ShoppingBag },
  { label: "nav.quickPos", href: ROUTES.POS_QUICK, icon: Calculator },
  { label: "nav.purchases", href: ROUTES.PURCHASES, icon: ClipboardList },
  { label: "nav.inventory", href: ROUTES.INVENTORY, icon: PackageSearch },
  { label: "nav.debt", href: ROUTES.DEBT, icon: HandCoins },
  { label: "nav.cashRegister", href: ROUTES.CASH_REGISTER, icon: Banknote },
  { label: "nav.reports", href: ROUTES.REPORTS, icon: BarChart3 },
  { label: "nav.ecommerce", href: ROUTES.ECOMMERCE, icon: Globe },
  { label: "nav.orders", href: ROUTES.ECOMMERCE_ORDERS, icon: ListOrdered },
  { label: "product.categories", href: ROUTES.CATEGORIES, icon: Tags },
  { label: "product.brands", href: ROUTES.BRANDS, icon: Bookmark },
  { label: "nav.importProducts", href: ROUTES.PRODUCTS_IMPORT, icon: PackageSearch },
  { label: "nav.importCustomers", href: ROUTES.CUSTOMERS_IMPORT, icon: Users },
  { label: "", href: "", icon: LayoutDashboard, divider: true },
  { label: "nav.expenses", href: ROUTES.EXPENSES, icon: Receipt },
  { label: "nav.warehouses", href: ROUTES.WAREHOUSES, icon: Warehouse },
  { label: "nav.branches", href: ROUTES.BRANCHES, icon: Building2 },
  { label: "nav.recurring", href: ROUTES.RECURRING, icon: Repeat },
  { label: "nav.units", href: ROUTES.UNITS, icon: Ruler },
  { label: "nav.customerGroups", href: ROUTES.CUSTOMER_GROUPS, icon: UserCog },
  { label: "nav.settings", href: ROUTES.SETTINGS, icon: Settings },
  { label: "nav.roles", href: ROUTES.SETTINGS_ROLES, icon: ShieldCheck },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { t } = useAppTranslation()

  return (
    <aside
      className={`hidden lg:flex flex-col bg-sidebar text-sidebar-foreground h-screen sticky top-0 transition-all duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
          N
        </div>
        {!collapsed && <span className="font-semibold text-sm">Naatal ERP</span>}
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map((item) =>
          item.divider ? (
            <div key="divider" className="border-t border-sidebar-border my-2" />
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{t(item.label)}</span>}
            </Link>
          )
        )}
      </nav>
    </aside>
  )
}
