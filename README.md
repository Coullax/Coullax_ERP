# COULLAX DeskFlow - Employee Management Platform

Complete HR & Employee Management SaaS with Next.js 14, Supabase, and Shadcn UI.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   cd c:\ZUshan\coullax\coullax_ERP
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.local.example` to `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Set up the database**
   
   Run the SQL schema in your Supabase SQL editor:
   ```bash
   # Open supabase/schema.sql and execute in Supabase dashboard
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Features

### Core Modules

- **Employee Profile** - Complete profile management with education, skills, inventory
- **Verification** - KYC documents, background checks, bank details
- **Requests System** - 10 types of requests with approval workflows
- **Attendance Management** - Daily/weekly/monthly views, regularization
- **Analytics Dashboards** - Charts for attendance, leave, performance
- **Calendar** - Events, meetings, holidays, leave tracking
- **Notifications** - Real-time with Supabase Realtime
- **Help Center** - FAQ, policies, support
- **Admin Portal** - Employee CRUD, approvals, bulk operations
- **Super Admin Portal** - Admin management, settings, permissions
- **Document Management** - Upload, search, version control
- **Roles & Permissions** - Custom RBAC system
- **Audit Logs** - Complete activity tracking

### User Roles

- **Employee** - Can create account, manage profile, submit requests
- **Admin** - Can create employees, approve requests, manage operations
- **Super Admin** - Can create admins, configure system, access audit logs

## 🏗️ Project Structure

```
coullax_ERP/
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── (dashboard)/     # Protected dashboard pages
│   ├── globals.css      # Global styles
│   └── layout.tsx       # Root layout
├── components/
│   ├── ui/              # Shadcn UI components
│   ├── layout/          # Sidebar, header, layout
│   ├── dashboard/       # Dashboard-specific components
│   └── charts/          # Chart components
├── lib/
│   ├── supabase/        # Supabase client/server setup
│   └── utils.ts         # Utility functions
├── store/               # Zustand state management
├── supabase/
│   └── schema.sql       # Database schema with RLS
└── package.json
```

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **State Management**: Zustand
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Validation**: Zod
- **Forms**: React Hook Form

## 🔐 Authentication

The app uses Supabase Authentication with Row Level Security (RLS) policies enforcing:

- Employees can view/edit their own data
- Admins can manage employees and approve requests
- Super Admins have full system access
- All operations are logged in audit_logs

## 📝 Development Phases

✅ **Phase 1 (Completed)**: Foundation & Auth
- Project setup with Next.js 14
- Supabase integration
- Database schema with RLS
- Authentication (login/signup)
- Dashboard layout
- Core UI components

🔄 **Phase 2 (Next)**: Employee Module
- Profile management
- Verification system
- Document upload

📅 **Future Phases**:
- Requests module
- Attendance system
- Analytics dashboards
- Admin/Super Admin portals

## 🤝 Contributing

This is a private enterprise application. Contact the development team for contribution guidelines.

## 📄 License

Proprietary - COULLAX © 2024

## 🐛 Known Issues

- Theme persistence needs `next-themes` package (will be installed with dependencies)
- Email confirmation requires Supabase email templates configuration
- File upload requires Supabase storage buckets setup

## 📞 Support

For support, contact your system administrator or open an issue in the internal tracker.
