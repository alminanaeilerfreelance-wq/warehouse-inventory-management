const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generic send
async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_USER) return; // silently skip if not configured
  try {
    await transporter.sendMail({
      from: `"WMS Pro" <${process.env.EMAIL_USER}>`,
      to, subject, html,
    });
  } catch (err) {
    console.error('[Email] Failed to send:', err.message);
  }
}

// Templates
function lowStockEmail(items) {
  const rows = items.map(i =>
    `<tr><td>${i.productName||'—'}</td><td>${i.quantity}</td><td style="color:red">${i.stockStatus}</td></tr>`
  ).join('');
  return {
    subject: '⚠️ WMS Pro — Low Stock Alert',
    html: `<h2>Low Stock Alert</h2><p>${items.length} item(s) need attention:</p>
    <table border="1" cellpadding="8" style="border-collapse:collapse">
    <thead><tr><th>Product</th><th>Qty</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table>`,
  };
}

function invoiceDueEmail(invoice) {
  return {
    subject: `📄 WMS Pro — Invoice ${invoice.invoiceNo} is Due`,
    html: `<h2>Invoice Due Reminder</h2>
    <p>Invoice <strong>${invoice.invoiceNo}</strong> for <strong>${invoice.customer?.name||'Customer'}</strong> is now due.</p>
    <p>Amount: <strong>₱${(invoice.total||0).toLocaleString()}</strong></p>`,
  };
}

function poApprovalEmail(po) {
  return {
    subject: `🛒 WMS Pro — Purchase Order ${po.invoiceNo} Needs Approval`,
    html: `<h2>Purchase Order Approval Required</h2>
    <p>PO <strong>${po.invoiceNo}</strong> from supplier <strong>${po.supplier?.name||'Supplier'}</strong> requires admin approval.</p>
    <p>Total: <strong>₱${(po.totalAmount||0).toLocaleString()}</strong></p>`,
  };
}

module.exports = { sendEmail, lowStockEmail, invoiceDueEmail, poApprovalEmail };
