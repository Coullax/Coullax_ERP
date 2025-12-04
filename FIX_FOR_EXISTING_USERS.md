# Quick Fix for Existing Users

If you created your super admin account BEFORE this fix, you need to manually create an employee record. Run this SQL in Supabase:

```sql
-- Replace YOUR_USER_ID with your actual user ID from Supabase Auth
INSERT INTO employees (id, employee_id, joining_date)
VALUES (
  'YOUR_USER_ID',
  'EMP001',
  CURRENT_DATE
)
ON CONFLICT (id) DO NOTHING;
```

To find your user ID:
1. Go to Supabase Dashboard → Authentication → Users
2. Click on your user
3. Copy the User UID
4. Replace `YOUR_USER_ID` in the SQL above
5. Run it in SQL Editor

This will allow you to:
- Create requests
- Mark attendance
- Upload verification documents
- Access all employee features

**Note:** New signups after this fix will automatically create employee records!
