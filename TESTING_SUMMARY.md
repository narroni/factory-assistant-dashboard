# Testing Summary - Factory Assistant Dashboard

## Overview

This document provides a comprehensive testing summary and quick-start guide for testing the Factory Assistant Dashboard with three different user roles: **ADMIN**, **WORKER**, and **VIEWER**.

## How to Run Tests

### 1. Start the Application
```bash
npm run dev
```
Navigate to `http://localhost:3000`

### 2. Test Credentials

Use these credentials to test each role:

```
ADMIN:
  Email: admin@narko.local
  Password: password123

WORKER:
  Email: worker@narko.local
  Password: password123

VIEWER:
  Email: viewer@narko.local
  Password: password123
```

---

## Quick Test Scenarios by Role

### ✅ ADMIN Testing (15-20 minutes)

1. **Login**: admin@narko.local / password123
2. **Create & Verify**:
   - Add a new Material (Materials page)
   - Add a new Product (Products page)
   - Add a new Order (Orders page)
   - Add a new Supplier (Suppliers page)
3. **Edit & Verify**:
   - Edit the created Material
   - Edit the created Product
   - Edit the created Order
   - Edit the created Supplier
4. **Status Changes**: Change status on each entity
5. **Audit Logs**: Settings → Audit Logs → Verify all changes recorded
6. **Exports**:
   - Materials page: Click CSV button → File downloads
   - Products page: Click PDF button → File downloads
   - Orders page: Click CSV button → File downloads
   - Suppliers page: Click PDF button → File downloads
7. **User Management**: Settings → User Management
   - Add a new user
   - Reset a user's password
   - Deactivate/Activate a user
   - Set force password change on a user
8. **Profile**: Click user card in Sidebar
   - Verify last login date shows
   - Change own password
   - Verify old password no longer works
9. **Language Switching**:
   - Sidebar: Click EN button
   - Verify all text changes to English
   - Sidebar: Click DE button
   - Verify all text changes to German
10. **Pagination**:
    - Materials: Create 25+ materials
    - Change "Rows per page" to 25 → Verify pagination updates
    - Click Next/Prev buttons → Verify correct data shown
11. **Notifications**: Click bell icon → Notification dropdown opens
12. **Delete & Verify**:
    - Delete the created Material
    - Delete the created Product
    - Delete the created Order
    - Delete the created Supplier
13. **Logout**: API menu → Logout
14. **Verify Audit Trail**:
    - Login again as ADMIN
    - Settings → Audit Logs
    - Verify all CREATE, UPDATE, DELETE, STATUSCHANGE events recorded
    - Verify before/after JSON populated for each change

### ✅ WORKER Testing (10-15 minutes)

1. **Login**: worker@narko.local / password123
2. **Navigation**: Verify same pages accessible as ADMIN
3. **Materials Page**:
   - Verify "Add" button is disabled/hidden ✗
   - Verify "Edit" button is disabled/hidden ✗
   - Verify "Delete" button is disabled/hidden ✗
   - Click status selector → Status change works ✓
   - Change a material status (In Stock → Low Stock)
   - Verify in Audit Logs: STATUSCHANGE recorded with WORKER userId
4. **Orders Page**:
   - Verify "New Order" button is disabled/hidden ✗
   - Verify "Edit" button is disabled/hidden ✗
   - Verify "Delete" button is disabled/hidden ✗
   - Click status selector → Status change works ✓
   - Change an order status (Pending → In Production)
   - Verify Audit Logs records change
5. **Products Page**:
   - Verify "Add" button is disabled/hidden ✗
   - Verify "Edit" button is disabled/hidden ✗
   - Verify "Delete" button is disabled/hidden ✗
   - Verify status selector is disabled/hidden ✗
6. **Suppliers Page**:
   - Verify "Add" button is disabled/hidden ✗
   - Verify "Edit" button is disabled/hidden ✗
   - Verify "Delete" button is disabled/hidden ✗
   - Verify status selector is disabled/hidden ✗
7. **Settings**:
   - Verify User Management section is hidden/disabled ✗
   - Verify Audit Logs link is hidden/disabled ✗
8. **Exports**:
   - All export buttons work (CSV/PDF/XLSX) ✓
   - Files download successfully
9. **Profile**:
   - Can view own profile ✓
   - Can change own password ✓
10. **Logout**

### ✅ VIEWER Testing (10-15 minutes)

1. **Login**: viewer@narko.local / password123
2. **Navigation**: Can access all pages (read-only)
3. **Materials Page**:
   - Can see all materials ✓
   - "Add" button hidden/disabled ✗
   - "Edit" button hidden/disabled ✗
   - "Delete" button hidden/disabled ✗
   - Status selector hidden/disabled ✗
4. **Products Page**:
   - Can see all products ✓
   - No modification buttons visible ✗
5. **Orders Page**:
   - Can see all orders ✓
   - No modification buttons visible ✗
6. **Suppliers Page**:
   - Can see all suppliers ✓
   - No modification buttons visible ✗
7. **Settings**:
   - Can view company settings (read-only) ✓
   - User Management section hidden/disabled ✗
   - Audit Logs link hidden/disabled ✗
8. **Exports**:
   - Export buttons work (CSV/PDF/XLSX) ✓
   - Files download successfully
9. **Profile**:
   - Can view own profile ✓
   - Can change own password ✓
10. **Audit Logs**: Try to access /settings/audit-logs → 404 or permission denied
11. **Logout**

---

## Detailed Feature Verification Checklist

### Authentication
- [ ] Admin login successful
- [ ] Worker login successful
- [ ] Viewer login successful
- [ ] Invalid credentials show error
- [ ] Logout works for all roles
- [ ] Session persists across page refresh
- [ ] Expired session redirects to login

### CRUD Operations (ADMIN)

#### Materials
- [ ] Create: Form opens → Fill fields → Save → Appears at top of table with toast notification
- [ ] Read: Table displays all materials with correct fields (Name, Code, Category, Quantity, Unit, Supplier, Status)
- [ ] Update: Edit button → Modal pre-fills → Modify fields → Save → Table updates with toast
- [ ] Delete: Delete button → Confirmation → Removed from table with toast
- [ ] Status Change: Inline selector → Pick new status → Updates immediately

#### Products
- [ ] Create: Similar flow as Materials
- [ ] Read: Master-detail view shows product list and details
- [ ] Update: Details panel editable
- [ ] Delete: Confirmation removes product
- [ ] Status Change: Active/Inactive/Prototype selector works

#### Orders
- [ ] Create: Modal form → Fill customer, product, qty, date, value → Save
- [ ] Read: Table shows order details with status colors
- [ ] Update: Edit button → Modal → Modify → Save
- [ ] Delete: Confirmation removes order
- [ ] Status Change: Pending → In Production → Completed → Delayed

#### Suppliers
- [ ] Create: Form includes lead time and materials list
- [ ] Read: Table displays all supplier details
- [ ] Update: Edit preserves materials and other fields
- [ ] Delete: Removes supplier
- [ ] Status Change: Active/Warning/Inactive selector

### Audit Logging
- [ ] Every CREATE action logged
  - [ ] Entity type recorded
  - [ ] Entity ID recorded
  - [ ] User ID recorded (creator)
  - [ ] After JSON shows new data
  - [ ] Timestamp accurate
- [ ] Every UPDATE action logged
  - [ ] Before JSON shows old data
  - [ ] After JSON shows new data
  - [ ] Field changes visible in diff
  - [ ] User ID recorded
- [ ] Every DELETE action logged
  - [ ] Before JSON shows deleted data
  - [ ] Entity removed from after JSON
  - [ ] User ID recorded
- [ ] Every STATUSCHANGE action logged
  - [ ] Old status in before JSON
  - [ ] New status in after JSON
  - [ ] User ID recorded
- [ ] All logs accessible in Settings → Audit Logs (ADMIN only)
- [ ] WORKER and VIEWER cannot access Audit Logs

### Exports
- [ ] CSV export includes all filtered columns
- [ ] XLSX export has proper formatting with column widths
- [ ] PDF export readable with headers and data
- [ ] Export respects active filters (if search/filter active, only those rows)
- [ ] File naming correct (materials.csv, products.xlsx, orders.pdf, suppliers.csv)
- [ ] No mock data in exports
- [ ] All data types formatted correctly (currency, decimals, dates)

### Pagination
- [ ] Default page size 10
- [ ] Can change to 25, 50 items per page
- [ ] Page selector works (Next/Prev disabled on first/last page)
- [ ] Showing "X–Y of Z" text accurate
- [ ] Filters applied before pagination
- [ ] Searches applied before pagination

### Notifications
- [ ] Bell icon visible in top header
- [ ] Click bell → Dropdown appears
- [ ] Click outside → Dropdown closes
- [ ] Empty state: "No new notifications" message
- [ ] With alerts: Shows alert type icon, title, description
- [ ] Real alerts fetch from /api/alerts endpoint
- [ ] Alerts update without page refresh

### Language Switching
- [ ] EN/DE toggle buttons in sidebar
- [ ] Clicking EN → All text becomes English
  - [ ] Navigation: Overview, Materials, Products, Orders, Suppliers, Reports, Settings
  - [ ] Buttons: Add, Edit, Delete, Save, Cancel, Search
  - [ ] Status labels: In Stock, Low Stock, Out of Stock, etc.
  - [ ] KPI labels updated
  - [ ] Table headers updated
- [ ] Clicking DE → All text becomes German
  - [ ] Navigation: Übersicht, Materialien, Produkte, Bestellungen, Lieferanten, Berichte, Einstellungen
  - [ ] Buttons: Hinzufügen, Bearbeiten, Löschen, Speichern, Abbrechen, Suchen
  - [ ] Status: Auf Lager, Niedriger Bestand, Nicht auf Lager, etc.
- [ ] No page reload needed
- [ ] Selection persists in localStorage
- [ ] All pages/modals/dropdowns translate

### Profile Page
- [ ] Accessible via user card in sidebar
- [ ] Shows user avatar with name initials
- [ ] Shows email
- [ ] Shows role badge
- [ ] Shows account status (Active/Inactive)
- [ ] Shows last login date (or "Never" if first login)
- [ ] Shows account creation date
- [ ] Password change form works with validation
  - [ ] Current password required
  - [ ] New password min 6 chars
  - [ ] Passwords must match
  - [ ] Correct current password needed
  - [ ] Old password no longer works after change
  - [ ] New password allows login

### User Management (ADMIN only)
- [ ] Settings page shows User Management section
- [ ] Users table shows Name, Email, Role, Status, Last Login, Created, Actions
- [ ] Add User button opens form
  - [ ] Name, Email, Role, Password fields
  - [ ] New user appears in table
  - [ ] New user has forcePasswordChange=true
- [ ] Edit button opens pre-filled form
  - [ ] Can change Name, Email, Role
  - [ ] Cannot change password (use Reset Pwd instead)
  - [ ] Saves correctly
- [ ] Reset Pwd button opens dialog
  - [ ] Enter new password
  - [ ] Sets forcePasswordChange=true
  - [ ] User must change on login
- [ ] Force Password Change button toggles
  - [ ] Shows which users must change password
  - [ ] Updates immediately
  - [ ] Audit log records change
- [ ] Deactivate/Activate button
  - [ ] Shows confirmation dialog
  - [ ] Changes status in table
  - [ ] Inactive user cannot login
  - [ ] Can re-activate
  - [ ] Audit log records change

### Role-Based Access Control

#### VIEWER (Read-Only)
- [ ] Cannot add any entity
- [ ] Cannot edit any entity
- [ ] Cannot delete any entity
- [ ] Cannot change any status
- [ ] Cannot access Settings page
- [ ] Cannot access User Management
- [ ] Cannot access Audit Logs
- [ ] Can view all pages as read-only
- [ ] Can download exports
- [ ] Can change own password
- [ ] Can view own profile

#### WORKER (Limited Write)
- [ ] Cannot add/edit/delete Materials
- [ ] CAN change Material status (In Stock ↔ Low Stock ↔ Out of Stock)
- [ ] Cannot add/edit/delete Products
- [ ] Cannot change Product status
- [ ] Cannot add/edit/delete Orders
- [ ] CAN change Order status (Pending → In Production → Completed)
- [ ] Cannot add/edit/delete Suppliers
- [ ] Cannot change Supplier status
- [ ] Cannot access Settings
- [ ] Cannot access User Management
- [ ] Cannot access Audit Logs
- [ ] Can download exports
- [ ] Can change own password
- [ ] Can view own profile
- [ ] All status changes logged in Audit Logs with WORKER userId

#### ADMIN (Full Access)
- [ ] Can add/edit/delete any entity
- [ ] Can change any status
- [ ] Can access Settings
- [ ] Can manage users (add, edit, reset password, deactivate/activate, force password change)
- [ ] Can view Audit Logs
- [ ] Can view all user details (including last login, forcePasswordChange flag)
- [ ] Can change own password
- [ ] Can view own profile

### Overview Page
- [ ] All KPI data is real (from PostgreSQL)
  - [ ] Total Materials count accurate
  - [ ] In Stock count accurate
  - [ ] Low Stock count accurate
  - [ ] Out of Stock count accurate
  - [ ] Open Orders count accurate
  - [ ] In Production count accurate
- [ ] Recent Orders table
  - [ ] Shows last 10 orders
  - [ ] All statuses present
  - [ ] No hardcoded data
- [ ] System Status section
  - [ ] Shows out of stock alert if any
  - [ ] Shows low stock alert if any
  - [ ] Shows delayed orders alert if any
  - [ ] Shows in production info if any
  - [ ] Shows all operational if no issues
- [ ] Low Stock Alerts section
  - [ ] Only shows if low stock items exist
  - [ ] Lists correct items with quantities
  - [ ] No fake percentage bars
- [ ] No placeholder values visible

### Database Verification
After comprehensive testing, verify in PostgreSQL:

```sql
-- Audit logs recorded
SELECT COUNT(*) FROM audit_logs;
SELECT DISTINCT action FROM audit_logs; -- Should include: CREATE, UPDATE, DELETE

-- Users table
SELECT id, email, role, status, "lastLoginAt", "forcePasswordChange" FROM users;

-- Material statuses
SELECT status, COUNT(*) FROM materials GROUP BY status;

-- Orders
SELECT status, COUNT(*) FROM orders GROUP BY status;

-- No hardcoded test data
SELECT COUNT(*) FROM materials WHERE name LIKE '%test%';
SELECT COUNT(*) FROM products WHERE name LIKE '%demo%';
```

---

## Known Test Data

### Pre-existing Users
- Admin: admin@narko.local
- Worker: worker@narko.local
- Viewer: viewer@narko.local

### Pre-existing Sample Data
- 10+ Materials with various statuses
- 10 Products with mixed statuses
- Multiple Orders in different states
- 10+ Suppliers

---

## Test Environment Setup

### Requirements
- PostgreSQL running on localhost:5432
- Database named `factory_dashboard`
- Tables created via Prisma migrations

### Reset Database (if needed)
```bash
# Drop all data and reinit
npx prisma migrate reset

# This will:
# - Delete existing database
# - Recreate schema
# - Run all migrations
# - Seed test data (if seed script exists)
```

---

## Success Criteria

A successful test pass includes:

1. ✅ All CRUD operations work for ADMIN
2. ✅ All status changes work and are logged
3. ✅ WORKER can only change allowed statuses
4. ✅ VIEWER cannot modify anything
5. ✅ Audit logs record all changes with complete data
6. ✅ Exports download with correct data
7. ✅ Pagination works across all pages
8. ✅ Notifications display real data
9. ✅ Language switching updates all UI text
10. ✅ User management works correctly
11. ✅ Profile password change works
12. ✅ All overview metrics are real database values
13. ✅ No console errors or warnings
14. ✅ No hardcoded or placeholder data visible
15. ✅ Build passes with 0 TypeScript errors

---

## Notes

- Tests should be done in this order: Create → Read → Update → Status → Audit → Delete
- Each role should be tested completely before switching users
- Logout between role changes
- Watch browser console for any errors
- Check network tab for failed API calls
- Verify timestamps match current time
- Confirm all counts match database query results
