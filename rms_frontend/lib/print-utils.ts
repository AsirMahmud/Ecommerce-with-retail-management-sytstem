import { formatCurrency } from "@/lib/utils";

export interface PrintableSaleItem {
  id?: number | string;
  product?: { name?: string; sku?: string };
  name?: string;
  size?: string;
  color?: string;
  quantity: number;
  price: number;
  total?: number;
}

export interface PrintableSale {
  id?: string | number;
  invoice_number?: string;
  date?: string;
  customer?: {
    first_name?: string;
    last_name?: string;
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  } | null;
  customer_phone?: string | null;
  items?: PrintableSaleItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  total: number;
  amount_paid?: number;
  amount_due?: number;
  payment_method?: string;
  status?: string;
}

export function printThermalReceipt(sale: PrintableSale) {
  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) {
    alert("Please allow popups to print receipts.");
    return;
  }

  const invoiceNo = sale.invoice_number || `RS-${sale.id || Date.now()}`;
  const customerName = sale.customer
    ? sale.customer.name || `${sale.customer.first_name || ""} ${sale.customer.last_name || ""}`.trim()
    : "Walk-in Customer";
  const customerPhone = sale.customer_phone || sale.customer?.phone || "N/A";
  const saleDate = (sale.date ? new Date(sale.date) : new Date()).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const itemsHtml = (sale.items || [])
    .map((item) => {
      const name = item.product?.name || item.name || "Item";
      const variant = [item.size, item.color].filter(Boolean).join(" / ");
      const qty = item.quantity;
      const unitPrice = item.price;
      const itemTotal = item.total !== undefined ? item.total : qty * unitPrice;
      return `
        <div style="margin-bottom: 6px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; font-weight: 600;">
            <span>${name}</span>
            <span>${formatCurrency(itemTotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #444;">
            <span>${qty} x ${formatCurrency(unitPrice)} ${variant ? `(${variant})` : ""}</span>
          </div>
        </div>
      `;
    })
    .join("");

  const subtotal = sale.subtotal ?? sale.total;
  const discount = sale.discount || 0;
  const tax = sale.tax || 0;
  const total = sale.total;
  const paid = sale.amount_paid ?? total;
  const due = sale.amount_due || 0;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt - ${invoiceNo}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
            width: 76mm;
            margin: 0 auto;
            padding: 8px 6px;
            color: #111;
            line-height: 1.35;
          }
          .center { text-align: center; }
          .store-name { font-size: 18px; font-weight: 900; letter-spacing: 0.5px; margin-bottom: 2px; }
          .store-sub { font-size: 11px; color: #444; }
          .divider { border-bottom: 1px dashed #777; margin: 8px 0; }
          .double-divider { border-bottom: 2px solid #111; margin: 8px 0; }
          .info-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }
          .tot-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 3px; }
          .grand-total { font-size: 16px; font-weight: 900; margin: 6px 0; }
          .footer-note { font-size: 11px; text-align: center; color: #555; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="store-name">RAW STITCH</div>
          <div class="store-sub">Premium Clothing & Lifestyle</div>
          <div class="store-sub">Kapasia, Gazipur, Bangladesh</div>
          <div class="store-sub">Hotline: 01338869901 | rawstitch.com.bd</div>
        </div>

        <div class="divider"></div>

        <div class="info-row">
          <span style="font-weight: 600;">Inv: ${invoiceNo}</span>
          <span>${saleDate}</span>
        </div>
        <div class="info-row">
          <span>Customer:</span>
          <span style="font-weight: 600;">${customerName}</span>
        </div>
        <div class="info-row">
          <span>Phone:</span>
          <span>${customerPhone}</span>
        </div>
        <div class="info-row">
          <span>Payment:</span>
          <span style="text-transform: capitalize; font-weight: 600;">${sale.payment_method || "Cash"}</span>
        </div>

        <div class="divider"></div>

        <div>
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 5px;">Items Ordered</div>
          ${itemsHtml}
        </div>

        <div class="divider"></div>

        <div class="tot-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        ${discount > 0 ? `
          <div class="tot-row" style="color: #059669;">
            <span>Discount:</span>
            <span>-${formatCurrency(discount)}</span>
          </div>
        ` : ""}
        ${tax > 0 ? `
          <div class="tot-row">
            <span>Tax (VAT):</span>
            <span>${formatCurrency(tax)}</span>
          </div>
        ` : ""}

        <div class="double-divider"></div>

        <div class="tot-row grand-total">
          <span>TOTAL:</span>
          <span>${formatCurrency(total)}</span>
        </div>
        <div class="tot-row">
          <span>Amount Paid:</span>
          <span style="font-weight: 600;">${formatCurrency(paid)}</span>
        </div>
        ${due > 0 ? `
          <div class="tot-row" style="color: #dc2626; font-weight: 700;">
            <span>Balance Due:</span>
            <span>${formatCurrency(due)}</span>
          </div>
        ` : ""}

        <div class="divider"></div>

        <div class="footer-note">
          <p style="font-weight: 600; margin: 3px 0;">Thank you for shopping with Raw Stitch!</p>
          <p style="margin: 2px 0;">Exchange within 7 days with receipt.</p>
          <p style="margin: 2px 0; font-size: 10px; color: #888;">Software by Rawstitch RMS</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function printA4Invoice(sale: PrintableSale) {
  const printWindow = window.open("", "_blank", "width=850,height=950");
  if (!printWindow) {
    alert("Please allow popups to print invoices.");
    return;
  }

  const invoiceNo = sale.invoice_number || `RS-INV-${sale.id || Date.now()}`;
  const customerName = sale.customer
    ? sale.customer.name || `${sale.customer.first_name || ""} ${sale.customer.last_name || ""}`.trim()
    : "Walk-in Customer";
  const customerPhone = sale.customer_phone || sale.customer?.phone || "N/A";
  const customerEmail = sale.customer?.email || "N/A";
  const customerAddress = sale.customer?.address || "Bangladesh";
  const saleDate = (sale.date ? new Date(sale.date) : new Date()).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subtotal = sale.subtotal ?? sale.total;
  const discount = sale.discount || 0;
  const tax = sale.tax || 0;
  const total = sale.total;
  const paid = sale.amount_paid ?? total;
  const due = sale.amount_due || 0;

  const itemsRows = (sale.items || [])
    .map((item, idx) => {
      const name = item.product?.name || item.name || "Item";
      const sku = item.product?.sku || "-";
      const variant = [item.size, item.color].filter(Boolean).join(" / ");
      const qty = item.quantity;
      const unitPrice = item.price;
      const itemTotal = item.total !== undefined ? item.total : qty * unitPrice;
      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-size: 13px; color: #64748b;">${idx + 1}</td>
          <td style="padding: 10px;">
            <div style="font-weight: 600; font-size: 13px; color: #0f172a;">${name}</div>
            <div style="font-size: 11px; color: #64748b;">SKU: ${sku} ${variant ? `• Var: ${variant}` : ""}</div>
          </td>
          <td style="padding: 10px; text-align: center; font-size: 13px;">${qty}</td>
          <td style="padding: 10px; text-align: right; font-size: 13px;">${formatCurrency(unitPrice)}</td>
          <td style="padding: 10px; text-align: right; font-weight: 600; font-size: 13px;">${formatCurrency(itemTotal)}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice - ${invoiceNo}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 20px;
            background: #fff;
          }
          .header-bar {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }
          .brand-name { font-size: 26px; font-weight: 900; color: #1e1b4b; letter-spacing: 0.5px; }
          .inv-title { font-size: 28px; font-weight: 900; color: #4f46e5; text-align: right; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 25px; }
          .card-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; font-size: 13px; }
          .card-title { font-weight: 700; color: #475569; text-transform: uppercase; font-size: 11px; margin-bottom: 8px; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th { background: #4f46e5; color: #fff; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          .totals-section { display: flex; justify-content: flex-end; }
          .totals-table { width: 320px; font-size: 13px; }
          .totals-table td { padding: 6px 0; }
          .sig-row { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header-bar">
          <div>
            <div class="brand-name">RAW STITCH</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
              Rawstitch Clothing & Lifestyle Ltd.<br />
              Kapasia, Gazipur, Dhaka, Bangladesh<br />
              Phone: +880 1338-869901 | sales@rawstitch.com.bd
            </div>
          </div>
          <div>
            <div class="inv-title">TAX INVOICE</div>
            <div style="font-size: 13px; color: #64748b; text-align: right; margin-top: 4px;">
              <b>Invoice No:</b> ${invoiceNo}<br />
              <b>Date:</b> ${saleDate}<br />
              <b>Payment:</b> <span style="text-transform: capitalize;">${sale.payment_method || "Paid"}</span>
            </div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card-box">
            <div class="card-title">Bill To / Customer Information</div>
            <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">${customerName}</div>
            <div style="color: #475569;">Phone: ${customerPhone}</div>
            <div style="color: #475569;">Email: ${customerEmail}</div>
            <div style="color: #475569;">Address: ${customerAddress}</div>
          </div>

          <div class="card-box">
            <div class="card-title">Order & Payment Status</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Payment Status:</span>
              <b style="color: ${due > 0 ? '#dc2626' : '#059669'};">${due > 0 ? 'PARTIALLY PAID / DUE' : 'FULLY PAID'}</b>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Fulfillment Status:</span>
              <b style="text-transform: capitalize;">${sale.status || "Completed"}</b>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Issued By:</span>
              <span>Rawstitch POS Store Terminal</span>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Description & Item Details</th>
              <th style="width: 70px; text-align: center;">Qty</th>
              <th style="width: 110px; text-align: right;">Unit Price</th>
              <th style="width: 120px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="totals-section">
          <table class="totals-table">
            <tr>
              <td style="color: #64748b;">Subtotal:</td>
              <td style="text-align: right; font-weight: 600;">${formatCurrency(subtotal)}</td>
            </tr>
            ${discount > 0 ? `
              <tr>
                <td style="color: #059669;">Special Discount:</td>
                <td style="text-align: right; font-weight: 600; color: #059669;">-${formatCurrency(discount)}</td>
              </tr>
            ` : ""}
            ${tax > 0 ? `
              <tr>
                <td style="color: #64748b;">Tax / VAT:</td>
                <td style="text-align: right; font-weight: 600;">${formatCurrency(tax)}</td>
              </tr>
            ` : ""}
            <tr style="border-top: 2px solid #0f172a; font-size: 16px;">
              <td style="font-weight: 800; padding-top: 8px;">Total Amount:</td>
              <td style="text-align: right; font-weight: 800; padding-top: 8px; color: #4f46e5;">${formatCurrency(total)}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Paid Amount:</td>
              <td style="text-align: right; font-weight: 600; color: #059669;">${formatCurrency(paid)}</td>
            </tr>
            ${due > 0 ? `
              <tr>
                <td style="color: #dc2626; font-weight: 700;">Balance Due:</td>
                <td style="text-align: right; font-weight: 700; color: #dc2626;">${formatCurrency(due)}</td>
              </tr>
            ` : ""}
          </table>
        </div>

        <div class="sig-row">
          <div>
            <p style="font-weight: 600; color: #0f172a; margin-bottom: 2px;">Terms & Conditions</p>
            <p style="margin: 0;">1. Items can be exchanged within 7 days with this invoice in original condition.</p>
            <p style="margin: 0;">2. Discounted / Promotional items are non-refundable.</p>
          </div>
          <div style="text-align: right; min-width: 180px;">
            <div style="border-bottom: 1px solid #94a3b8; height: 35px; margin-bottom: 4px;"></div>
            <span>Authorized Signature</span>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
