# Responsive Design Testing Checklist

## Breakpoints to Test
- **Mobile**: 390px (iPhone 12 mini)
- **Tablet**: 768px (iPad)
- **Laptop**: 1024px
- **Desktop**: 1440px

## Pages to Test

### Navigation & Layout
- [ ] Sidebar on mobile (should collapse to icon nav or drawer)
- [ ] Sidebar on tablet (should show labels)
- [ ] Top header responsive (no overflow)
- [ ] Language switcher responsive
- [ ] User profile menu responsive

### Dashboard Pages
- [ ] Overview
  - [ ] KPI cards stack on mobile
  - [ ] Charts readable on all sizes
  - [ ] Links stack cleanly
  
- [ ] Materials
  - [ ] Table horizontal scroll on mobile
  - [ ] Buttons stack in action column
  - [ ] Modal fits mobile screen
  
- [ ] Products
  - [ ] Product grid/table responsive
  - [ ] Detail panel doesn't overflow
  - [ ] Forms fit mobile width
  
- [ ] Orders
  - [ ] Order table horizontal scroll
  - [ ] Line items display cleanly
  - [ ] Order detail panel responsive
  
- [ ] Customers
  - [ ] Customer list responsive
  - [ ] Contact info readable
  - [ ] Order history table scrollable
  
- [ ] Suppliers
  - [ ] Supplier table responsive
  - [ ] Performance metrics readable
  - [ ] Add/edit forms mobile-friendly
  
- [ ] Reports
  - [ ] Report cards wrap cleanly
  - [ ] Export buttons stack
  - [ ] Date ranges fit mobile
  
- [ ] Packaging Calculator
  - [ ] Product selection responsive
  - [ ] Results table horizontal scroll
  - [ ] Container fit analysis readable
  
- [ ] Assistant
  - [ ] Chat history drawer on mobile
  - [ ] Message bubbles fit width
  - [ ] Input field full width
  - [ ] Proposal cards responsive
  - [ ] Buttons stack on mobile
  
- [ ] AI Requests
  - [ ] Request list table scrollable
  - [ ] Detail panel responsive
  - [ ] Approve/Reject buttons mobile-friendly
  - [ ] Status badges readable
  
- [ ] AI History
  - [ ] Chat list responsive
  - [ ] Message preview readable
  - [ ] Pagination controls accessible
  
- [ ] Outputs
  - [ ] Output list table responsive
  - [ ] Download buttons accessible
  - [ ] File info readable
  
- [ ] Settings
  - [ ] User management table scrollable
  - [ ] Settings cards stack on mobile
  - [ ] Forms full-width on mobile
  - [ ] AI Config/Rules/Knowledge responsive
  - [ ] Audit logs table scrollable

### Key Issues to Fix
- [ ] No horizontal overflow on any page
- [ ] All buttons tap-friendly (min 44px height)
- [ ] Form inputs full-width on mobile
- [ ] Modals fit screen with padding
- [ ] Pagination always visible
- [ ] Status badges readable
- [ ] Icons properly sized
- [ ] Spacing consistent across breakpoints

### Known Responsive Patterns Applied
1. Sidebar: Icon-only on mobile, full on larger screens
2. Tables: Horizontal scroll wrapper on mobile
3. Cards: Single column on mobile, grid wrap on larger
4. Forms: Full-width inputs on mobile
5. Buttons: Stack on mobile, flex-wrap on larger
6. Modals: Max-width 90vw on mobile
7. Details: Flex-col on mobile, flex-row on larger
