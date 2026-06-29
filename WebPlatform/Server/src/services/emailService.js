const nodemailer = require('nodemailer');

// Log email configuration (without showing sensitive data)
console.log(`[EMAIL SERVICE] Initializing with configuration:`);
console.log(`  - HOST: ${process.env.EMAIL_HOST}`);
console.log(`  - PORT: ${process.env.EMAIL_PORT}`);
console.log(`  - USER: ${process.env.EMAIL_USER ? '✓ configured' : '❌ NOT configured'}`);
console.log(`  - PASS: ${process.env.EMAIL_PASS ? '✓ configured' : '❌ NOT configured'}`);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Test the transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error('[EMAIL SERVICE] ❌ SMTP connection error:', error);
  } else {
    console.log('[EMAIL SERVICE] ✅ SMTP connection successful');
  }
});

const sendOTPEmail = async (to, otp) => {
  console.log(`[sendOTPEmail] Starting email sending process`);
  console.log(`[sendOTPEmail] Recipient: ${to}`);
  console.log(`[sendOTPEmail] OTP: ${otp}`);
  
  const mailOptions = {
    from: `"Medical Platform" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your Verification Code',
    text: `Your OTP is ${otp}. It expires in 3 minutes.`,
    html: `
      <h2>Email Verification</h2>
      <p>Use this code to verify your account:</p>
      <h1 style="letter-spacing: 8px;">${otp}</h1>
      <p>This code expires in 3 minutes.</p>
    `,
  };

  console.log(`[sendOTPEmail] Mail options prepared`);
  console.log(`[sendOTPEmail] Calling transporter.sendMail()...`);
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[sendOTPEmail] ✅ Email sent successfully!`);
    console.log(`[sendOTPEmail] Response ID: ${info.response}`);
    console.log(`[sendOTPEmail] Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[sendOTPEmail] ❌ Error sending email:`, error.message);
    console.error(`[sendOTPEmail] Error code:`, error.code);
    console.error(`[sendOTPEmail] Full error:`, error);
    throw error;
  }
};

module.exports = { sendOTPEmail };