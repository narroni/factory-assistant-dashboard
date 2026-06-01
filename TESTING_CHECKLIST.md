# Factory Assistant Dashboard - Comprehensive Testing Checklist

## Test Credentials

```
ADMIN User:
  Email: admin@narko.local
  Password: password123
  Role: ADMIN
  Access: Full system access

WORKER User:
  Email: worker@narko.local
  Password: password123
  Role: WORKER
  Access: View all data, change status only (Materials & Orders)

VIEWER User:
  Email: viewer@narko.local
  Password: password123
  Role: VIEWER
  Access: Read-only, no modifications
```

---

## 1. AUTHENTICATION & LOGOUT

### ADMIN Tests
- [ ] Login with admin credentials → Dashboard loads
- [ ] Sidebar shows "Administrator" role
- [ ] User profile accessible (Sidebar: click user card)
- [ ] Profile page shows last login timestamp
- [ ] Can change own password on Profile page
- [ ] Logout via API → Redirects to login
- [ ] Login again → Session restored

### WORKER Tests
- [ ] Login with worker credentials → Dashboard loads
- [ ] Sidebar shows "WORKER" role
- [ ] Can access Profile page
- [ ] Logout and verify → Login page appears

### VIEWER Tests
- [ ] Login with viewer credentials → Dashboard loads
- [ ] Sidebar shows "VIEWER" role
- [ ] Can access Profile page
- [ ] Logout and verify → Login page appears

---

## 2. MATERIALS PAGE CRUD

### ADMIN - Create Material
- [ ] Click "Add" button → Modal opens
- [ ] Fill form: Name, Code, Category, Quantity, Unit, Supplier, Status
- [ ] Save → Material appears at top of table
- [ ] Toast notification shows "Material added successfully"
- [ ] Audit Log records CREATE event
- [ ] Verify in database: Material exists with correct data

### ADMIN - Edit Material
- [ ] Click "Edit" on a material → Modal opens with pre-filled data
- [ ] Change Name, Quantity, Status
- [ ] Save → Table updates immediately
- [ ] Toast notification shows "Material updated"
- [ ] Audit Log records UPDATE event with before/after JSON
- [ ] Verify in database: Material updated correctly

### ADMIN - Delete Material
- [ ] Click "Delete" on a material → Confirmation dialog
- [ ] Confirm deletion → Material disappears from table
- [ ] Toast notification shows "Material deleted"
- [ ] Audit Log records DELETE event
- [ ] Verify in database: Material no longer exists

### ADMIN - Status Change
- [ ] Click inline status selector on a material
- [ ] Change status (In Stock → Low Stock → Out of Stock)
- [ ] Status updates immediately in table
- [ ] Audit Log records STATUSCHANGE event
- [ ] KPI card "Low Stock Items" count increases/decreases

### WORKER - Materials CRUD
- [ ] Try to click "Add" button → Disabled or shows permission error
- [ ] Try to click "Edit" button → Disabled or shows permission error
- [ ] Try to click "Delete" button → Disabled or shows permission error
- [ ] Click status selector → Status change works ✓
- [ ] Change a status → Material status updates
- [ ] Audit Log shows change with WORKER as userId

### VIEWER - Materials
- [ ] Can see all materials in table
- [ ] "Add" button is hidden or disabled
- [ ] "Edit" button is hidden or disabled
- [ ] "Delete" button is hidden or disabled
- [ ] Status selector is disabled/hidden
- [ ] Cannot modify anything ✓

---

## 3. PRODUCTS PAGE CRUD

### ADMIN - Create Product
- [ ] Click "Add" button → Modal opens
- [ ] Fill form: Name, Code, Length, Width, Thickness, Weight, Material, Status
- [ ] Save → Product appears at top of list
- [ ] Toast notification shows "Product added successfully"
- [ ] Audit Log records CREATE event
- [ ] Overview page KPI "Total Products" increases

### ADMIN - Edit Product
- [ ] Click "Edit" on a product → Details panel opens
- [ ] Modify fields: Name, dimensions, material
- [ ] Save → Updates visible
- [ ] Toast shows "Product updated"
- [ ] Audit Log records UPDATE event

### ADMIN - Delete Product
- [ ] Click "Delete" on a product → Confirmation
- [ ] Confirm → Product removed
- [ ] Toast shows "Product deleted"
- [ ] Audit Log records DELETE event

### ADMIN - Status Change (Active/Inactive/Prototype)
- [ ] Click status selector
- [ ] Change status → Updates immediately
- [ ] Audit Log records STATUSCHANGE

### WORKER - Products
- [ ] Cannot add, edit, or delete products
- [ ] Status changes disabled/hidden

### VIEWER - Products
- [ ] Read-only access
- [ ] No add/edit/delete buttons visible

---

## 4. ORDERS PAGE CRUD

### ADMIN - Create Order
- [ ] Click "New Order" button → Modal opens
- [ ] Fill: Customer, Product, Quantity, Due Date, Value
- [ ] Save → Order created at top of table
- [ ] Toast: "Order added successfully"
- [ ] Audit Log: CREATE event recorded
- [ ] KPI "Open Orders" count increases

### ADMIN - Edit Order
- [ ] Click "Edit" on order → Modal with current data
- [ ] Modify: Customer, Quantity, Due Date, Value
- [ ] Save → Order updates in table
- [ ] Audit Log: UPDATE event with before/after

### ADMIN - Delete Order
- [ ] Click "Delete" → Confirmation dialog
- [ ] Confirm → Order disappears
- [ ] Toast: "Order deleted"
- [ ] Audit Log: DELETE event

### ADMIN - Order Status Changes
- [ ] Click status selector on order
- [ ] Cycle through: Pending → In Production → Completed → Delayed
- [ ] Each status updates in real-time
- [ ] Audit Log records each STATUSCHANGE
- [ ] KPI cards adjust (Open Orders, In Production count)

### WORKER - Orders
- [ ] Cannot add or delete orders (buttons disabled/hidden)
- [ ] Can change status: Pending → In Production → Completed ✓
- [ ] Status changes record in Audit Log with WORKER userId
- [ ] Cannot edit customer or quantity

### VIEWER - Orders
- [ ] Can view all orders
- [ ] All action buttons hidden/disabled
- [ ] Read-only access only ✓

---

## 5. SUPPLIERS PAGE CRUD

### ADMIN - Create Supplier
- [ ] Click "Add Supplier" → Modal opens
- [ ] Fill: Name, Contact, Email, Phone, Country, Lead Time, Status
- [ ] Save → Supplier added to table
- [ ] Toast: "Supplier added successfully"
- [ ] Audit Log: CREATE event

### ADMIN - Edit Supplier
- [ ] Click "Edit" on supplier → Modal with data
- [ ] Modify fields
- [ ] Save → Updates in table
- [ ] Audit Log: UPDATE event

### ADMIN - Delete Supplier
- [ ] Click "Delete" → Confirmation
- [ ] Confirm → Supplier removed
- [ ] Audit Log: DELETE event

### ADMIN - Status Changes
- [ ] Click status selector (Active/Warning/Inactive)
- [ ] Status updates immediately
- [ ] Audit Log: STATUSCHANGE event

### WORKER & VIEWER
- [ ] No CRUD access to suppliers
- [ ] Cannot change supplier status
- [ ] Read-only or no access

---

## 6. AUDIT LOGS VERIFICATION

### Audit Log Page (Admin Only)
- [ ] Navigate to Settings → Audit Logs
- [ ] VIEWER cannot access (404 or permission error)
- [ ] WORKER cannot access (404 or permission error)

### As ADMIN - Check Audit Logs
- [ ] All CREATE events appear with:
  - [ ] Entity type (Material, Product, Order, Supplier)
  - [ ] Entity ID
  - [ ] Action (CREATE)
  - [ ] User ID (admin user id)
  - [ ] After JSON showing created data
  - [ ] Timestamp

- [ ] All UPDATE events include:
  - [ ] Before JSON (old values)
  - [ ] After JSON (new values)
  - [ ] Action: UPDATE
  - [ ] User ID

- [ ] All DELETE events show:
  - [ ] Before JSON (deleted data)
  - [ ] Action: DELETE

- [ ] All STATUSCHANGE events record:
  - [ ] Before JSON with old status
  - [ ] After JSON with new status

---

## 7. EXPORT FUNCTIONALITY

### CSV Export - Materials Page (All Roles)
- [ ] ADMIN: Click CSV button → File downloads (materials.csv)
- [ ] Open file → Contains Material Name, Code, Category, Quantity, Unit, Supplier, Status
- [ ] Only filtered rows exported (if filter active, only those rows)
- [ ] Proper CSV formatting with quoted fields

### XLSX Export - Products Page (All Roles)
- [ ] Click PDF button → File downloads (products.xlsx)
- [ ] Open in Excel/Numbers → Formatted spreadsheet
- [ ] Columns: Product Name, Code, Length, Width, Thickness, Weight, Volume, Material, Status
- [ ] All rows visible with proper formatting

### PDF Export - Orders Page (All Roles)
- [ ] Click PDF button → File downloads (orders.pdf)
- [ ] Open PDF → Professional formatted table
- [ ] Headers visible
- [ ] All order data present
- [ ] Page breaks work correctly if many orders

### Suppliers Export
- [ ] CSV: Download works, contains all supplier fields
- [ ] XLSX: Download works, proper formatting
- [ ] PDF: Download works, readable table format

### Export Data Accuracy
- [ ] Exports show ONLY filtered/searched data
- [ ] If search active: only matching rows exported
- [ ] If status filter active: only those statuses exported
- [ ] No mock data or placeholders in exports

---

## 8. PAGINATION

### Materials Page
- [ ] Default shows 10 items
- [ ] "Rows per page" selector works (10/25/50)
- [ ] Pagination controls (Prev/Next) enabled/disabled correctly
- [ ] "Showing X–Y of Z" text accurate
- [ ] Clicking page changes data shown
- [ ] Sorting by columns works with pagination

### Products Page
- [ ] Pagination works same as Materials
- [ ] Shows correct item range
- [ ] Next/Prev buttons functional

### Orders Page
- [ ] Pagination functional
- [ ] Item count accurate

### Suppliers Page
- [ ] Pagination functional
- [ ] Item count accurate

---

## 9. NOTIFICATIONS DROPDOWN

### Access Notifications
- [ ] Top right corner: Bell icon visible
- [ ] Click bell → Dropdown opens
- [ ] Shows "Notifications" header
- [ ] Click outside → Dropdown closes

### Notification Content
- [ ] If no alerts: Shows "No new notifications"
- [ ] If alerts exist: Shows list with:
  - [ ] Alert type icon (warning/info)
  - [ ] Title
  - [ ] Description
  - [ ] Color coding (amber for warning, blue for info)

### Real Notifications
- [ ] Create a material with low stock → Check if alert appears
- [ ] Delete all materials → Alert should disappear
- [ ] Notifications update without page refresh

---

## 10. LANGUAGE SWITCHER

### English (EN)
- [ ] Sidebar: Click EN button → Highlighted
- [ ] Navigation labels in English:
  - [ ] "Overview", "Materials", "Products", "Orders", "Suppliers", "Reports", "Settings"
- [ ] Page titles in English
- [ ] Button labels in English (Add, Edit, Delete, Save, Cancel, Search)
- [ ] Status labels in English (In Stock, Low Stock, Out of Stock, etc.)

### German (DE)
- [ ] Sidebar: Click DE button → Highlighted
- [ ] Navigation labels in German:
  - [ ] "Übersicht", "Materialien", "Produkte", "Bestellungen", "Lieferanten", "Berichte", "Einstellungen"
- [ ] Page titles in German
- [ ] Button labels in German (Hinzufügen, Bearbeiten, Löschen, Speichern, Abbrechen, Suchen)
- [ ] Status labels in German (Auf Lager, Niedriger Bestand, Nicht auf Lager, etc.)
- [ ] Language persists on page refresh (localStorage works)

### Language Switch Verification
- [ ] Switch EN → DE → All UI text changes immediately
- [ ] No page reload needed
- [ ] Sidebar updates
- [ ] All buttons update
- [ ] All labels update
- [ ] Status text updates
- [ ] Table headers update (if translated)

---

## 11. PROFILE PAGE

### Access Profile
- [ ] Click user card in Sidebar → Navigates to /profile
- [ ] Page shows user avatar with initials
- [ ] Shows email, role, account status
- [ ] Shows last login date
- [ ] Shows account created date

### Change Password
- [ ] Enter current password (correct)
- [ ] Enter new password (6+ chars)
- [ ] Confirm password (must match)
- [ ] Click "Change Password"
- [ ] Toast: "Password changed successfully"
- [ ] Try login with new password → Works
- [ ] Try login with old password → Fails

### Password Change Validation
- [ ] Wrong current password → Error message
- [ ] Passwords don't match → Error message
- [ ] Password too short → Error message

---

## 12. USER MANAGEMENT (ADMIN ONLY)

### Access User Management
- [ ] ADMIN: Settings page → User Management section visible
- [ ] WORKER: Settings page → User Management hidden
- [ ] VIEWER: Settings page → User Management hidden

### As ADMIN:
- [ ] Users table shows all users with:
  - [ ] Avatar with initials
  - [ ] Name and email
  - [ ] Role (ADMIN, WORKER, VIEWER)
  - [ ] Status (Active, Inactive)
  - [ ] Last Login date
  - [ ] Created date

### Add User
- [ ] Click "Add User" → Modal opens
- [ ] Fill: Name, Email, Role, Password
- [ ] Save → New user appears in table
- [ ] New user has forcePasswordChange=true
- [ ] Toast: "User added successfully"
- [ ] Audit Log: User creation recorded

### Edit User
- [ ] Click "Edit" → Modal with current data
- [ ] Change Name, Email, Role
- [ ] Save → Updates in table
- [ ] Toast: "User updated"

### Reset Password
- [ ] Click "Reset Pwd" → Modal opens
- [ ] Enter new password
- [ ] Save → Password reset
- [ ] forcePasswordChange set to true
- [ ] User must change password on next login
- [ ] Toast: "Password reset successfully"

### Force Password Change Toggle
- [ ] Click "Force" button on a user
- [ ] Button highlights (shows user must change password)
- [ ] Audit Log records the change
- [ ] User login prompts password change

### Deactivate/Activate User
- [ ] Click "Deactivate" on Active user → Confirmation dialog
- [ ] Confirm → Status becomes Inactive
- [ ] Inactive user cannot login
- [ ] Click "Activate" to re-enable
- [ ] Toast confirms action
- [ ] Audit Log records change

---

## 13. SETTINGS PAGE

### Settings Sections
- [ ] Can see layout:
  - [ ] Company Settings (left column)
  - [ ] AI Assistant Settings (left column)
  - [ ] Inventory & Alerts (right column)
  - [ ] Audit & Compliance (right column, admin only)
  - [ ] User Management (full width, admin only)

### Audit Logs Link (Admin Only)
- [ ] ADMIN: "Audit Logs" card visible, clickable
- [ ] WORKER: "Audit Logs" card hidden
- [ ] VIEWER: "Audit Logs" card hidden
- [ ] Click → Navigates to /settings/audit-logs

---

## 14. OVERVIEW PAGE

### KPI Cards (Real Data Only)
- [ ] Total Materials: Shows actual count from DB
- [ ] In Stock: Shows count with breakdown
- [ ] Open Orders: Shows count with in-production breakdown
- [ ] Out of Stock: Shows actual count (0 if none)
- [ ] Low Stock Items: Shows actual count (0 if none)
- [ ] No hardcoded or fake metrics

### Recent Orders Table
- [ ] Shows last 10 orders by creation date
- [ ] All statuses (Pending, In Production, Completed, Delayed)
- [ ] Click "View all" → Goes to /orders page

### System Status Section
- [ ] Shows real alerts:
  - [ ] Out of Stock alert (if any out of stock)
  - [ ] Low Stock alert (if any low stock)
  - [ ] Delayed orders alert (if any delayed)
  - [ ] In Production info (count of in production)
  - [ ] All operational message (if no issues)

### Low Stock Alerts Section
- [ ] Only shows if there are low stock items
- [ ] Lists items with name, stock quantity, unit
- [ ] No fake percentage bars

---

## 15. ROLE-BASED ACCESS CONTROL

### VIEWER Restrictions
- [ ] Cannot add materials
- [ ] Cannot edit materials
- [ ] Cannot delete materials
- [ ] Cannot change material status
- [ ] Cannot add products
- [ ] Cannot edit products
- [ ] Cannot delete products
- [ ] Cannot change product status
- [ ] Cannot add orders
- [ ] Cannot edit orders
- [ ] Cannot delete orders
- [ ] Cannot change order status
- [ ] Cannot add suppliers
- [ ] Cannot edit suppliers
- [ ] Cannot delete suppliers
- [ ] Cannot change supplier status
- [ ] Cannot access Settings
- [ ] Cannot access User Management
- [ ] Cannot access Audit Logs
- [ ] Can view everything as read-only

### WORKER Permissions
- [ ] Cannot add materials
- [ ] Cannot edit materials
- [ ] Cannot delete materials
- [ ] CAN change material status (In Stock ↔ Low Stock ↔ Out of Stock) ✓
- [ ] Cannot add products
- [ ] Cannot edit products
- [ ] Cannot delete products
- [ ] Cannot change product status
- [ ] Cannot add orders
- [ ] Cannot edit orders
- [ ] Cannot delete orders
- [ ] CAN change order status (Pending → In Production → Completed) ✓
- [ ] Cannot add suppliers
- [ ] Cannot edit suppliers
- [ ] Cannot delete suppliers
- [ ] Cannot change supplier status
- [ ] Cannot access Settings
- [ ] Cannot access User Management
- [ ] Cannot access Audit Logs

### ADMIN Permissions
- [ ] Full access to all CRUD operations
- [ ] Can change all statuses
- [ ] Can access Settings
- [ ] Can manage users
- [ ] Can view Audit Logs
- [ ] Can change own password
- [ ] Can manage company settings

---

## 16. DATABASE VERIFICATION

After completing all CRUD tests, verify in PostgreSQL:

```sql
-- Check audit logs recorded all actions
SELECT COUNT(*) FROM audit_logs;
SELECT DISTINCT action FROM audit_logs;
SELECT DISTINCT entity FROM audit_logs;

-- Verify user changes
SELECT id, email, role, status, "lastLoginAt", "forcePasswordChange" FROM users;

-- Verify materials
SELECT COUNT(*) FROM materials WHERE status = 'LOW_STOCK';
SELECT COUNT(*) FROM materials WHERE status = 'OUT_OF_STOCK';

-- Verify orders
SELECT COUNT(*) FROM orders WHERE status = 'PENDING';
SELECT COUNT(*) FROM orders WHERE status = 'IN_PRODUCTION';

-- Check no hardcoded/placeholder data remains
SELECT * FROM materials WHERE name LIKE '%test%' OR name LIKE '%demo%';
```

---

## 17. PERFORMANCE CHECKS

- [ ] Page loads < 3 seconds
- [ ] Table with 100+ items renders smoothly
- [ ] Pagination switches pages instantly
- [ ] Status changes update immediately (< 1 second)
- [ ] No console errors or warnings
- [ ] Language switch instant (no reload)
- [ ] Logout instant redirect
- [ ] File downloads begin immediately

---

## Notes

- All timestamps should be real and correct
- All counts should match database
- No placeholder text like "Loading..." after initial load
- No "mock data" in production
- Audit logs should have complete before/after JSON
- All user actions should be logged
- Permission errors should prevent access clearly
