"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Globe, Wifi, WifiOff, RefreshCw, CloudOff, Command, Loader2, Package, Users, FileText, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { useOfflineStore } from "@/stores/offline.store"
import { useSyncManager } from "@/hooks/useSyncManager"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/hooks/useDebounce"
import { NotificationBell } from "@/components/shared/NotificationBell"
import { useAuthStore } from "@/stores/auth.store"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { ROUTES } from "@/constants/routes"
import { formatXOF } from "@/lib/currency"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'wo', label: 'Wolof' },
]

interface SearchResult {
  type: 'product' | 'customer' | 'invoice' | 'supplier'
  id: string
  label: string
  subtitle: string
  url: string
}

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debouncedQuery = useDebounce(searchQuery, 300)
  const inputRef = useRef<HTMLInputElement>(null)
  const isOnline = useOnlineStatus()
  const { isSyncing, pendingWrites } = useOfflineStore()
  const { sync } = useSyncManager()
  const { i18n } = useTranslation()
  const router = useRouter()
  const tenantId = useAuthStore((s) => s.tenant?.id)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [searchOpen])

  const doSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2 || !tenantId) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const { db } = await initializeFirebase()
      const results: SearchResult[] = []

      const [prodSnap, custSnap, invSnap, supSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'products'),
          where('tenantId', '==', tenantId),
          where('isDeleted', '==', false),
          limit(5),
        )),
        getDocs(query(
          collection(db, 'customers'),
          where('tenantId', '==', tenantId),
          where('isDeleted', '==', false),
          limit(5),
        )),
        getDocs(query(
          collection(db, 'invoices'),
          where('tenantId', '==', tenantId),
          where('isDeleted', '==', false),
          limit(5),
        )),
        getDocs(query(
          collection(db, 'suppliers'),
          where('tenantId', '==', tenantId),
          where('isDeleted', '==', false),
          limit(5),
        )),
      ])

      const qLow = searchTerm.toLowerCase()
      prodSnap.docs.forEach((d) => {
        const p = d.data() as any
        if ((p.name || '').toLowerCase().includes(qLow) || (p.sku || '').toLowerCase().includes(qLow)) {
          results.push({ type: 'product', id: d.id, label: p.name, subtitle: formatXOF(p.price || 0), url: `/products` })
        }
      })
      custSnap.docs.forEach((d) => {
        const c = d.data() as any
        if ((c.name || '').toLowerCase().includes(qLow) || (c.phone || '').includes(qLow)) {
          results.push({ type: 'customer', id: d.id, label: c.name, subtitle: c.phone, url: `/customers` })
        }
      })
      invSnap.docs.forEach((d) => {
        const inv = d.data() as any
        if ((inv.number || '').toLowerCase().includes(qLow)) {
          results.push({ type: 'invoice', id: d.id, label: inv.number, subtitle: formatXOF(inv.total || 0), url: `/invoices` })
        }
      })
      supSnap.docs.forEach((d) => {
        const s = d.data() as any
        if ((s.name || '').toLowerCase().includes(qLow)) {
          results.push({ type: 'supplier', id: d.id, label: s.name, subtitle: s.phone || '', url: `/suppliers` })
        }
      })

      setSearchResults(results.slice(0, 20))
    } catch (err) {
      console.error("Search error:", err)
    } finally {
      setSearching(false)
    }
  }, [tenantId])

  useEffect(() => {
    doSearch(debouncedQuery)
  }, [debouncedQuery, doSearch])

  const handleLocaleChange = (code: string) => {
    i18n.changeLanguage(code)
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000`
  }

  const handleSelect = (result: SearchResult) => {
    setSearchOpen(false)
    setSearchQuery("")
    router.push(result.url)
  }

  const typeIcons: Record<string, React.ReactNode> = {
    product: <Package className="w-4 h-4" />,
    customer: <Users className="w-4 h-4" />,
    invoice: <FileText className="w-4 h-4" />,
    supplier: <Building2 className="w-4 h-4" />,
  }

  const typeLabels: Record<string, string> = {
    product: 'Produit',
    customer: 'Client',
    invoice: 'Facture',
    supplier: 'Fournisseur',
  }

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 lg:px-6 gap-4">
      {!isOnline && (
        <div className="absolute top-0 left-0 right-0 bg-destructive text-destructive-foreground text-[10px] text-center py-0.5 flex items-center justify-center gap-1">
          <WifiOff className="w-2.5 h-2.5" />
          <span>Hors ligne — {pendingWrites.length} action(s) en attente</span>
        </div>
      )}
      <div className="flex-1 max-w-md hidden sm:block">
        <button
          onClick={() => setSearchOpen(true)}
          className="relative w-full flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground hover:border-foreground/20 transition-colors"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">Rechercher...</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-lg top-[15%]">
          <DialogHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Rechercher produits, clients, factures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-0.5">
            {searching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
              <p className="text-center py-8 text-sm text-muted-foreground">Aucun résultat trouvé</p>
            )}
            {!searching && searchResults.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
              >
                <span className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  {typeIcons[result.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{result.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                </div>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                  {typeLabels[result.type]}
                </span>
              </button>
            ))}
            {!searching && searchQuery.length < 2 && (
              <p className="text-center py-8 text-sm text-muted-foreground">
                Tapez au moins 2 caractères pour rechercher
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2">
        {pendingWrites.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 relative"
            onClick={sync}
            disabled={isSyncing}
            title="Synchroniser"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] rounded-full flex items-center justify-center font-medium">
              {pendingWrites.length}
            </span>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className="cursor-pointer" render={<button type="button" />}>
            <Globe className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => handleLocaleChange(lang.code)}
                className={i18n.language === lang.code ? 'font-bold' : ''}
              >
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {isOnline ? (
            <><Wifi className="w-3 h-3 text-success" /><span>En ligne</span></>
          ) : (
            <><CloudOff className="w-3 h-3 text-destructive" /><span>{pendingWrites.length} en attente</span></>
          )}
        </div>

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger className="cursor-pointer" render={<button type="button" />}>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                U
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(ROUTES.PROFILE)}>Profil</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(ROUTES.SETTINGS)}>Paramètres</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => { document.cookie = '__session=; path=/; max-age=0'; router.push('/login') }}>
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
