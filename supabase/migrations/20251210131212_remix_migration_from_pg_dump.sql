CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'manager',
    'cashier',
    'staff'
);


--
-- Name: credit_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.credit_status AS ENUM (
    'pending',
    'approved',
    'partial',
    'settled',
    'rejected'
);


--
-- Name: expense_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.expense_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: internal_usage_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.internal_usage_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'card',
    'mobile_money',
    'credit'
);


--
-- Name: reconciliation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reconciliation_status AS ENUM (
    'pending',
    'completed',
    'discrepancy'
);


--
-- Name: sale_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sale_status AS ENUM (
    'completed',
    'voided',
    'pending'
);


--
-- Name: tracking_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tracking_type AS ENUM (
    'quantity',
    'ml'
);


--
-- Name: get_user_department(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_department(_user_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT department_id FROM public.user_roles WHERE user_id = _user_id
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff');
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    department_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    type text DEFAULT 'product'::text
);


--
-- Name: credits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    department_id uuid,
    sale_id uuid,
    amount numeric(10,2) DEFAULT 0 NOT NULL,
    paid_amount numeric(10,2) DEFAULT 0,
    status public.credit_status DEFAULT 'pending'::public.credit_status,
    due_date date,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    from_department_id uuid,
    to_department_id uuid,
    purpose text,
    transaction_type text DEFAULT 'customer_credit'::text,
    settlement_status text DEFAULT 'unsettled'::text,
    approved_at timestamp with time zone,
    approved_by uuid
);


--
-- Name: customer_credit_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_credit_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    department_id uuid,
    sale_id uuid,
    transaction_type text DEFAULT 'credit'::text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    balance_after numeric DEFAULT 0,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    department_id uuid,
    preferred_scents text[],
    preferred_bottle_sizes text[],
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    department_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    outstanding_balance numeric DEFAULT 0,
    credit_limit numeric DEFAULT 0,
    balance numeric DEFAULT 0,
    last_payment_reminder_sent timestamp with time zone,
    payment_reminder_count integer DEFAULT 0
);


--
-- Name: data_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    data_amount numeric DEFAULT 0 NOT NULL,
    data_unit text DEFAULT 'MB'::text NOT NULL,
    price numeric DEFAULT 0 NOT NULL,
    validity_period text DEFAULT 'daily'::text NOT NULL,
    is_active boolean DEFAULT true,
    department_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: department_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.department_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid,
    low_stock_threshold integer DEFAULT 5,
    enable_notifications boolean DEFAULT true,
    notification_email text,
    settings_json jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    seasonal_remark text
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_perfume_department boolean DEFAULT false,
    is_mobile_money boolean DEFAULT false
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid,
    description text NOT NULL,
    amount numeric(10,2) DEFAULT 0 NOT NULL,
    category text,
    status public.expense_status DEFAULT 'pending'::public.expense_status,
    approved_by uuid,
    created_by uuid,
    expense_date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: inbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    department_id uuid,
    subject text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: interdepartmental_inbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interdepartmental_inbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_department_id uuid,
    to_department_id uuid,
    credit_id uuid,
    subject text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: internal_stock_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.internal_stock_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid,
    product_id uuid,
    quantity numeric DEFAULT 0 NOT NULL,
    ml_quantity numeric,
    reason text NOT NULL,
    notes text,
    status text DEFAULT 'pending'::text,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: landing_page_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.landing_page_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_key text NOT NULL,
    title text,
    content text,
    image_url text,
    settings_json jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    is_visible boolean DEFAULT true,
    order_index integer DEFAULT 0
);


--
-- Name: perfume_scents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perfume_scents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    department_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    name text NOT NULL,
    sku text,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    stock integer DEFAULT 0,
    ml_size numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    variant_name text,
    color text,
    size text
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    sku text,
    barcode text,
    category_id uuid,
    department_id uuid,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    cost_price numeric(10,2) DEFAULT 0,
    stock integer DEFAULT 0,
    min_stock integer DEFAULT 5,
    tracking_type public.tracking_type DEFAULT 'quantity'::public.tracking_type,
    total_ml numeric(10,2) DEFAULT 0,
    image_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    brand text,
    unit text,
    base_unit text,
    quantity_per_unit integer DEFAULT 1,
    volume_unit text,
    allow_custom_price boolean DEFAULT false,
    min_price numeric DEFAULT 0,
    max_price numeric DEFAULT 0,
    supplier_id uuid,
    wholesale_price numeric DEFAULT 0,
    retail_price numeric DEFAULT 0,
    is_bundle boolean DEFAULT false,
    bottle_size_ml numeric DEFAULT 0,
    cost_per_ml numeric DEFAULT 0,
    wholesale_price_per_ml numeric DEFAULT 0,
    retail_price_per_ml numeric DEFAULT 0,
    imei text,
    serial_number text
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    avatar_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: reconciliations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconciliations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid,
    cashier_name text NOT NULL,
    date date NOT NULL,
    system_cash numeric DEFAULT 0 NOT NULL,
    reported_cash numeric DEFAULT 0 NOT NULL,
    discrepancy numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    product_id uuid,
    variant_id uuid,
    service_id uuid,
    name text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    ml_amount numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    item_name text,
    scent_mixture text,
    customer_type text,
    price_per_ml numeric
);


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_number text NOT NULL,
    customer_id uuid,
    department_id uuid,
    cashier_id uuid,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    discount numeric(10,2) DEFAULT 0,
    tax numeric(10,2) DEFAULT 0,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    payment_method public.payment_method DEFAULT 'cash'::public.payment_method,
    status public.sale_status DEFAULT 'completed'::public.sale_status,
    void_reason text,
    voided_by uuid,
    voided_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    receipt_number text,
    cashier_name text,
    is_loan boolean DEFAULT false,
    amount_paid numeric DEFAULT 0,
    remarks text
);


--
-- Name: sensitive_service_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sensitive_service_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid,
    service_type text DEFAULT 'sim_registration'::text NOT NULL,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    customer_id_type text DEFAULT 'national_id'::text,
    customer_id_number text,
    customer_address text,
    registered_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: service_showcase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_showcase (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    image_url text,
    price text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    is_visible boolean DEFAULT true,
    is_featured boolean DEFAULT false
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    duration_minutes integer,
    department_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    category_id uuid,
    base_price numeric DEFAULT 0,
    material_cost numeric DEFAULT 0,
    is_negotiable boolean DEFAULT true
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid,
    business_name text,
    logo_url text,
    currency text DEFAULT 'UGX'::text,
    tax_rate numeric(5,2) DEFAULT 0,
    receipt_footer text,
    settings_json jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    business_address text,
    business_phone text,
    business_email text,
    whatsapp_number text,
    website text,
    seasonal_remark text,
    admin_email text
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact_person text,
    phone text,
    email text,
    address text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: suspended_revenue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suspended_revenue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid,
    cashier_name text NOT NULL,
    date date NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    reason text,
    investigation_notes text,
    status text DEFAULT 'pending'::text,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'staff'::public.app_role NOT NULL,
    department_id uuid,
    nav_permissions text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: credits credits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits
    ADD CONSTRAINT credits_pkey PRIMARY KEY (id);


--
-- Name: customer_credit_transactions customer_credit_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_credit_transactions
    ADD CONSTRAINT customer_credit_transactions_pkey PRIMARY KEY (id);


--
-- Name: customer_preferences customer_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_preferences
    ADD CONSTRAINT customer_preferences_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: data_packages data_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_packages
    ADD CONSTRAINT data_packages_pkey PRIMARY KEY (id);


--
-- Name: department_settings department_settings_department_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_settings
    ADD CONSTRAINT department_settings_department_id_key UNIQUE (department_id);


--
-- Name: department_settings department_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_settings
    ADD CONSTRAINT department_settings_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: inbox inbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbox
    ADD CONSTRAINT inbox_pkey PRIMARY KEY (id);


--
-- Name: interdepartmental_inbox interdepartmental_inbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interdepartmental_inbox
    ADD CONSTRAINT interdepartmental_inbox_pkey PRIMARY KEY (id);


--
-- Name: internal_stock_usage internal_stock_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_stock_usage
    ADD CONSTRAINT internal_stock_usage_pkey PRIMARY KEY (id);


--
-- Name: landing_page_content landing_page_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_page_content
    ADD CONSTRAINT landing_page_content_pkey PRIMARY KEY (id);


--
-- Name: landing_page_content landing_page_content_section_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_page_content
    ADD CONSTRAINT landing_page_content_section_key_key UNIQUE (section_key);


--
-- Name: perfume_scents perfume_scents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfume_scents
    ADD CONSTRAINT perfume_scents_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: reconciliations reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliations
    ADD CONSTRAINT reconciliations_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: sensitive_service_registrations sensitive_service_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensitive_service_registrations
    ADD CONSTRAINT sensitive_service_registrations_pkey PRIMARY KEY (id);


--
-- Name: service_showcase service_showcase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_showcase
    ADD CONSTRAINT service_showcase_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: settings settings_department_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_department_id_key UNIQUE (department_id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: suspended_revenue suspended_revenue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspended_revenue
    ADD CONSTRAINT suspended_revenue_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);


--
-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: departments update_departments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: settings update_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: categories categories_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: credits credits_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits
    ADD CONSTRAINT credits_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: credits credits_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits
    ADD CONSTRAINT credits_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: credits credits_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits
    ADD CONSTRAINT credits_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: credits credits_from_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits
    ADD CONSTRAINT credits_from_department_id_fkey FOREIGN KEY (from_department_id) REFERENCES public.departments(id);


--
-- Name: credits credits_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits
    ADD CONSTRAINT credits_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;


--
-- Name: credits credits_to_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits
    ADD CONSTRAINT credits_to_department_id_fkey FOREIGN KEY (to_department_id) REFERENCES public.departments(id);


--
-- Name: customer_credit_transactions customer_credit_transactions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_credit_transactions
    ADD CONSTRAINT customer_credit_transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_credit_transactions customer_credit_transactions_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_credit_transactions
    ADD CONSTRAINT customer_credit_transactions_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: customer_credit_transactions customer_credit_transactions_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_credit_transactions
    ADD CONSTRAINT customer_credit_transactions_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id);


--
-- Name: customer_preferences customer_preferences_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_preferences
    ADD CONSTRAINT customer_preferences_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_preferences customer_preferences_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_preferences
    ADD CONSTRAINT customer_preferences_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: customers customers_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: data_packages data_packages_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_packages
    ADD CONSTRAINT data_packages_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: department_settings department_settings_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_settings
    ADD CONSTRAINT department_settings_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: expenses expenses_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: inbox inbox_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbox
    ADD CONSTRAINT inbox_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: inbox inbox_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbox
    ADD CONSTRAINT inbox_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: interdepartmental_inbox interdepartmental_inbox_credit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interdepartmental_inbox
    ADD CONSTRAINT interdepartmental_inbox_credit_id_fkey FOREIGN KEY (credit_id) REFERENCES public.credits(id);


--
-- Name: interdepartmental_inbox interdepartmental_inbox_from_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interdepartmental_inbox
    ADD CONSTRAINT interdepartmental_inbox_from_department_id_fkey FOREIGN KEY (from_department_id) REFERENCES public.departments(id);


--
-- Name: interdepartmental_inbox interdepartmental_inbox_to_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interdepartmental_inbox
    ADD CONSTRAINT interdepartmental_inbox_to_department_id_fkey FOREIGN KEY (to_department_id) REFERENCES public.departments(id);


--
-- Name: internal_stock_usage internal_stock_usage_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_stock_usage
    ADD CONSTRAINT internal_stock_usage_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: internal_stock_usage internal_stock_usage_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_stock_usage
    ADD CONSTRAINT internal_stock_usage_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: perfume_scents perfume_scents_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfume_scents
    ADD CONSTRAINT perfume_scents_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: products products_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: products products_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reconciliations reconciliations_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliations
    ADD CONSTRAINT reconciliations_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: sale_items sale_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: sale_items sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sale_items sale_items_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: sale_items sale_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;


--
-- Name: sales sales_cashier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_cashier_id_fkey FOREIGN KEY (cashier_id) REFERENCES auth.users(id);


--
-- Name: sales sales_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: sales sales_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: sales sales_voided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES auth.users(id);


--
-- Name: sensitive_service_registrations sensitive_service_registrations_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensitive_service_registrations
    ADD CONSTRAINT sensitive_service_registrations_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: services services_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: services services_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: settings settings_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: suspended_revenue suspended_revenue_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspended_revenue
    ADD CONSTRAINT suspended_revenue_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: department_settings Admins can manage department settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage department settings" ON public.department_settings USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: departments Admins can manage departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage departments" ON public.departments TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: landing_page_content Admins can manage landing page; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage landing page" ON public.landing_page_content TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: service_showcase Admins can manage service showcase; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage service showcase" ON public.service_showcase TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: settings Admins can manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage settings" ON public.settings TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: categories Categories viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Categories viewable by authenticated" ON public.categories FOR SELECT TO authenticated USING (true);


--
-- Name: credits Credits viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Credits viewable by authenticated" ON public.credits FOR SELECT TO authenticated USING (true);


--
-- Name: customer_credit_transactions Customer credit transactions viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customer credit transactions viewable by authenticated" ON public.customer_credit_transactions FOR SELECT USING (true);


--
-- Name: customer_preferences Customer preferences viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customer preferences viewable by authenticated" ON public.customer_preferences FOR SELECT USING (true);


--
-- Name: customers Customers viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers viewable by authenticated" ON public.customers FOR SELECT TO authenticated USING (true);


--
-- Name: data_packages Data packages viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Data packages viewable by authenticated" ON public.data_packages FOR SELECT TO authenticated USING (true);


--
-- Name: department_settings Department settings viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Department settings viewable by authenticated" ON public.department_settings FOR SELECT USING (true);


--
-- Name: departments Departments viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Departments viewable by authenticated" ON public.departments FOR SELECT TO authenticated USING (true);


--
-- Name: expenses Expenses viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Expenses viewable by authenticated" ON public.expenses FOR SELECT TO authenticated USING (true);


--
-- Name: interdepartmental_inbox Interdepartmental inbox viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Interdepartmental inbox viewable by authenticated" ON public.interdepartmental_inbox FOR SELECT USING (true);


--
-- Name: internal_stock_usage Internal stock usage viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Internal stock usage viewable by authenticated" ON public.internal_stock_usage FOR SELECT USING (true);


--
-- Name: landing_page_content Landing page viewable by all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Landing page viewable by all" ON public.landing_page_content FOR SELECT USING (true);


--
-- Name: perfume_scents Perfume scents viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Perfume scents viewable by authenticated" ON public.perfume_scents FOR SELECT TO authenticated USING (true);


--
-- Name: product_variants Product variants viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Product variants viewable by authenticated" ON public.product_variants FOR SELECT TO authenticated USING (true);


--
-- Name: products Products viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Products viewable by authenticated" ON public.products FOR SELECT TO authenticated USING (true);


--
-- Name: profiles Profiles viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: reconciliations Reconciliations viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Reconciliations viewable by authenticated" ON public.reconciliations FOR SELECT USING (true);


--
-- Name: sensitive_service_registrations Registrations viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Registrations viewable by authenticated" ON public.sensitive_service_registrations FOR SELECT TO authenticated USING (true);


--
-- Name: sale_items Sale items viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sale items viewable by authenticated" ON public.sale_items FOR SELECT TO authenticated USING (true);


--
-- Name: sales Sales viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sales viewable by authenticated" ON public.sales FOR SELECT TO authenticated USING (true);


--
-- Name: service_showcase Service showcase viewable by all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service showcase viewable by all" ON public.service_showcase FOR SELECT USING (true);


--
-- Name: services Services viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Services viewable by authenticated" ON public.services FOR SELECT TO authenticated USING (true);


--
-- Name: settings Settings viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Settings viewable by authenticated" ON public.settings FOR SELECT TO authenticated USING (true);


--
-- Name: sales Staff can create sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: categories Staff can manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage categories" ON public.categories TO authenticated USING (true);


--
-- Name: credits Staff can manage credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage credits" ON public.credits TO authenticated USING (true);


--
-- Name: customer_credit_transactions Staff can manage customer credit transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage customer credit transactions" ON public.customer_credit_transactions USING (true);


--
-- Name: customer_preferences Staff can manage customer preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage customer preferences" ON public.customer_preferences USING (true);


--
-- Name: customers Staff can manage customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage customers" ON public.customers TO authenticated USING (true);


--
-- Name: data_packages Staff can manage data packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage data packages" ON public.data_packages TO authenticated USING (true);


--
-- Name: expenses Staff can manage expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage expenses" ON public.expenses TO authenticated USING (true);


--
-- Name: inbox Staff can manage inbox; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage inbox" ON public.inbox TO authenticated USING (true);


--
-- Name: interdepartmental_inbox Staff can manage interdepartmental inbox; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage interdepartmental inbox" ON public.interdepartmental_inbox USING (true);


--
-- Name: internal_stock_usage Staff can manage internal stock usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage internal stock usage" ON public.internal_stock_usage USING (true);


--
-- Name: perfume_scents Staff can manage perfume scents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage perfume scents" ON public.perfume_scents TO authenticated USING (true);


--
-- Name: product_variants Staff can manage product variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage product variants" ON public.product_variants TO authenticated USING (true);


--
-- Name: products Staff can manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage products" ON public.products TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR (department_id = public.get_user_department(auth.uid()))));


--
-- Name: reconciliations Staff can manage reconciliations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage reconciliations" ON public.reconciliations USING (true);


--
-- Name: sensitive_service_registrations Staff can manage registrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage registrations" ON public.sensitive_service_registrations TO authenticated USING (true);


--
-- Name: sale_items Staff can manage sale items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage sale items" ON public.sale_items TO authenticated USING (true);


--
-- Name: services Staff can manage services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage services" ON public.services TO authenticated USING (true);


--
-- Name: suppliers Staff can manage suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage suppliers" ON public.suppliers USING (true);


--
-- Name: suspended_revenue Staff can manage suspended revenue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage suspended revenue" ON public.suspended_revenue USING (true);


--
-- Name: sales Staff can update sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update sales" ON public.sales FOR UPDATE TO authenticated USING (true);


--
-- Name: suppliers Suppliers viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suppliers viewable by authenticated" ON public.suppliers FOR SELECT USING (true);


--
-- Name: suspended_revenue Suspended revenue viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Suspended revenue viewable by authenticated" ON public.suspended_revenue FOR SELECT USING (true);


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid()));


--
-- Name: inbox Users can view own inbox; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own inbox" ON public.inbox FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: user_roles Users can view own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: credits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_credit_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_credit_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: data_packages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_packages ENABLE ROW LEVEL SECURITY;

--
-- Name: department_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.department_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: inbox; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inbox ENABLE ROW LEVEL SECURITY;

--
-- Name: interdepartmental_inbox; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.interdepartmental_inbox ENABLE ROW LEVEL SECURITY;

--
-- Name: internal_stock_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.internal_stock_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: landing_page_content; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.landing_page_content ENABLE ROW LEVEL SECURITY;

--
-- Name: perfume_scents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.perfume_scents ENABLE ROW LEVEL SECURITY;

--
-- Name: product_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: reconciliations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;

--
-- Name: sale_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

--
-- Name: sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

--
-- Name: sensitive_service_registrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sensitive_service_registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: service_showcase; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.service_showcase ENABLE ROW LEVEL SECURITY;

--
-- Name: services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: suspended_revenue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suspended_revenue ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


