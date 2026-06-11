<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Naatal ERP Trigger

When the user says **"continue naatalerp"** or **"continue naatal erp"**, immediately check the active todo list and provide a full summary of what's done, what's pending, and any known issues before starting any new work.

## Progress

### v2.0 Week 2 — Done
- **ActivityFeed**: dashboard widget showing last 10 audit_logs with action icons
- **EmptyState**: reusable component with optional icon, title, description, action button
- **Bulk actions**: checkboxes + select-all + bulk delete on customers page, products page
- **Column visibility**: dropdown toggle per table to show/hide columns
  - `src/hooks/useColumnManager.ts` — shared hook
  - `src/components/shared/ColumnVisibilityDropdown.tsx` — UI component
  - Applied to: Products, Customers, Sales, Purchases, Invoices, Expenses, Inventory
- **Column filters**: per-column input row in thead, real-time filtering
  - Applied to: Products, Customers, Sales, Purchases, Invoices, Expenses, Inventory

### v2.0 Week 1 — Done
- **Multi-Branches**: `branches` collection + CRUD page at `/branches` + sidebar link + `branchId` on 6 types
- **Purchase Workflow**: DRAFT → PENDING → APPROVED → PARTIALLY_RECEIVED → RECEIVED → CANCELLED
- **Session Logs**: `session_logs` collection + auto-log on login/logout + viewer at `/settings/sessions`

### Post-MVP Bug Fixes — Done
- CREDIT_NOTE treated as negative revenue (subtracts from totals)
- Firestore transaction reads-before-writes fix
- Order race condition fixed with `runTransaction` + `processedAt` guard
- Stock TRANSFER creates two movements (OUT source, IN destination)
- Cash register report reads `expectedBalance`/`closingAmount`
- Settings backup tab Save button hidden; swallowed errors fixed
- Many other fixes (see full Progress section in this message's first response)

### Build
- `npm run build` passes: 48 routes, 0 errors
- Deploy target: Vercel
