-- Add show_back_page column to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS show_back_page boolean DEFAULT true;