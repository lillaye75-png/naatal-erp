import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const require = createRequire(import.meta.url)
const { initializeApp, cert, getApps } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, Timestamp } = require('firebase-admin/firestore')

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '..', 'firebase-service-account.json'), 'utf-8')
)

const app = getApps().length === 0
  ? initializeApp({ credential: cert(serviceAccount) })
  : getApps()[0]

const auth = getAuth(app)
const db = getFirestore(app)

const EMAIL = 'admin@naatalerp.com'
const PASSWORD = 'Admin123!'
const BUSINESS_NAME = 'Naatal ERP'
const TENANT_ID = 'super-admin-tenant'

async function main() {
  try {
    let userRecord
    try {
      userRecord = await auth.getUserByEmail(EMAIL)
      console.log(`User already exists: ${userRecord.uid}`)
    } catch {
      userRecord = await auth.createUser({
        email: EMAIL,
        password: PASSWORD,
        displayName: BUSINESS_NAME,
      })
      console.log(`Created user: ${userRecord.uid}`)
    }

    await auth.setCustomUserClaims(userRecord.uid, {
      tenantId: TENANT_ID,
      role: 'SUPER_ADMIN',
    })
    console.log('Custom claims set: tenantId=super-admin-tenant, role=SUPER_ADMIN')

    const tenantRef = db.collection('tenants').doc(TENANT_ID)
    const tenantSnap = await tenantRef.get()
    if (!tenantSnap.exists) {
      await tenantRef.set({
        name: BUSINESS_NAME,
        plan: 'PREMIUM',
        currency: 'XOF',
        country: 'SN',
        logoUrl: '',
        language: 'fr',
        locale: 'fr-SN',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
      console.log('Tenant document created')
    } else {
      console.log('Tenant document already exists')
    }

    const userRef = db.collection('users').doc(userRecord.uid)
    const userSnap = await userRef.get()
    if (!userSnap.exists) {
      await userRef.set({
        email: EMAIL,
        displayName: BUSINESS_NAME,
        phone: '+221000000000',
        tenantId: TENANT_ID,
        roleId: 'SUPER_ADMIN',
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
      console.log('User document created')
    } else {
      console.log('User document already exists')
    }

    const rolesRef = db.collection('roles').doc('SUPER_ADMIN')
    const rolesSnap = await rolesRef.get()
    if (!rolesSnap.exists) {
      await rolesRef.set({
        name: 'Super Admin',
        permissions: ['*'],
        tenantId: TENANT_ID,
        isSystem: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
      console.log('Super admin role created with wildcard permissions')
    }

    console.log('\n--- SUCCESS ---')
    console.log(`Email:    ${EMAIL}`)
    console.log(`Password: ${PASSWORD}`)
    console.log(`Tenant:   ${TENANT_ID}`)
    console.log(`Role:     SUPER_ADMIN`)
  } catch (err) {
    console.error('Error:', err)
  }
}

main()
