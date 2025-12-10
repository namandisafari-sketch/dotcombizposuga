import { z } from "zod";

// Centralized email validation schema
export const emailSchema = z.string()
  .trim()
  .toLowerCase()
  .min(5, "Email is too short")
  .max(255, "Email must be less than 255 characters")
  .email("Invalid email format")
  .refine(
    (email) => {
      const [local, domain] = email.split('@');
      if (!local || !domain) return false;
      return (
        local.length <= 64 &&
        domain.length <= 255 &&
        !/\.\./.test(email) &&
        !/^\./.test(local) &&
        !/\.$/.test(local)
      );
    },
    { message: "Invalid email format" }
  );

// Centralized password validation schema
export const passwordSchema = z.string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Customer validation schema
export const customerSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  email: emailSchema.optional().or(z.literal("")).transform((val) => val || undefined),
  phone: z.string()
    .trim()
    .optional()
    .refine((val) => !val || /^\+?[0-9]{10,15}$/.test(val), {
      message: "Invalid phone number format. Use 10-15 digits with optional + prefix"
    })
    .transform((val) => val || undefined),
  address: z.string()
    .max(500, "Address must be less than 500 characters")
    .optional()
    .transform((val) => val || undefined),
});

// Product validation schema
export const productSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Product name is required")
    .max(200, "Product name must be less than 200 characters"),
  selling_price: z.string()
    .transform(val => parseFloat(val))
    .refine(val => !isNaN(val) && val >= 0 && val <= 100000000, {
      message: "Selling price must be between 0 and 100,000,000"
    }),
  cost_price: z.string()
    .transform(val => parseFloat(val))
    .refine(val => !isNaN(val) && val >= 0 && val <= 100000000, {
      message: "Cost price must be between 0 and 100,000,000"
    }),
  current_stock: z.number()
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative")
    .max(1000000, "Stock value too large"),
  reorder_level: z.number()
    .int("Reorder level must be a whole number")
    .min(0, "Reorder level cannot be negative")
    .max(100000, "Reorder level too large"),
  barcode: z.string()
    .trim()
    .max(50, "Barcode must be less than 50 characters")
    .optional()
    .or(z.literal("")),
});

// Reconciliation validation schema
export const reconciliationSchema = z.object({
  cashier_name: z.string()
    .trim()
    .min(1, "Cashier name is required")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .refine(val => {
      const date = new Date(val);
      const now = new Date();
      const minDate = new Date("2020-01-01");
      return date <= now && date >= minDate;
    }, "Date must be between 2020 and today"),
  system_cash: z.string()
    .transform(val => parseFloat(val))
    .refine(val => !isNaN(val) && val >= 0 && val <= 100000000, {
      message: "System cash must be between 0 and 100,000,000"
    }),
  reported_cash: z.string()
    .transform(val => parseFloat(val))
    .refine(val => !isNaN(val) && val >= 0 && val <= 100000000, {
      message: "Reported cash must be between 0 and 100,000,000"
    }),
  notes: z.string()
    .max(500, "Notes must be less than 500 characters")
    .optional()
    .or(z.literal("")),
});

// Expense validation schema
export const expenseSchema = z.object({
  description: z.string()
    .trim()
    .min(3, "Description must be at least 3 characters")
    .max(200, "Description must be less than 200 characters")
    .regex(/^[a-zA-Z0-9\s,.\-()]+$/, "Description contains invalid characters"),
  category: z.string()
    .trim()
    .min(2, "Category must be at least 2 characters")
    .max(50, "Category must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Category must contain only letters and spaces"),
  amount: z.string()
    .transform(val => parseFloat(val))
    .refine(val => !isNaN(val) && val > 0 && val <= 50000000, {
      message: "Amount must be between 1 and 50,000,000"
    }),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .refine(val => {
      const date = new Date(val);
      const now = new Date();
      const minDate = new Date("2020-01-01");
      return date <= now && date >= minDate;
    }, "Date must be between 2020 and today"),
});

// WhatsApp phone number validation
export const whatsappPhoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number. Use format: +256700000000")
  .transform(num => num.replace(/\D/g, ""));
