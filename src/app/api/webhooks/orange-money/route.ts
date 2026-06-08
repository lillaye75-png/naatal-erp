import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(req: NextRequest) {
  try {
    if (!adminDb) return NextResponse.json({ error: "Admin DB not configured" }, { status: 500 })

    const body = await req.json()
    const { status, txRef, amount, customer_msisdn } = body

    if (status !== "SUCCESSFUL") {
      return NextResponse.json({ success: true, message: "Ignored non-successful payment" })
    }

    const now = Date.now().toString()

    const saleSnap = await adminDb.collection("sales").doc(txRef).get()

    if (saleSnap.exists) {
        const saleData = saleSnap.data()!
      const newPaid = (saleData.amountPaid || 0) + amount
      const newStatus =
        newPaid >= (saleData.total || 0) ? "PAID" : "PARTIAL"

      await adminDb.collection("sales").doc(saleSnap.id).update({
        amountPaid: newPaid,
        paymentStatus: newStatus,
        updatedAt: now,
      })

      await adminDb.collection("payments").add({
        saleId: saleSnap.id,
        amount,
        method: "OM",
        reference: txRef || "",
        cashRegisterId: "",
        createdAt: now,
        tenantId: saleData.tenantId,
      })

      if (saleData.customerId) {
        const customerSnap = await adminDb.collection("customers").doc(saleData.customerId).get()
          if (customerSnap.exists) {
            const customerData = customerSnap.data()
            const currentDebt = customerData?.totalDebt || 0
            await adminDb.collection("customers").doc(customerSnap.id).update({
              totalDebt: Math.max(0, currentDebt - amount),
            })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
