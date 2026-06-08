import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(req: NextRequest) {
  try {
    if (!adminDb) return NextResponse.json({ error: "Admin DB not configured" }, { status: 500 })

    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get("tenantId")
    const limitParam = searchParams.get("limit")
    const maxLimit = limitParam ? parseInt(limitParam, 10) : 50

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 })
    }

    const snap = await adminDb
      .collection("sales")
      .where("tenantId", "==", tenantId)
      .where("isDeleted", "==", false)
      .orderBy("createdAt", "desc")
      .limit(maxLimit)
      .get()

    const sales = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    return NextResponse.json({ sales, total: sales.length })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
