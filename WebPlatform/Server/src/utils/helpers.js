const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  console.log(`[generateOTP] Generated OTP: ${otp}`);
  return otp;
};

const comparePassword = async (plain, hashed) => {
  return bcrypt.compare(plain, hashed);
};

module.exports = { hashPassword, generateOTP, comparePassword };