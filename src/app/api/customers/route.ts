import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET(req: NextRequest) {
  try {
    if (!adminDb) return NextResponse.json({ error: "Admin DB not configured" }, { status: 500 })

    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get("tenantId")

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 })
    }

    const snap = await adminDb
      .collection("customers")
      .where("tenantId", "==", tenantId)
      .where("isDeleted", "==", false)
      .get()

    const customers = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    return NextResponse.json({ customers, total: customers.length })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!adminDb) return NextResponse.json({ error: "Admin DB not configured" }, { status: 500 })

    const { tenantId, name, phone, email, address, creditLimit, createdBy } = await req.json()

    if (!tenantId || !name || !phone || !createdBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const now = Date.now().toString()

    const docRef = await adminDb.collection("customers").add({
      tenantId,
      name,
      phone,
      email: email || "",
      address: address || "",
      creditLimit: creditLimit || 0,
      totalDebt: 0,
      createdBy,
      createdAt: now,
      updatedAt: now,
      updatedBy: createdBy,
      isDeleted: false,
      status: "ACTIVE",
    })

    return NextResponse.json({ id: docRef.id, success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
