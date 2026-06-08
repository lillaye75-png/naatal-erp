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
      .collection("products")
      .where("tenantId", "==", tenantId)
      .where("isDeleted", "==", false)
      .get()

    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    return NextResponse.json({ products, total: products.length })
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

    const { tenantId, name, sku, price, costPrice, categoryId, brandId, unitId, minStock, barcode, imageUrl, createdBy } = await req.json()

    if (!tenantId || !name || !createdBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const now = Date.now().toString()

    const docRef = await adminDb.collection("products").add({
      tenantId,
      name,
      sku: sku || "",
      price: price || 0,
      costPrice: costPrice || 0,
      categoryId: categoryId || "",
      brandId: brandId || "",
      unitId: unitId || "",
      minStock: minStock || 0,
      barcode: barcode || "",
      imageUrl: imageUrl || "",
      isSoldOnline: false,
      warehouseId: "",
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
