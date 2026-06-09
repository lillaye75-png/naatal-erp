import { NextRequest, NextResponse } from "next/server"
import { initializeFirebase } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const tenantId = searchParams.get("tenantId")
    const invoiceNumber = searchParams.get("number")

    const { db } = await initializeFirebase()

    if (id) {
      const snap = await getDoc(doc(db, "invoices", id))
      if (!snap.exists()) {
        return NextResponse.json({ error: "Facture introuvable" }, { status: 404 })
      }
      return NextResponse.json({ id: snap.id, ...snap.data() })
    }

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId requis" }, { status: 400 })
    }

    let constraints: any[] = [
      where("tenantId", "==", tenantId),
      where("isDeleted", "==", false),
    ]

    if (invoiceNumber) {
      constraints.push(where("number", "==", invoiceNumber))
    }

    const snap = await getDocs(query(collection(db, "invoices"), ...constraints))
    const invoices = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    return NextResponse.json({ items: invoices })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur interne" }, { status: 500 })
  }
}