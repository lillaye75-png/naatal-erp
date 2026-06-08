import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(req: NextRequest) {
  try {
    if (!adminDb) return NextResponse.json({ error: "Admin DB not configured" }, { status: 500 })

    const { tenantId, category, amount, description, date, createdBy } = await req.json()

    if (!tenantId || !category || !amount || !createdBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const now = Date.now().toString()

    const docRef = await adminDb.collection("expenses").add({
      tenantId,
      category,
      amount,
      description: description || "",
      date: date || new Date().toISOString().split("T")[0],
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
