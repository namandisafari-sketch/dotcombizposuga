# 📋 Perfume Inventory Management Setup Guide

## Overview
This guide explains how to set up and manage perfume inventory in your POS system with bottle-size-based pricing for refills and custom mixes.

---

## 🎯 Key Concept: Bottle Size Pricing

### The Challenge
When customers request perfume refills or custom mixes:
- You mix different scents together
- You **cannot measure** the exact ml of each scent used
- You need to charge based on the **bottle size** being filled, not individual scent amounts

### The Solution
**Charge based on the bottle size being refilled**, not the milliliters of each individual scent.

---

## 🔧 Step-by-Step Setup

### Step 1: Add Perfume Department (Admin Only)
1. Go to **Settings** → **Departments** tab
2. Click **"Add New Department"**
3. Enter:
   - **Name**: "Perfumes" (or "Fragrance", "Scents")
   - **Description**: "Perfume and fragrance products"
4. Click **Save**

### Step 2: Add Perfume Products (Admin Only)
1. Go to **Inventory** page
2. Click **"Add Product"** button
3. Fill in the product form:

#### Basic Information
- **Product Name**: e.g., "Ocean Breeze", "Vanilla Dream"
- **Barcode**: Optional (system generates internal barcode if empty)
- **Category**: Select perfume category
- **Department**: Select "Perfumes"
- **Supplier**: Select supplier (optional)
- **Brand**: e.g., "Dior", "Chanel", "Local"

#### Tracking Configuration
- **Tracking Type**: Automatically set to **"Milliliter (for Perfumes)"**
- **Unit**: Enter "ml" or "Bottle"

#### Perfume-Specific Fields
These fields appear when Tracking Type is "Milliliter":

##### Bottle Size (ml) *Required*
- **What it means**: Standard bottle size for this perfume
- **Example**: 100ml, 50ml, 30ml
- **Usage**: This is what you'll select at POS when selling

##### Current Stock (ml)
- **What it means**: Total milliliters in stock
- **Example**: If you have 5 bottles of 100ml each = 500ml
- **Updates automatically** when you make sales

##### Selling Price per ml (UGX) *Required*
- **What it means**: How much you charge per milliliter
- **Example**: 800 UGX per ml
- **Usage**: System calculates total based on bottle size
  - 30ml bottle = 30 × 800 = 24,000 UGX
  - 50ml bottle = 50 × 800 = 40,000 UGX
  - 100ml bottle = 100 × 800 = 80,000 UGX

##### Wholesale Price per Bottle
- **What it means**: Special price for selling whole bottles to wholesalers
- **Example**: 200,000 UGX for a full bottle
- **Usage**: For wholesale customers only

#### Pricing Tiers (Admin Only)
Set different prices for different customer types:
- **Retail Price**: For retail/shop customers
- **Wholesale Price**: For bulk buyers
- **Individual Price**: For walk-in individual customers

#### Cost Price (Admin Only)
- Enter your cost per bottle
- System automatically calculates **cost per ml**
- Displayed as: `Cost per ml: UGX XX.XX`

### Step 3: Save the Product
- Click **"Add Product"**
- System automatically:
  - Sets tracking to milliliter
  - Generates internal barcode if needed
  - Calculates cost per ml

---

## 💰 How Pricing Works

### For Refills & Custom Mixes (Retail & Individual Customers)

**Scenario**: Customer brings a 50ml bottle for refill

1. **Customer Request**: "Mix Ocean Breeze and Vanilla Dream in my 50ml bottle"
2. **What You Do**: 
   - Select the bottle size (50ml)
   - Mix the scents as requested
3. **System Calculates**:
   - 50ml × 800 UGX/ml = **40,000 UGX**
4. **No Need to Track**: How many ml of each scent you used

### Example Price List by Bottle Size

If selling price per ml = 800 UGX:

| Bottle Size | Price Calculation | Total Price |
|-------------|-------------------|-------------|
| 30ml | 30 × 800 | 24,000 UGX |
| 50ml | 50 × 800 | 40,000 UGX |
| 100ml | 100 × 800 | 80,000 UGX |
| 200ml | 200 × 800 | 160,000 UGX |

### For Wholesale Customers

- Use the **Wholesale Price per Bottle** field
- Sell full bottles at the wholesale rate
- Example: 200,000 UGX per bottle (regardless of size mixing)

---

## 📊 Point of Sale (POS) - Selling Perfumes

### At the Sales Page

1. **Add Perfume to Cart**:
   - Search or scan the perfume product
   - Select quantity (how many bottles/fills you're selling)

2. **System Behavior**:
   - Automatically uses selling price per ml
   - Multiplies by bottle size to get total
   - Deducts from stock in ml

3. **For Custom Mixes**:
   - Add multiple perfumes to cart if tracking separately
   - OR use the main perfume category and charge based on bottle size
   - Customer gets refill at bottle-size price

4. **Complete Sale**:
   - Select payment method
   - Print receipt
   - Stock automatically updated in ml

---

## 📦 Stock Management

### How Stock is Tracked

- **Stock Level**: In total milliliters (ml)
- **When You Receive Stock**:
  - Add bottles: e.g., 5 bottles × 100ml = 500ml added
  - Updates Current Stock (ml)

- **When You Make a Sale**:
  - System deducts ml based on bottle size sold
  - Example: Sell 50ml bottle → 50ml deducted from stock

### Reorder Alerts

- Set **Reorder Level** (in ml or bottles)
- System alerts when stock is low
- View alerts in **Advanced Inventory** → **Stock Alerts** tab

---

## 📱 Reports & Analytics

### Track Perfume Sales

1. **Sales Report**:
   - View total perfume sales by date
   - See which scents are popular
   - Track revenue by bottle size

2. **Inventory Report**:
   - Current stock levels in ml
   - Which perfumes need reordering
   - Cost vs. selling price analysis

3. **Customer Preferences**:
   - Track which scents customers prefer
   - Popular mix combinations
   - Repeat customer patterns

---

## ✅ Best Practices

### 1. **Standardize Bottle Sizes**
- Decide on 3-4 standard sizes (e.g., 30ml, 50ml, 100ml)
- Create pricing tiers for each size
- Make it easy for customers to choose

### 2. **Label Everything**
- Use barcode labels for each perfume type
- Include scent name and ml on label
- Makes scanning at POS faster

### 3. **Regular Stock Checks**
- Weekly: Check actual ml vs. system ml
- Monthly: Audit popular scents
- Quarterly: Review pricing strategy

### 4. **Customer Communication**
- Display bottle sizes and prices clearly
- Explain pricing is by bottle size, not scent amount
- Offer samples for new scents

### 5. **Seasonal Adjustments**
- Update prices during promotions
- Use "Seasonal Remark" in settings for special messages
- Track seasonal preferences

---

## 🔐 Security & Permissions

### Admin Users Can:
- Add/edit perfume products
- Set pricing (cost, selling, wholesale)
- View all stock levels
- Manage reorder levels
- Access full reports

### Moderator/Staff Users Can:
- Make sales at POS
- View current prices
- See available stock
- Cannot change prices or add products

---

## 🆘 Troubleshooting

### Issue: "Failed to save product"
**Solution**: 
- Ensure all required fields are filled:
  - Product Name
  - Unit (e.g., "ml")
  - Bottle Size (ml)
  - Selling Price per ml
  - Cost Price (for admin)

### Issue: Stock shows incorrect ml
**Solution**:
- Go to Inventory
- Click "Edit" on the perfume
- Manually adjust "Current Stock (ml)"
- System will sync

### Issue: Price doesn't match bottle size
**Solution**:
- Check "Selling Price per ml"
- Verify bottle size is correct
- Price = Bottle Size × Price per ml

---

## 📞 Need Help?

For additional support:
- Check the **Help & Guide** page in the app
- Contact system administrator
- Review this guide regularly

---

**Last Updated**: November 2025  
**Version**: 1.0
