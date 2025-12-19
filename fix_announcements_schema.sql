-- Drop the old table that had 'is_active'
DROP TABLE IF EXISTS public.announcements;

-- Create the new table with 'status'
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content text NOT NULL,
  priority text DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  status text DEFAULT 'pending', -- 'pending', 'published'
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
