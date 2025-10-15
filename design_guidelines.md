# IT Service SaaS Application - Design Guidelines

## Design Approach: Design System-Based

**Selected System**: Linear + Material Design Hybrid
**Justification**: This IT service platform is utility-focused with information-dense content (tickets, employee data, client records). The application prioritizes efficiency, learnability, and data clarity over visual experimentation. Linear's clean aesthetic combined with Material Design's proven enterprise patterns provides the optimal foundation.

**Key Design Principles**:
- Clarity over decoration: Every element serves a functional purpose
- Scannable information hierarchy: Critical ticket data visible at a glance
- Consistent interaction patterns: Predictable behavior across all user roles
- Professional trust: Visual design that inspires confidence in IT operations

---

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary)**:
- Background Base: 222 14% 8%
- Surface Elevated: 222 14% 12%
- Border Subtle: 222 10% 20%
- Text Primary: 210 20% 98%
- Text Secondary: 215 15% 70%

**Brand Colors**:
- Primary (Actions): 217 91% 60% (Professional blue)
- Success (Resolved): 142 71% 45% (Green)
- Warning (In Progress): 38 92% 50% (Amber)
- Error (High Priority): 0 84% 60% (Red)
- Info (Medium Priority): 199 89% 48% (Cyan)

**Light Mode**:
- Background: 0 0% 100%
- Surface: 210 20% 98%
- Border: 214 12% 88%
- Text Primary: 222 14% 12%
- Text Secondary: 215 15% 45%

### B. Typography

**Font Families**:
- Primary: 'Inter' (Google Fonts) - All UI elements
- Monospace: 'JetBrains Mono' - Ticket numbers, technical data

**Type Scale**:
- Display (h1): 2.5rem / 700 / -0.02em
- Heading (h2): 1.875rem / 600 / -0.01em
- Subheading (h3): 1.25rem / 600 / 0
- Body Large: 1rem / 400 / 0
- Body: 0.875rem / 400 / 0
- Caption: 0.75rem / 400 / 0.01em

### C. Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16
- Micro spacing (gaps, padding): 2, 4
- Component spacing: 6, 8
- Section spacing: 12, 16
- Layout margins: 8, 12, 16

**Grid Structure**:
- Dashboard layouts: 12-column grid
- Card layouts: 2-4 columns (responsive)
- Form layouts: Single column, max-w-2xl
- Table layouts: Full width with horizontal scroll

### D. Component Library

**Navigation**:
- Top navbar: Fixed, h-16, with role indicator and notifications
- Sidebar: Collapsible, w-64, with active state highlighting (primary color with 10% opacity background)
- Breadcrumbs: For deep navigation in admin sections

**Data Display**:
- Ticket Cards: Rounded-lg border, p-6, with status badge (top-right), priority indicator (left border, 4px), ticket number (monospace), and timestamp
- Status Badges: Rounded-full px-3 py-1, subtle background with colored text
- Data Tables: Striped rows, sticky header, sortable columns, row hover state
- Stats Cards: Grid layout, icon + number + label, with subtle gradient background

**Forms**:
- Input Fields: Rounded-md border-2, focus:ring-2, consistent height (h-10)
- Text Areas: Min h-32 for descriptions
- Select Dropdowns: Custom styled with chevron icon
- File Upload: Drag-and-drop zone with upload progress indicator
- Priority Selector: Radio buttons with color-coded options

**Interactive Elements**:
- Primary Button: bg-primary, rounded-md, px-6 py-2.5, font-medium
- Secondary Button: border-2, rounded-md, bg-transparent
- Icon Buttons: Square (w-10 h-10), rounded-md, for actions
- Floating Action Button: Fixed bottom-right for quick ticket creation

**Feedback Elements**:
- Toast Notifications: Top-right, slide-in animation, auto-dismiss
- Loading States: Skeleton screens for tables/cards, spinner for actions
- Empty States: Centered icon + message + CTA button

**Ticket-Specific Components**:
- Ticket Timeline: Vertical line with status checkpoints
- Comment Thread: Nested replies with user avatars
- Attachment Previews: Grid of thumbnails with file type indicators
- SLA Progress Bar: Color-coded based on time remaining

### E. Animations

**Minimal Motion** (performance priority):
- Page transitions: 150ms ease-out fade
- Dropdown/modal: 200ms ease-out scale + fade
- Hover states: No animation, instant color change
- Loading spinners: CSS animation for pending states only

---

## Role-Specific Dashboard Layouts

**Client Portal**:
- Hero section with ticket creation CTA
- Dashboard grid: Total tickets / Open / Resolved (3-column)
- Recent tickets table below stats
- Quick actions sidebar (raise ticket, view knowledge base)

**Employee Dashboard**:
- Kanban board layout: Assigned / In Progress / Completed columns
- Ticket cards with drag-and-drop (visual only, not functional priority)
- Filters bar: Priority, Category, Date range
- Ticket detail modal with tabbed interface (Details / Comments / History)

**Admin Dashboard**:
- Overview stats in 4-column grid
- Dual-pane layout: Employee list (left) / Ticket queue (right)
- Bulk action toolbar above tables
- Settings access in top navbar

---

## Images

**Usage**: Minimal imagery, focus on data and functionality
- Employee/Client Avatars: Circular, 40px, with fallback initials
- Empty State Illustrations: Simple line art for "No tickets found" states
- Onboarding Screens: Light illustrations showing platform features (optional for first-time users)

**No hero images** - This is a dashboard application, not a marketing site. All screens prioritize immediate access to functionality and data.