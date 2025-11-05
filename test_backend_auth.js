const CryptoJS = require('crypto-js');

const secretKey = "a6f974d5fcb51f9356ca064ecb887881308dc2bf0c80dcd4bef62ee0becc3dc1";

function encryptData(data) {
  return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
}

function decryptData(encryptedData) {
  const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

// Test login
const payload = {
  phone: "master",
  password: "5550005550",
  domain: "500x.exchange",
  isBrokerLogin: 0,
  loginBy: "Web",
  browser: "Chrome",
  userAgent: "Mozilla/5.0",
  deviceId: "test-device-123",
  deviceType: "web",
  ipAddress: ""
};

const encrypted = encryptData(payload);
console.log("Encrypted payload:", encrypted.substring(0, 50) + "...");
console.log("\nFull request body:");
console.log(JSON.stringify({ data: encrypted }, null, 2));
