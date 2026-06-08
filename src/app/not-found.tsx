import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <h2 className="text-xl font-semibold">Page introuvable</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <Link href="/dashboard">
        <Button>Retour au tableau de bord</Button>
      </Link>
    </div>
  )
}
