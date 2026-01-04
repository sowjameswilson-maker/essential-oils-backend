const nodemailer = require('nodemailer');

// Example: using Gmail SMTP
// You can use any SMTP service (SendGrid, Mailgun, etc.)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_PASS, // app password if using Gmail
  },
});

async function sendOrderReceipt({ to, subject, html }) {
  const mailOptions = {
    from: `"My Shop" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  };

  return transporter.sendMail(mailOptions);
}

module.exports = sendOrderReceipt;

async function sendAdminSaleNotification(order) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.ADMIN_EMAIL, // YOUR email
    subject: '🛒 New Order Received',
    html: `
      <h2>New Order</h2>
      <p><strong>Name:</strong> ${order.customer_name}</p>
      <p><strong>Email:</strong> ${order.customer_email}</p>
      <p><strong>Total:</strong> $${(order.amount_total / 100).toFixed(2)}</p>
      <p><strong>Items:</strong></p>
      <ul>
        ${order.items.map(i => `<li>${i.name} × ${i.quantity}</li>`).join('')}
      </ul>
    `
  });
}

module.exports = {
  sendOrderReceipt,
  sendAdminSaleNotification
};
