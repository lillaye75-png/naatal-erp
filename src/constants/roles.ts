export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  CASHIER: 'CASHIER',
  ACCOUNTANT: 'ACCOUNTANT',
  WAREHOUSE: 'WAREHOUSE',
} as const

export type RoleType = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<RoleType, string> = {
  OWNER: 'Propriétaire',
  ADMIN: 'Administrateur',
  MANAGER: 'Gérant',
  CASHIER: 'Caissier',
  ACCOUNTANT: 'Comptable',
  WAREHOUSE: 'Magasinier',
}
