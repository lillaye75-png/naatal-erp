import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth) {
      return NextResponse.json({ error: "Admin Auth not configured" }, { status: 500 })
    }

    const { idToken, claims } = await req.json()

    if (!idToken || !claims) {
      return NextResponse.json({ error: "idToken and claims are required" }, { status: 400 })
    }

    const decoded = await adminAuth.verifyIdToken(idToken)
    const uid = decoded.uid

    await adminAuth.setCustomUserClaims(uid, claims)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
