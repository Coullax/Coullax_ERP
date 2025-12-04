# COULLAX DeskFlow - Setup Guide

## 🚀 Quick Start Guide

### Step 1: Set Up Supabase Project

1. **Go to [Supabase](https://supabase.com)** and sign in
2. **Create a new project**
   - Project name: `coullax-deskflow` (or your choice)
   - Database password: Choose a strong password
   - Region: Select closest to you
   - Wait for project to finish setting up (~2 minutes)

3. **Get your project credentials**
   - Go to **Settings** → **API**
   - Copy the `Project URL` (looks like: `https://xxxxx.supabase.co`)
   - Copy the `anon/public` key (under "Project API keys")

### Step 2: Configure Environment Variables

1. **Create `.env.local` file** in the project root:

```bash
# In c:\ZUshan\coullax\coullax_ERP\.env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

2. **Replace the values** with your actual Supabase credentials

### Step 3: Run the Database Schema

1. **Go to your Supabase project**
2. **Click on "SQL Editor"** in the left sidebar
3. **Click "+ New Query"**
4. **Copy the entire contents** of `supabase/schema.sql`
5. **Paste into the SQL Editor**
6. **Click "Run"** (or press Ctrl+Enter)
7. Wait for it to complete (should see "Success" message)

### Step 4: Create Storage Buckets

1. **Go to Storage** in the left sidebar
2. **Create bucket: `avatars`**
   - Name: `avatars`
   - Public bucket: ✅ **Yes** (check this box)
   - Click "Create bucket"

3. **Create bucket: `documents`**
   - Name: `documents`
   - Public bucket: ❌ **No**
   - Click "Create bucket"

### Step 5: Create Super Admin Account

#### Option A: Using Supabase Dashboard (Recommended)

1. **Go to Authentication** → **Users** in Supabase dashboard
2. **Click "Add user"** → **Create new user**
3. Fill in:
   - Email: `admin@coullax.com` (or your email)
   - Password: Choose a strong password
   - Auto Confirm User: ✅ **Yes** (check this box)
4. **Click "Create user"**
5. **Copy the User ID** (looks like: `123e4567-e89b-12d3-a456-426614174000`)

6. **Go back to SQL Editor**
7. **Run this SQL** to make the user a super admin:

```sql
-- Replace YOUR_USER_ID with the actual user ID you copied
-- Create profile
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  'YOUR_USER_ID',
  'admin@coullax.com',
  'Super Admin',
  'super_admin'
);

-- Create employee record
INSERT INTO employees (id, employee_id, joining_date)
VALUES (
  'YOUR_USER_ID',
  'SA001',
  CURRENT_DATE
);
```

#### Option B: Using Signup Page (Then Upgrade)

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Go to** [http://localhost:3000](http://localhost:3000)

3. **Click "Sign up"**

4. **Fill in the form**:
   - Full Name: Your name
   - Email: Your email
   - Password: Choose a strong password
   - Confirm Password: Same password

5. **Click "Create Account"**

6. **Check your email** for confirmation link (click it)

7. **Go to Supabase SQL Editor** and run:

```sql
-- Replace 'your-email@example.com' with your actual email
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'your-email@example.com';
```

### Step 6: Login

1. **Go to** [http://localhost:3000](http://localhost:3000)
2. **Click "Sign in"** (or you'll be redirected to login)
3. **Enter your credentials**:
   - Email: The email you used
   - Password: The password you set
4. **Click "Sign In"**
5. **You'll be redirected to the dashboard** 🎉

---

## 🎯 Quick Test Checklist

After logging in, you should be able to:

- ✅ See the dashboard with greeting card
- ✅ Navigate using the sidebar
- ✅ Access all menu items (Employee, Admin, Super Admin sections)
- ✅ View your profile at `/profile`
- ✅ Create requests at `/requests`
- ✅ Access admin approvals at `/admin/approvals` (since you're super admin)

---

## 🐛 Troubleshooting

### Error: "Invalid credentials"
- Double-check your email and password
- Make sure you confirmed your email (check spam folder)
- Try resetting your password

### Error: "Cannot find module"
- Run `npm install` to ensure all dependencies are installed
- Restart the dev server

### Error: "supabase is not defined"
- Check that your `.env.local` file exists
- Verify the environment variables are correct
- Restart the dev server after changing `.env.local`

### Dashboard not showing all menu items
- Verify your role is set to `super_admin` in the database
- Run this query to check:
  ```sql
  SELECT id, email, role FROM profiles WHERE email = 'your-email@example.com';
  ```

### Profile page error
- Make sure you have an employee record:
  ```sql
  SELECT * FROM employees WHERE id = 'your-user-id';
  ```
- If missing, create one:
  ```sql
  INSERT INTO employees (id, employee_id, joining_date)
  VALUES ('your-user-id', 'EMP001', CURRENT_DATE);
  ```

---

## 📝 Creating Additional Users

### Create Regular Employee

1. **Employees can self-register** at `/signup`
2. They'll automatically get `employee` role

### Create Admin (Super Admin only)

1. **Go to SQL Editor**
2. **Run this SQL**:

```sql
-- First, create the auth user in Authentication → Users in Supabase dashboard
-- Then run this SQL (replace YOUR_USER_ID and email)

INSERT INTO profiles (id, email, full_name, role)
VALUES (
  'USER_ID_FROM_AUTH',
  'admin@company.com',
  'Admin Name',
  'admin'
);

INSERT INTO employees (id, employee_id, joining_date)
VALUES (
  'USER_ID_FROM_AUTH',
  'ADM001',
  CURRENT_DATE
);
```

---

## 🔐 Security Notes

1. **Change default passwords** in production
2. **Use strong passwords** for all accounts
3. **Enable 2FA** in Supabase dashboard (Settings → Authentication)
4. **Don't commit `.env.local`** to git (it's already in `.gitignore`)
5. **Row Level Security (RLS)** is already enabled on all tables

---

## 🎨 Next Steps

Once logged in:

1. **Update your profile** at `/profile`
   - Upload profile picture
   - Fill in personal details
   - Add education and skills

2. **Create a test request** at `/requests`
   - Try creating a leave request
   - Check the admin approvals page

3. **Explore the admin features** (since you're super admin)
   - Go to `/admin/approvals` to approve requests
   - Create additional users via SQL

4. **Continue with remaining modules**:
   - Attendance Management
   - Employee Verification
   - Analytics Dashboards
   - And more!

---

## 📞 Need Help?

If you encounter any issues:

1. Check the browser console for errors (F12)
2. Check the terminal where `npm run dev` is running
3. Verify your Supabase project is active
4. Ensure all environment variables are set correctly

Happy managing! 🚀
