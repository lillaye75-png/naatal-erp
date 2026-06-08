import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { BottomNav } from "@/components/layout/BottomNav"
import { RoleGuard } from "@/components/layout/RoleGuard"
import { OfflineBanner } from "@/components/shared/OfflineBanner"
import { PwaInstallPrompt } from "@/components/shared/PwaInstallPrompt"
import { ServiceWorkerRegister } from "@/components/shared/ServiceWorkerRegister"
import { AuthGuard } from "@/components/shared/AuthGuard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <ServiceWorkerRegister />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <OfflineBanner />
          <TopBar />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6 animate-in fade-in duration-200">
            <RoleGuard>{children}</RoleGuard>
          </main>
        </div>
        <BottomNav />
        <PwaInstallPrompt />
      </div>
    </AuthGuard>
  )
}
