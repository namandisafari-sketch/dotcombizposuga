export interface SimCardData {
  customerName: string;
  phoneNumber: string;
  registrationDate: string;
  serviceType: string;
  provider: string;
  idType?: string;
  idNumber?: string;
  businessName: string;
  departmentName?: string;
  businessPhone?: string;
  whatsappNumber?: string;
  logoUrl?: string;
  helpCodes?: any;
  warnings?: string[];
  qrCodeUrl?: string;
}

export const printSimCard = (data: SimCardData) => {
  const printWindow = window.open("", "", "width=800,height=600");
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>SIM Card - ${data.phoneNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          @page {
            size: 99mm 77mm;
            margin: 0;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            width: 99mm;
            height: 77mm;
            padding: 4mm;
            background: white;
          }
          
          .card {
            width: 100%;
            height: 100%;
            border: 2px solid #e0e0e0;
            border-radius: 4mm;
            padding: 3mm;
            display: flex;
            flex-direction: column;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2mm;
          }
          
          .card-number {
            font-size: 7pt;
            font-weight: bold;
            color: #333;
          }
          
          .dept-logo {
            max-width: 18mm;
            max-height: 12mm;
            object-fit: contain;
          }
          
          .company-title {
            text-align: center;
            margin-bottom: 3mm;
          }
          
          .company-name {
            font-size: 11pt;
            font-weight: bold;
            color: #000;
            letter-spacing: 0.3pt;
          }
          
          .dept-name {
            font-size: 7pt;
            color: #666;
            margin-top: 0.5mm;
            text-transform: uppercase;
          }
          
          .welcome {
            text-align: center;
            font-size: 13pt;
            font-weight: bold;
            color: #E60000;
            margin: 3mm 0;
          }
          
          .phone-number {
            text-align: center;
            font-size: 9pt;
            font-weight: bold;
            padding: 3mm 2mm;
            margin: 3mm 0 4mm 0;
            border: 1px solid #ddd;
            border-radius: 3mm;
          }
          
          .phone-number-label {
            font-size: 8pt;
            color: #333;
            margin-bottom: 1mm;
          }
          
          .phone-number-value {
            font-size: 14pt;
            color: #000;
            letter-spacing: 0.5pt;
          }
          
          .quick-help {
            margin: 3mm 0;
            padding: 2mm;
            background: #fafafa;
            border-radius: 2mm;
          }
          
          .help-title {
            font-size: 8pt;
            font-weight: bold;
            margin-bottom: 1mm;
            color: #000;
          }
          
          .help-content {
            font-size: 6.5pt;
            line-height: 1.4;
            color: #444;
          }
          
          .footer {
            margin-top: auto;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 2mm;
            padding-top: 2mm;
            border-top: 1px solid #eee;
          }
          
          .footer-left {
            flex: 1;
            font-size: 6pt;
            line-height: 1.5;
            color: #555;
          }
          
          .served-by {
            margin-bottom: 1mm;
            font-weight: 600;
            color: #333;
          }
          
          .dept-contact {
            margin: 0.5mm 0;
            color: #444;
          }
          
          .warning {
            font-weight: bold;
            color: #d00;
            margin: 1mm 0 0.5mm 0;
            font-size: 6pt;
          }
          
          .qr-code {
            width: 15mm;
            height: 15mm;
            flex-shrink: 0;
          }
          
          @media print {
            body {
              background: white;
            }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="card-number">CARD NO. ${data.phoneNumber.slice(-4)}</div>
            ${data.logoUrl ? `<img src="${data.logoUrl}" class="dept-logo" alt="Logo" />` : '<div></div>'}
          </div>
          
          <div class="company-title">
            <div class="company-name">DOTCOM BROTHERS LTD</div>
            ${data.departmentName ? `<div class="dept-name">${data.departmentName}</div>` : ''}
          </div>
          
          <div class="welcome">Welcome to ${data.provider}</div>
          
          <div class="phone-number">
            <div class="phone-number-label">CUSTOMER NUMBER</div>
            <div class="phone-number-value">${data.phoneNumber}</div>
          </div>
          
          ${data.helpCodes ? `
          <div class="quick-help">
            <div class="help-title">QUICK HELP</div>
            <div class="help-content">
              ${data.helpCodes.checkBalance ? `Balance: ${data.helpCodes.checkBalance}<br/>` : ''}
              ${data.helpCodes.mobileMoney ? `Mobile Money: ${data.helpCodes.mobileMoney}<br/>` : ''}
              ${data.helpCodes.customerCare ? `Customer Care: ${data.helpCodes.customerCare}` : ''}
            </div>
          </div>
          ` : ''}
          
          <div class="footer">
            <div class="footer-left">
              <div class="served-by">You were served by DOTCOMBROTHERS LTD on behalf of ${data.departmentName || data.businessName}</div>
              ${data.businessPhone ? `<div class="dept-contact">${data.businessPhone}</div>` : ''}
              ${data.warnings && data.warnings[0] ? `<div class="warning">${data.warnings[0]}</div>` : ''}
            </div>
            ${data.qrCodeUrl ? `<img src="${data.qrCodeUrl}" class="qr-code" alt="QR Code" />` : ''}
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 100);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export const printSimCardBatch = (cards: SimCardData[]) => {
  const printWindow = window.open("", "", "width=800,height=600");
  if (!printWindow) return;

  const cardsPerRow = 2;
  const cardsPerPage = 4;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>SIM Cards Batch Print</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          @page {
            size: A4;
            margin: 10mm;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            background: white;
          }
          
          .page {
            page-break-after: always;
            display: grid;
            grid-template-columns: repeat(2, 99mm);
            grid-template-rows: repeat(2, 77mm);
            gap: 5mm;
          }
          
          .page:last-child {
            page-break-after: auto;
          }
          
          .card {
            width: 99mm;
            height: 77mm;
            border: 2px solid #e0e0e0;
            border-radius: 4mm;
            padding: 3mm;
            display: flex;
            flex-direction: column;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2mm;
          }
          
          .card-number {
            font-size: 7pt;
            font-weight: bold;
            color: #333;
          }
          
          .dept-logo {
            max-width: 18mm;
            max-height: 12mm;
            object-fit: contain;
          }
          
          .company-title {
            text-align: center;
            margin-bottom: 3mm;
          }
          
          .company-name {
            font-size: 11pt;
            font-weight: bold;
            color: #000;
            letter-spacing: 0.3pt;
          }
          
          .dept-name {
            font-size: 7pt;
            color: #666;
            margin-top: 0.5mm;
            text-transform: uppercase;
          }
          
          .welcome {
            text-align: center;
            font-size: 13pt;
            font-weight: bold;
            color: #E60000;
            margin: 3mm 0;
          }
          
          .phone-number {
            text-align: center;
            font-size: 9pt;
            font-weight: bold;
            padding: 3mm 2mm;
            margin: 3mm 0 4mm 0;
            border: 1px solid #ddd;
            border-radius: 3mm;
          }
          
          .phone-number-label {
            font-size: 8pt;
            color: #333;
            margin-bottom: 1mm;
          }
          
          .phone-number-value {
            font-size: 14pt;
            color: #000;
            letter-spacing: 0.5pt;
          }
          
          .quick-help {
            margin: 3mm 0;
            padding: 2mm;
            background: #fafafa;
            border-radius: 2mm;
          }
          
          .help-title {
            font-size: 8pt;
            font-weight: bold;
            margin-bottom: 1mm;
            color: #000;
          }
          
          .help-content {
            font-size: 6.5pt;
            line-height: 1.4;
            color: #444;
          }
          
          .footer {
            margin-top: auto;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 2mm;
            padding-top: 2mm;
            border-top: 1px solid #eee;
          }
          
          .footer-left {
            flex: 1;
            font-size: 6pt;
            line-height: 1.5;
            color: #555;
          }
          
          .served-by {
            margin-bottom: 1mm;
            font-weight: 600;
            color: #333;
          }
          
          .dept-contact {
            margin: 0.5mm 0;
            color: #444;
          }
          
          .warning {
            font-weight: bold;
            color: #d00;
            margin: 1mm 0 0.5mm 0;
            font-size: 6pt;
          }
          
          .qr-code {
            width: 15mm;
            height: 15mm;
            flex-shrink: 0;
          }
          
          @media print {
            body {
              background: white;
            }
          }
        </style>
      </head>
      <body>
        ${cards.map((data, index) => {
          const isNewPage = index % cardsPerPage === 0;
          const isLastCard = index === cards.length - 1;
          
          return `
            ${isNewPage ? '<div class="page">' : ''}
            <div class="card">
              <div class="header">
                <div class="card-number">CARD NO. ${data.phoneNumber.slice(-4)}</div>
                ${data.logoUrl ? `<img src="${data.logoUrl}" class="dept-logo" alt="Logo" />` : '<div></div>'}
              </div>
              
              <div class="company-title">
                <div class="company-name">DOTCOM BROTHERS LTD</div>
                ${data.departmentName ? `<div class="dept-name">${data.departmentName}</div>` : ''}
              </div>
              
              <div class="welcome">Welcome to ${data.provider}</div>
              
              <div class="phone-number">
                <div class="phone-number-label">CUSTOMER NUMBER</div>
                <div class="phone-number-value">${data.phoneNumber}</div>
              </div>
              
              ${data.helpCodes ? `
              <div class="quick-help">
                <div class="help-title">QUICK HELP</div>
                <div class="help-content">
                  ${data.helpCodes.checkBalance ? `Balance: ${data.helpCodes.checkBalance}<br/>` : ''}
                  ${data.helpCodes.mobileMoney ? `Mobile Money: ${data.helpCodes.mobileMoney}<br/>` : ''}
                  ${data.helpCodes.customerCare ? `Customer Care: ${data.helpCodes.customerCare}` : ''}
                </div>
              </div>
              ` : ''}
              
              <div class="footer">
                <div class="footer-left">
                  <div class="served-by">You were served by DOTCOMBROTHERS LTD on behalf of ${data.departmentName || data.businessName}</div>
                  ${data.businessPhone ? `<div class="dept-contact">${data.businessPhone}</div>` : ''}
                  ${data.warnings && data.warnings[0] ? `<div class="warning">${data.warnings[0]}</div>` : ''}
                </div>
                ${data.qrCodeUrl ? `<img src="${data.qrCodeUrl}" class="qr-code" alt="QR Code" />` : ''}
              </div>
            </div>
            ${(index + 1) % cardsPerPage === 0 || isLastCard ? '</div>' : ''}
          `;
        }).join('')}
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 100);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
