interface ReceiptData {
  receiptNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
    variantName?: string; // Product variant name
    scentCount?: number; // Number of scents mixed (for perfumes)
    scentMixture?: string; // Actual scent mixture names
    packingCost?: number; // Packing material cost for perfumes
    isPerfumeRefill?: boolean;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  date: string;
  cashierName?: string;
  customerName?: string;
  customerPhone?: string;
  departmentName?: string;
  businessInfo: {
    name: string;
    address: string;
    phone: string;
    email?: string;
    logo?: string;
    whatsapp?: string;
    website?: string;
  };
  seasonalRemark?: string;
  qrCodeUrl?: string;
}

export const generateReceiptHTML = (data: ReceiptData): string => {
  const discount = data.subtotal - data.total + (data.tax || 0);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @media print {
          body { margin: 0; padding: 10px; }
          @page { margin: 0; }
        }
        body {
          font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 11px;
          max-width: 300px;
          margin: 0 auto;
          line-height: 1.4;
          background: linear-gradient(to bottom, #fafafa 0%, #ffffff 100%);
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #333; 
          padding-bottom: 10px; 
          margin-bottom: 10px;
          background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
          padding: 12px;
          border-radius: 8px 8px 0 0;
        }
        .logo {
          width: 80px;
          height: 80px;
          margin: 0 auto 8px;
          border-radius: 50%;
          border: 2px solid #333;
          object-fit: cover;
        }
        .business-name { 
          font-weight: bold; 
          font-size: 15px; 
          letter-spacing: 1px;
          margin-bottom: 5px;
          text-transform: uppercase;
          color: #222;
        }
        .info-line { 
          margin: 2px 0; 
          font-size: 10px;
          color: #444;
        }
        .receipt-info { 
          border-bottom: 1px solid #000; 
          padding: 5px 0; 
          margin-bottom: 5px;
          font-size: 10px;
        }
        .separator { 
          border-top: 1px dashed #000; 
          margin: 8px 0;
        }
        .double-separator {
          border-top: 2px solid #000;
          margin: 8px 0;
        }
        .items-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          padding: 3px 0;
          border-bottom: 1px solid #000;
          font-size: 10px;
        }
        .item-row { 
          display: flex; 
          justify-content: space-between; 
          margin: 3px 0;
          font-size: 10px;
        }
        .item-name { 
          flex: 2;
          margin-right: 5px;
        }
        .item-qty { 
          flex: 0 0 30px;
          text-align: center;
        }
        .item-unit {
          flex: 0 0 50px;
          text-align: right;
        }
        .item-total {
          flex: 0 0 60px;
          text-align: right;
        }
        .totals { 
          border-top: 1px solid #000;
          border-bottom: 2px solid #000;
          padding: 5px 0; 
          margin: 5px 0;
        }
        .total-row { 
          display: flex; 
          justify-content: space-between; 
          margin: 2px 0;
          font-size: 11px;
        }
        .total-row.grand { 
          font-weight: bold; 
          font-size: 13px; 
          margin-top: 5px;
          padding-top: 3px;
          border-top: 1px dashed #000;
        }
        .payment-mode {
          text-align: center;
          margin: 5px 0;
          font-size: 11px;
        }
        .customer-info {
          text-align: center;
          border-top: 1px dashed #000;
          padding-top: 5px;
          margin-top: 5px;
          font-size: 10px;
        }
        .footer { 
          text-align: center; 
          font-size: 10px;
          margin-top: 8px;
          line-height: 1.6;
        }
        .footer-thank {
          font-weight: bold;
          margin-bottom: 3px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${data.businessInfo.logo ? `<img src="${data.businessInfo.logo}" alt="Logo" class="logo" />` : ''}
        <div class="business-name">${data.businessInfo.name}</div>
        <div class="info-line">📍 ${data.businessInfo.address}</div>
        <div class="info-line">☎ ${data.businessInfo.phone}</div>
        ${data.businessInfo.email ? `<div class="info-line">✉ ${data.businessInfo.email}</div>` : ''}
      </div>
      
      <div class="receipt-info">
        <div>🧾 Receipt #: ${data.receiptNumber}</div>
        <div>🕓 Date: ${data.date} | Cashier: ${data.cashierName || 'Staff'}</div>
        ${data.departmentName ? `<div>📍 Department: ${data.departmentName}</div>` : ''}
      </div>

      <div class="double-separator"></div>

      <div class="items-header">
        <span style="flex: 2;">Item/Service</span>
        <span style="flex: 0 0 30px; text-align: center;">Qty</span>
        <span style="flex: 0 0 50px; text-align: right;">Unit</span>
        <span style="flex: 0 0 60px; text-align: right;">Total</span>
      </div>
      
      ${data.items.map(item => `
        <div class="item-row">
          <span class="item-name">${item.name}${item.variantName ? ` (${item.variantName})` : ''}</span>
          <span class="item-qty">${item.quantity}</span>
          <span class="item-unit">${item.isPerfumeRefill && item.packingCost ? `${item.packingCost.toLocaleString()}` : item.price.toLocaleString()}</span>
          <span class="item-total">${item.subtotal.toLocaleString()}</span>
        </div>
        ${item.scentMixture ? `
        <div style="font-size: 9px; color: #666; margin-top: 2px; padding-left: 10px; border-left: 2px solid #ddd; margin-left: 5px; padding-top: 2px; padding-bottom: 2px;">
          <div style="font-weight: bold; margin-bottom: 2px;">Scents Mixed:</div>
          ${item.scentMixture.split(' + ').map(scent => `
            <div style="padding-left: 5px;">• ${scent}</div>
          `).join('')}
        </div>
        ` : ''}
        ${item.isPerfumeRefill && item.packingCost ? `
        <div class="item-row" style="font-size: 9px; color: #666; margin-top: -2px;">
          <span class="item-name" style="padding-left: 10px;">└ Packing Material</span>
          <span class="item-qty"></span>
          <span class="item-unit">${item.packingCost.toLocaleString()}</span>
          <span class="item-total"></span>
        </div>
        ` : ''}
      `).join('')}

      <div class="double-separator"></div>
      
      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${data.subtotal.toLocaleString()} UGX</span>
        </div>
        <div class="total-row">
          <span>Discount:</span>
          <span>${discount.toLocaleString()} UGX</span>
        </div>
        <div class="total-row grand">
          <span>TOTAL PAID:</span>
          <span>${data.total.toLocaleString()} UGX</span>
        </div>
      </div>

      <div class="payment-mode">
        Payment Mode: ${(data.paymentMethod || 'N/A').toUpperCase()}
      </div>
      
      ${data.cashierName ? `
        <div style="margin: 5px 0; font-size: 10px; text-align: center;">
          Served by: <strong>${data.cashierName}</strong>
        </div>
      ` : ''}

      ${data.customerName ? `
        <div class="customer-info">
          Customer: ${data.customerName}${data.customerPhone ? ' | ' + data.customerPhone : ''}
        </div>
      ` : ''}

      <div class="separator"></div>
      
      <div class="footer">
        <div class="footer-thank">THANK YOU! Visit again.</div>
        ${data.seasonalRemark ? `<div style="margin: 5px 0; font-weight: bold;">🎉 ${data.seasonalRemark} 🎉</div>` : ''}
        ${data.qrCodeUrl ? `
          <div style="margin: 15px 0; text-align: center; page-break-inside: avoid;">
            <div style="margin-bottom: 8px; font-weight: bold; font-size: 10px;">Scan to connect:</div>
            <img src="${data.qrCodeUrl}" alt="QR Code" style="width: 100px; height: 100px; margin: 0 auto; display: block; border: 2px solid #333; border-radius: 6px; padding: 4px; background: white; print-color-adjust: exact; -webkit-print-color-adjust: exact;" />
            ${data.businessInfo.whatsapp ? `<div style="margin-top: 8px; font-size: 9px; font-weight: 600;">WhatsApp: ${data.businessInfo.whatsapp}</div>` : ''}
            ${data.businessInfo.website ? `<div style="font-size: 9px; margin-top: 2px;">${data.businessInfo.website}</div>` : ''}
          </div>
        ` : `
          <div>Scan to WhatsApp us: 📲</div>
          ${data.businessInfo.whatsapp ? `<div>${data.businessInfo.whatsapp}</div>` : ''}
        `}
      </div>
    </body>
    </html>
  `;
};

export const printReceipt = async (receiptData: ReceiptData, previewOnly: boolean = false): Promise<boolean> => {
  return new Promise((resolve) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    
    if (!printWindow) {
      console.error('Could not open print window');
      resolve(false);
      return;
    }

    printWindow.document.write(generateReceiptHTML(receiptData));
    printWindow.document.close();

    if (previewOnly) {
      resolve(true);
      return;
    }

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.onafterprint = () => {
          printWindow.close();
          resolve(true);
        };
        // Fallback if onafterprint doesn't fire
        setTimeout(() => {
          printWindow.close();
          resolve(true);
        }, 1000);
      }, 250);
    };
  });
};

export const shareViaWhatsApp = async (receiptData: ReceiptData, phoneNumber?: string): Promise<void> => {
  try {
    // Dynamically import html2pdf
    const html2pdf = (await import('html2pdf.js')).default;
    
    // Generate the receipt HTML
    const html = generateReceiptHTML(receiptData);
    
    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    
    // Generate PDF
    const filename = `Receipt_${receiptData.receiptNumber}.pdf`;
    
    await html2pdf()
      .from(container)
      .set({
        margin: 5,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: false },
        jsPDF: { unit: 'mm', format: [80, 200], orientation: 'portrait' }
      })
      .save();
    
    // Cleanup
    document.body.removeChild(container);
    
    // Open WhatsApp with a message prompting to share the downloaded PDF
    const message = `Receipt #${receiptData.receiptNumber} from ${receiptData.businessInfo.name}. Please find the attached PDF receipt.`;
    const encodedMessage = encodeURIComponent(message);
    const url = phoneNumber 
      ? `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;
    
    window.open(url, '_blank');
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    throw new Error('Failed to generate receipt PDF');
  }
};

export const autoPrintReceipt = async (saleId: string, supabase: any): Promise<void> => {
  try {
    // Fetch sale details
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('id', saleId)
      .single();

    if (saleError || !sale) {
      throw new Error('Could not fetch sale details');
    }

    // Fetch department-specific settings if sale has a department
    let settings = null;
    if (sale.department_id) {
      const { data: deptSettings } = await supabase
        .from('department_settings')
        .select('*')
        .eq('department_id', sale.department_id)
        .maybeSingle();
      settings = deptSettings;
    }

    // Fallback to global settings if no department settings found
    if (!settings) {
      const { data: globalSettings } = await supabase
        .from('settings')
        .select('*')
        .maybeSingle();
      settings = globalSettings;
    }

    // Fetch customer info if available
    let customerName, customerPhone;
    if (sale.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('name, phone')
        .eq('id', sale.customer_id)
        .single();
      
      if (customer) {
        customerName = customer.name;
        customerPhone = customer.phone;
      }
    }

    // Generate QR code if WhatsApp number is available
    let qrCodeUrl;
    if (settings?.whatsapp_number) {
      try {
        const QRCode = (await import('qrcode')).default;
        const message = "Hello! I'd like to connect.";
        const whatsappUrl = `https://wa.me/${settings.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
        qrCodeUrl = await QRCode.toDataURL(whatsappUrl, { width: 200, margin: 1 });
      } catch (err) {
        console.error('QR code generation failed:', err);
      }
    }

    const receiptData: ReceiptData = {
      receiptNumber: sale.receipt_number,
      items: sale.sale_items.map((item: any) => ({
        name: item.item_name,
        quantity: item.quantity,
        price: item.unit_price,
        subtotal: item.subtotal,
      })),
      subtotal: sale.subtotal,
      tax: sale.tax || 0,
      total: sale.total,
      paymentMethod: sale.payment_method,
      date: new Date(sale.created_at).toLocaleString('en-GB', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      cashierName: sale.cashier_name,
      customerName,
      customerPhone,
      businessInfo: {
        name: settings?.business_name || 'DOTCOM BROTHERS LTD',
        address: settings?.business_address || 'Kasangati opp Kasangati Police Station',
        phone: settings?.business_phone || '+256745368426',
        whatsapp: settings?.whatsapp_number || '+256745368426',
        website: settings?.website,
      },
      seasonalRemark: settings?.seasonal_remark,
      qrCodeUrl,
    };

    const printed = await printReceipt(receiptData, false);

    if (printed) {
      // Update sale as printed
      await supabase
        .from('sales')
        .update({ 
          printed: true, 
          printed_at: new Date().toISOString() 
        })
        .eq('id', saleId);
    }
  } catch (error) {
    console.error('Auto-print failed:', error);
    throw error;
  }
};
