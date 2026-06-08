"use client"

import { useState } from "react"
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore"
import { initializeFirebase } from "@/lib/firebase"

export function useDocument(collectionName: string) {
  const [saving, setSaving] = useState(false)

  const create = async (data: Record<string, unknown>, tenantId?: string, userId?: string) => {
    setSaving(true)
    try {
      const { db } = await initializeFirebase()
      const now = Timestamp.now().toMillis().toString()
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        tenantId,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
      })
      return docRef.id
    } finally {
      setSaving(false)
    }
  }

  const update = async (id: string, data: Record<string, unknown>) => {
    setSaving(true)
    try {
      const { db } = await initializeFirebase()
      const now = Timestamp.now().toMillis().toString()
      await updateDoc(doc(db, collectionName, id), {
        ...data,
        updatedAt: now,
      })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    setSaving(true)
    try {
      const { db } = await initializeFirebase()
      await deleteDoc(doc(db, collectionName, id))
    } finally {
      setSaving(false)
    }
  }

  const softDelete = async (id: string) => {
    await update(id, { isDeleted: true } as Record<string, unknown>)
  }

  return { create, update, remove, softDelete, saving }
}
