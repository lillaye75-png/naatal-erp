"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { collection, getDocs, query, where } from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"
import { useAuthStore } from "@/stores/auth.store"
import { getLowStockProducts } from "@/services/inventory.service"
import { formatXOF } from "@/lib/currency"
import { Bot, TrendingUp, Users, AlertTriangle, Package, DollarSign, Loader2, Sparkles } from "lucide-react"

interface AssistantData {
  todaySales: number
  todaySalesCount: number
  totalDebt: number
  topDebtor: { name: string; debt: number } | null
  lowStockCount: number
  topProduct: { name: string; total: number } | null
  totalProducts: number
  totalCustomers: number
  totalExpenses: number
  totalRevenue: number
}

const SUGGESTED_QUESTIONS = [
  "Quel est le total des ventes aujourd'hui ?",
  "Qui doit le plus d'argent ?",
  "Quels produits ont un stock faible ?",
  "Quel produit se vend le mieux ?",
  "Quel est le montant total des dettes ?",
  "Combien de clients avons-nous ?",
  "Ajouter une dépense",
  "Créer une facture",
  "Enregistrer une vente",
  "Quelles sont mes dépenses du mois ?",
  "Quel est le bénéfice net ?",
  "Combien de produits en stock ?",
]

export function AccountingAssistant({ startDate, endDate }: { startDate: number; endDate: number }) {
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AssistantData | null>(null)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(true)

  useEffect(() => {
    if (!tenantId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { db } = await initializeFirebase()
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayTs = todayStart.getTime().toString()

        const [salesSnap, custSnap, prodSnap, expSnap] = await Promise.all([
          getDocs(query(collection(db, 'sales'), where('tenantId', '==', tenantId), where('isDeleted', '==', false))),
          getDocs(query(collection(db, 'customers'), where('tenantId', '==', tenantId), where('isDeleted', '==', false))),
          getDocs(query(collection(db, 'products'), where('tenantId', '==', tenantId), where('isDeleted', '==', false))),
          getDocs(query(collection(db, 'expenses'), where('tenantId', '==', tenantId), where('isDeleted', '==', false))),
        ])

        const sales = salesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any))
        const customers = custSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any))
        const products = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any))
        const expenses = expSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any))

        const nonProforma = (s: any) => s.invoiceType !== 'PROFORMA' && s.invoiceType !== 'QUOTATION'
        const saleValue = (s: any) => s.invoiceType === 'CREDIT_NOTE' ? -(s.total || 0) : (s.total || 0)

        const todaySales = sales
          .filter((s: any) => s.createdAt >= todayTs && nonProforma(s))
          .reduce((sum: number, s: any) => sum + saleValue(s), 0)

        const todaySalesCount = sales
          .filter((s: any) => s.createdAt >= todayTs && nonProforma(s) && s.invoiceType !== 'CREDIT_NOTE')
          .length

        const debtors = customers
          .filter((c: any) => (c.totalDebt || 0) > 0)
          .sort((a: any, b: any) => (b.totalDebt || 0) - (a.totalDebt || 0))

        const topDebtor = debtors.length > 0 ? { name: debtors[0].name, debt: debtors[0].totalDebt || 0 } : null
        const totalDebt = debtors.reduce((sum: number, c: any) => sum + (c.totalDebt || 0), 0)

        const lowStock = tenantId ? await getLowStockProducts(tenantId) : []

        const productSales: Record<string, number> = {}
        sales
          .filter((s: any) => nonProforma(s) && s.invoiceType !== 'CREDIT_NOTE')
          .forEach((s: any) => {
            (s.items || []).forEach((item: any) => {
              if (item.productId && item.productId !== '__quick_pos__') {
                productSales[item.productId] = (productSales[item.productId] || 0) + (item.qty || 0)
              }
            })
          })
        const topProdId = Object.entries(productSales).sort(([, a], [, b]) => b - a)[0]?.[0]
        const topProduct = topProdId
          ? { name: products.find((p: any) => p.id === topProdId)?.name || topProdId, total: productSales[topProdId] }
          : null

        const validSales = sales.filter((s: any) => nonProforma(s))
        const totalRevenue = validSales.reduce((sum: number, s: any) => sum + saleValue(s), 0)
        const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)

        if (!cancelled) {
          setData({
            todaySales,
            todaySalesCount,
            totalDebt,
            topDebtor,
            lowStockCount: lowStock.length,
            topProduct,
            totalProducts: products.length,
            totalCustomers: customers.length,
            totalExpenses,
            totalRevenue,
          })
        }
      } catch (err) {
        console.error('Error loading assistant data:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [tenantId])

  const answerQuestion = (q: string) => {
    if (!data) return
    const qLower = q.toLowerCase()
    if (qLower.includes("vente") && qLower.includes("jourd")) {
      setAnswer(`💰 Aujourd'hui, vous avez réalisé **${data.todaySalesCount} vente(s)** pour un total de **${formatXOF(data.todaySales)}**.`)
    } else if (qLower.includes("dette") || qLower.includes("doit")) {
      if (data.topDebtor) {
        setAnswer(`🏆 Le client le plus endetté est **${data.topDebtor.name}** avec **${formatXOF(data.topDebtor.debt)}** de dettes. Le total des dettes est de **${formatXOF(data.totalDebt)}**.`)
      } else {
        setAnswer(`✅ Aucune dette client en cours.`)
      }
    } else if (qLower.includes("stock") && (qLower.includes("faible") || qLower.includes("rupture"))) {
      setAnswer(`⚠️ **${data.lowStockCount} produit(s)** ont un stock faible ou en rupture. Consultez la page Stock pour plus de détails.`)
    } else if (qLower.includes("mieux") || qLower.includes("plus vend")) {
      if (data.topProduct) {
        setAnswer(`🏅 Le produit le plus vendu est **${data.topProduct.name}** (${data.topProduct.total} unités vendues).`)
      } else {
        setAnswer(`📊 Aucune donnée de vente disponible.`)
      }
    } else if (qLower.includes("client")) {
      setAnswer(`👥 Vous avez **${data.totalCustomers} client(s)** enregistrés.`)
    } else if (qLower.includes("produit")) {
      setAnswer(`📦 Vous avez **${data.totalProducts} produit(s)** dans votre catalogue.`)
    } else if (qLower.includes("dépense") || qLower.includes("depense")) {
      if (qLower.includes("ajouter")) {
        setAnswer(`📝 Pour ajouter une dépense, allez dans le menu **Dépenses** et cliquez sur **Nouvelle dépense**. Vous pouvez aussi me donner le montant et la catégorie et je vous guiderai.`)
      } else {
        setAnswer(`💰 Total des dépenses : **${formatXOF(data.totalExpenses)}**`)
      }
    } else if (qLower.includes("facture") && (qLower.includes("créer") || qLower.includes("creer"))) {
      setAnswer(`📄 Pour créer une facture, allez dans **Ventes > Nouvelle vente**, sélectionnez **Proforma** ou **Devis** comme type de document.`)
    } else if (qLower.includes("vente") && (qLower.includes("enregistrer") || qLower.includes("nouvelle") || qLower.includes("créer"))) {
      setAnswer(`🛒 Pour enregistrer une vente, allez dans **Ventes > Nouvelle vente** ou utilisez le **Point de vente (POS)** pour des ventes rapides.`)
    } else if (qLower.includes("bénéfice") || qLower.includes("benefice") || qLower.includes("profit")) {
      const profit = data.totalRevenue - data.totalExpenses
      setAnswer(`📊 **Bénéfice net : ${formatXOF(profit)}**\n\n• Revenus : ${formatXOF(data.totalRevenue)}\n• Dépenses : ${formatXOF(data.totalExpenses)}`)
    } else if (qLower.includes("stock") && (qLower.includes("total") || qLower.includes("combien"))) {
      setAnswer(`📦 Vous avez **${data.totalProducts} produit(s)** en catalogue. ${data.lowStockCount} ont un stock faible.`)
    } else {
      setAnswer(`🤖 Voici un résumé rapide :\n\n• Ventes du jour : ${formatXOF(data.todaySales)} (${data.todaySalesCount} vente(s))\n• Total dettes : ${formatXOF(data.totalDebt)}\n• Produits : ${data.totalProducts}\n• Clients : ${data.totalCustomers}\n• Stock faible : ${data.lowStockCount} produit(s)\n\nPosez une question plus précise sur les ventes, dettes, stocks, produits ou clients.`)
    }
  }

  const handleAsk = () => {
    if (!question.trim()) return
    answerQuestion(question.trim())
    setShowSuggestions(false)
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Ventes du jour</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{formatXOF(data.todaySales)}</p><p className="text-xs text-muted-foreground">{data.todaySalesCount} vente(s)</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Top débiteur</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm font-medium truncate">{data.topDebtor?.name || 'Aucun'}</p>
            <p className="text-xs text-muted-foreground">{data.topDebtor ? formatXOF(data.topDebtor.debt) : '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Stock faible</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-warning">{data.lowStockCount}</p><p className="text-xs text-muted-foreground">produit(s)</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Package className="w-3 h-3" /> Top produit</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm font-medium truncate">{data.topProduct?.name || '-'}</p>
            <p className="text-xs text-muted-foreground">{data.topProduct ? `${data.topProduct.total} vendus` : ''}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Assistant comptable
            <Sparkles className="w-3 h-3 text-primary" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Posez une question sur votre activité..."
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            />
            <Button onClick={handleAsk} size="sm">Demander</Button>
          </div>
          {showSuggestions && (
            <div className="flex flex-wrap gap-1">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="text-xs bg-muted px-2 py-1 rounded-full hover:bg-muted/80 transition-colors"
                  onClick={() => { setQuestion(q); answerQuestion(q); setShowSuggestions(false) }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          {answer && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm whitespace-pre-line">
              {answer}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
