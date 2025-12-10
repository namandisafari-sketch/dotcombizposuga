-- Complete Database Setup for dotcom_buzi_pos
-- Run this file with: psql -U dotcom_app -d dotcom_buzi_pos -f setup-all-tables.sql

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'cashier', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABLES
-- =============================================

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_mobile_money BOOLEAN NOT NULL DEFAULT false,
  is_perfume_department BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (user profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  department_id UUID REFERENCES departments(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User credentials table (for self-hosted auth)
CREATE TABLE IF NOT EXISTS user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- User navigation permissions table
CREATE TABLE IF NOT EXISTS user_nav_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nav_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  barcode TEXT,
  internal_barcode TEXT,
  brand TEXT,
  unit TEXT NOT NULL,
  cost_price NUMERIC NOT NULL,
  selling_price NUMERIC NOT NULL,
  current_stock INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  quantity_per_unit INTEGER DEFAULT 1,
  tracking_type TEXT DEFAULT 'unit',
  volume_unit TEXT,
  bottle_size_ml NUMERIC,
  current_stock_ml NUMERIC DEFAULT 0,
  cost_per_ml NUMERIC,
  retail_price_per_ml NUMERIC DEFAULT 0,
  wholesale_price_per_ml NUMERIC DEFAULT 0,
  selling_price_per_ml NUMERIC,
  wholesale_price_per_bottle NUMERIC,
  serial_number TEXT,
  imei TEXT,
  is_bundle BOOLEAN DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  allow_custom_price BOOLEAN DEFAULT false,
  min_price NUMERIC,
  max_price NUMERIC,
  pricing_tiers JSONB DEFAULT '{"retail": null, "wholesale": null, "individual": null}'::jsonb,
  category_id UUID REFERENCES categories(id),
  department_id UUID REFERENCES departments(id),
  supplier_id UUID REFERENCES suppliers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  color TEXT,
  size TEXT,
  sku TEXT,
  barcode TEXT,
  cost_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  cost_price_adjustment NUMERIC DEFAULT 0,
  price_adjustment NUMERIC DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER DEFAULT 5,
  allow_custom_price BOOLEAN DEFAULT false,
  min_price NUMERIC,
  max_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock alerts table
CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  alert_type TEXT NOT NULL,
  current_stock INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  account_type TEXT DEFAULT 'prepaid',
  balance NUMERIC DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  credit_limit NUMERIC DEFAULT 0,
  department_id UUID REFERENCES departments(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer preferences table
CREATE TABLE IF NOT EXISTS customer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE UNIQUE,
  preferred_services TEXT[],
  preferred_bottle_sizes INTEGER[] DEFAULT '{}',
  preferred_payment_method TEXT,
  favorite_scent_mixtures JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC NOT NULL,
  material_cost NUMERIC,
  is_negotiable BOOLEAN DEFAULT false,
  category_id UUID REFERENCES categories(id),
  department_id UUID REFERENCES departments(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL,
  invoice_number TEXT,
  is_invoice BOOLEAN DEFAULT false,
  customer_id UUID REFERENCES customers(id),
  department_id UUID REFERENCES departments(id),
  cashier_name TEXT,
  subtotal NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL,
  change_amount NUMERIC DEFAULT 0,
  payment_method TEXT NOT NULL,
  currency TEXT DEFAULT 'UGX',
  status TEXT DEFAULT 'completed',
  remarks TEXT,
  voided_by UUID,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sale items table
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  service_id UUID REFERENCES services(id),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  customer_type TEXT,
  scent_mixture TEXT,
  bottle_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id),
  payment_method TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference_number TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reconciliations table
CREATE TABLE IF NOT EXISTS reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  cashier_name TEXT NOT NULL,
  system_cash NUMERIC NOT NULL,
  reported_cash NUMERIC NOT NULL,
  difference NUMERIC NOT NULL,
  explanation TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  department_id UUID REFERENCES departments(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suspended revenue table
CREATE TABLE IF NOT EXISTS suspended_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  cashier_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT,
  reconciliation_id UUID REFERENCES reconciliations(id),
  status TEXT NOT NULL DEFAULT 'pending',
  investigation_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  department_id UUID REFERENCES departments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  department_id UUID REFERENCES departments(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Internal stock usage table
CREATE TABLE IF NOT EXISTS internal_stock_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  department_id UUID NOT NULL REFERENCES departments(id),
  quantity INTEGER NOT NULL,
  unit_value NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC NOT NULL DEFAULT 0,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'recorded',
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  service_id UUID REFERENCES services(id),
  appointment_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  assigned_staff TEXT,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credits table
CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL,
  purpose TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  from_department_id UUID REFERENCES departments(id),
  to_department_id UUID REFERENCES departments(id),
  from_person TEXT,
  to_person TEXT,
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  settlement_status TEXT DEFAULT 'pending',
  settlement_due_date DATE,
  settled_by UUID,
  settled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interdepartmental inbox table
CREATE TABLE IF NOT EXISTS interdepartmental_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_department_id UUID REFERENCES departments(id),
  to_department_id UUID REFERENCES departments(id),
  credit_id UUID REFERENCES credits(id),
  created_by UUID NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_by UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mobile money transactions table
CREATE TABLE IF NOT EXISTS mobile_money_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  provider TEXT,
  reference_number TEXT,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  customer_number TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  processed_by TEXT,
  department_id UUID REFERENCES departments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Mobile money payments table
CREATE TABLE IF NOT EXISTS mobile_money_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id),
  provider TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  status_message TEXT,
  transaction_reference TEXT,
  external_reference TEXT,
  payment_initiated_at TIMESTAMPTZ DEFAULT NOW(),
  payment_completed_at TIMESTAMPTZ,
  response JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  department_id UUID REFERENCES departments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mobile money settings table
CREATE TABLE IF NOT EXISTS mobile_money_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  environment TEXT DEFAULT 'sandbox',
  mtn_api_user TEXT,
  mtn_api_key TEXT,
  mtn_subscription_key TEXT,
  airtel_client_id TEXT,
  airtel_client_secret TEXT,
  department_id UUID REFERENCES departments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perfume scents table
CREATE TABLE IF NOT EXISTS perfume_scents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_out_of_stock BOOLEAN DEFAULT false,
  flagged_by UUID,
  flagged_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perfume pricing config table
CREATE TABLE IF NOT EXISTS perfume_pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id),
  retail_price_per_ml NUMERIC NOT NULL DEFAULT 800,
  wholesale_price_per_ml NUMERIC NOT NULL DEFAULT 400,
  bottle_cost_config JSONB NOT NULL DEFAULT '{"ranges": [{"max": 10, "min": 0, "cost": 300}, {"max": 30, "min": 11, "cost": 500}, {"max": 50, "min": 31, "cost": 1000}, {"max": 100, "min": 51, "cost": 1500}, {"max": 200, "min": 101, "cost": 2000}, {"max": 999999, "min": 201, "cost": 3000}]}'::jsonb,
  packing_material_cost NUMERIC NOT NULL DEFAULT 200,
  additional_charge_type TEXT NOT NULL DEFAULT 'percentage',
  additional_charge_value NUMERIC NOT NULL DEFAULT 10,
  retail_bottle_pricing JSONB DEFAULT '{"sizes": [{"ml": 10, "cost": 5000, "price": 8000}, {"ml": 15, "cost": 7000, "price": 12000}, {"ml": 20, "cost": 9000, "price": 16000}, {"ml": 25, "cost": 11000, "price": 20000}, {"ml": 30, "cost": 13000, "price": 24000}, {"ml": 50, "cost": 20000, "price": 40000}, {"ml": 100, "cost": 35000, "price": 80000}]}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sensitive service registrations table
CREATE TABLE IF NOT EXISTS sensitive_service_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_id_type TEXT,
  customer_id_number TEXT,
  customer_address TEXT,
  customer_photo_url TEXT,
  id_document_url TEXT,
  additional_details JSONB DEFAULT '{}'::jsonb,
  registered_by UUID,
  department_id UUID REFERENCES departments(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL DEFAULT 'DOTCOM BIZ',
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT,
  admin_email TEXT,
  whatsapp_number TEXT,
  website TEXT,
  logo_url TEXT,
  seasonal_remark TEXT,
  currency TEXT DEFAULT 'UGX',
  exchange_rates JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Department settings table
CREATE TABLE IF NOT EXISTS department_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) UNIQUE,
  business_name TEXT,
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT,
  whatsapp_number TEXT,
  website TEXT,
  logo_url TEXT,
  seasonal_remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff performance table
CREATE TABLE IF NOT EXISTS staff_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  total_sales NUMERIC,
  total_transactions INTEGER,
  customer_interactions INTEGER,
  services_provided INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Landing page content table
CREATE TABLE IF NOT EXISTS landing_page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  content TEXT,
  button_text TEXT,
  button_link TEXT,
  image_url TEXT,
  is_visible BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service showcase table
CREATE TABLE IF NOT EXISTS service_showcase (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  features TEXT[],
  is_featured BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demo mode settings table
CREATE TABLE IF NOT EXISTS demo_mode_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_reset_enabled BOOLEAN NOT NULL DEFAULT true,
  backup_before_reset BOOLEAN NOT NULL DEFAULT true,
  last_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demo mode backups table
CREATE TABLE IF NOT EXISTS demo_mode_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sales_data JSONB,
  sale_items_data JSONB,
  reconciliations_data JSONB,
  expenses_data JSONB,
  suspended_revenue_data JSONB,
  internal_usage_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_user_credentials_email ON user_credentials(email);
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_products_department_id ON products(department_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_barcode ON product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_sales_department_id ON sales(department_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_customers_department_id ON customers(department_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  receipt_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM sales
  WHERE receipt_number LIKE 'RCP%';
  
  receipt_num := 'RCP' || LPAD(next_number::TEXT, 6, '0');
  RETURN receipt_num;
END;
$$ LANGUAGE plpgsql;

-- Function to generate internal barcode
CREATE OR REPLACE FUNCTION generate_internal_barcode()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  barcode_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(internal_barcode FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM products
  WHERE internal_barcode LIKE 'INT%';
  
  barcode_num := 'INT' || LPAD(next_number::TEXT, 8, '0');
  RETURN barcode_num;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user_credentials updated_at
CREATE OR REPLACE FUNCTION update_user_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS trigger_update_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for products updated_at
DROP TRIGGER IF EXISTS trigger_update_products_updated_at ON products;
CREATE TRIGGER trigger_update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for product_variants updated_at
DROP TRIGGER IF EXISTS trigger_update_product_variants_updated_at ON product_variants;
CREATE TRIGGER trigger_update_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_credentials updated_at
DROP TRIGGER IF EXISTS trigger_update_user_credentials_updated_at ON user_credentials;
CREATE TRIGGER trigger_update_user_credentials_updated_at
  BEFORE UPDATE ON user_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_user_credentials_updated_at();

-- Trigger for suppliers updated_at
DROP TRIGGER IF EXISTS trigger_update_suppliers_updated_at ON suppliers;
CREATE TRIGGER trigger_update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for internal_stock_usage updated_at
DROP TRIGGER IF EXISTS trigger_update_internal_usage_updated_at ON internal_stock_usage;
CREATE TRIGGER trigger_update_internal_usage_updated_at
  BEFORE UPDATE ON internal_stock_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for customer_preferences updated_at
DROP TRIGGER IF EXISTS trigger_update_customer_preferences_updated_at ON customer_preferences;
CREATE TRIGGER trigger_update_customer_preferences_updated_at
  BEFORE UPDATE ON customer_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for appointments updated_at
DROP TRIGGER IF EXISTS trigger_update_appointments_updated_at ON appointments;
CREATE TRIGGER trigger_update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default settings
INSERT INTO settings (business_name, business_address, business_phone, whatsapp_number)
VALUES ('DOTCOM BIZ', 'Kasangati opp Kasangati Police Station', '+256745368426', '+256745368426')
ON CONFLICT DO NOTHING;

-- Insert CONTAINER category
INSERT INTO categories (name, type)
VALUES ('CONTAINER', 'product')
ON CONFLICT DO NOTHING;

-- Grant permissions to dotcom_app user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dotcom_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dotcom_app;
GRANT USAGE ON SCHEMA public TO dotcom_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO dotcom_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO dotcom_app;

COMMIT;
