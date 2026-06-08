"use client"

import Link from "next/link"
import { ROUTES } from "@/constants/routes"
import { useAppTranslation } from "@/hooks/useTranslation"
import { LayoutDashboard, ShoppingBag, Package, BarChart3, Settings } from "lucide-react"

const bottomNavItems = [
  { label: "nav.dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: "nav.pos", href: ROUTES.POS, icon: ShoppingBag },
  { label: "nav.inventory", href: ROUTES.INVENTORY, icon: Package },
  { label: "nav.reports", href: ROUTES.REPORTS, icon: BarChart3 },
  { label: "nav.settings", href: ROUTES.SETTINGS, icon: Settings },
]

export function BottomNav() {
  const { t } = useAppTranslation()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-background border-t flex items-center justify-around px-2 z-50">
      {bottomNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <item.icon className="w-5 h-5" />
          <span className="text-[10px]">{t(item.label)}</span>
        </Link>
      ))}
    </nav>
  )
}
