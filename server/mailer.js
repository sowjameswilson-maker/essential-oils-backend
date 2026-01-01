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