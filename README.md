# DOTCOM BUZI POS System

**Owned by DOTCOM BROTHERS LTD**  
*Part of creator JAGONIX44's collection*

A comprehensive Point of Sale system built for retail and service management with multi-department support, perfume inventory, mobile money integration, and advanced analytics.

## Features

### Core POS Functionality
- 🛍️ **Sales Management**: Multiple payment methods (Cash, Card, Mobile Money, Credit)
- 📦 **Inventory Management**: Product variants, barcode generation, low stock alerts
- 🖨️ **Receipt & Invoice Printing**: Customizable business settings per department
- 💳 **Payment Tracking**: Detailed transaction history and payment reconciliation

### Department Management
- 🏢 **Multi-Department Isolation**: Strict data separation between departments
- 🔐 **Role-based Access Control**: Admin, Moderator, Cashier, and User roles
- 📊 **Department-Specific Reports**: Sales, expenses, and performance analytics
- 👥 **Staff Management**: User creation, role assignment, and navigation permissions

### Perfume Department
- 🧴 **Perfume Inventory**: Custom pricing per bottle size (ml-based calculations)
- 🌸 **Scent Management**: Track scent mixtures and customer preferences
- 💰 **Dynamic Pricing**: Retail/wholesale pricing with configurable bottle costs
- 📈 **Perfume Analytics**: Revenue tracking, scent popularity, and refill management

### Mobile Money & Agent Management
- 💰 **Agent Operations**: Individual agent accounts with isolated transactions
- 📱 **Multi-Provider Support**: MTN and Airtel money integration
- 💵 **Commission Tracking**: Automated calculation and daily/monthly reports
- 🛍️ **Agent POS**: Dedicated service and product sales interface
- 📊 **Agent Dashboard**: Float balance, cash balance, and earnings tracking

### Financial Management
- 💸 **Credits System**: Interdepartmental money transfers with admin approval
- 🧾 **Expense Tracking**: Department-based expense recording and categorization
- ⚖️ **Reconciliation**: Cash count verification with discrepancy management
- 📈 **Financial Reports**: Comprehensive admin oversight of all departments

### Customer & Appointments
- 👥 **Customer Database**: Contact info, purchase history, and preferences
- 📅 **Appointment Scheduling**: Service bookings with staff assignment
- ✅ **Appointment Checkout**: Service completion and receipt generation
- ❤️ **Customer Preferences**: Favorite scents, services, and payment methods

### Advanced Features
- 🏷️ **Barcode System**: Custom internal barcode generation and printing
- 📊 **Advanced Analytics**: Cross-departmental insights for admins
- 🔄 **Internal Usage**: Track stock used internally by departments
- 📧 **Interdepartmental Inbox**: Communication and credit notifications
- 💾 **Data Backup**: Automated daily backups and export functionality

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI Components**: Shadcn/ui + Tailwind CSS
- **Backend**: PostgreSQL + Edge Functions
- **Authentication**: Secure auth system with RLS policies
- **State Management**: TanStack Query

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database

### Installation

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. Install dependencies:
```sh
npm install
# or
bun install
```

3. Set up environment variables:
Create a `.env` file with your database credentials:
```
VITE_SUPABASE_URL=your-database-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

4. Run the development server:
```sh
npm run dev
# or
bun dev
```

5. Open [http://localhost:8080](http://localhost:8080) in your browser

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── contexts/      # React context providers
├── utils/         # Utility functions
├── integrations/  # Database client
└── lib/          # Helper libraries
```

## Database Setup

This project uses PostgreSQL. You can use:
- **Supabase** (recommended): Free tier with 500MB, easy setup
- **Neon**: Serverless PostgreSQL
- **Your own PostgreSQL server**

### Using Supabase

1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and anon key
4. Update `.env` file with your credentials
5. Run migrations from `supabase/migrations/` folder

## Deployment

### Build for Production

```sh
npm run build
# or
bun run build
```

The build output will be in the `dist/` folder.

### Deploy Options

This project is configured for automatic deployment via GitHub + Vercel:

1. **GitHub Integration**: Changes auto-push to repository
2. **Vercel Auto-Deploy**: Automatic builds on every push
3. **Custom Domain**: Add in Vercel dashboard → Project Settings → Domains

**Current Setup:**
- Repository: `namandisafari-sketch/dotcombiz`
- Auto-deployment: ✅ Enabled
- Build command: `npm run build`
- Output directory: `dist`

## Security

- All sensitive data is protected with Row-Level Security (RLS)
- Department-based access control
- Role-based permissions (Admin, Moderator, User)
- Secure authentication flow

## Environment Variables

Required environment variables:
```
VITE_SUPABASE_URL=your-database-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

## License

© 2025 JAGONIX44. All Rights Reserved.

## Support

Developed by JAGONIX44 - WE CREATE THE FUTURE
