import CryptoJS from "crypto-js";

const secretKey = process.env.NEXT_PUBLIC_SECRET_KEY?? "";
if (!secretKey) {
  throw new Error("");
}

// Encrypt Data
export const encryptData = (data:any) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
};

// Decrypt Data
export const decryptData = (encryptedData: string) => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

// export const decryptData1 = (encryptedChunks) => {
//     if (!Array.isArray(encryptedChunks)) {
//         throw new Error("Invalid encrypted data format");
//     }

//     let decryptedStr = "";
//     for (let enc of encryptedChunks) {
//         const bytes = CryptoJS.AES.decrypt(enc, secretKey);
//         decryptedStr += bytes.toString(CryptoJS.enc.Utf8);
//     }

//     return JSON.parse(decryptedStr);
// }
export const decryptData1 = (encryptedChunks: string | string[]) => {
    let decryptedStr = "";

    if (Array.isArray(encryptedChunks)) {
        // Case 1: multiple encrypted chunks
        for (let enc of encryptedChunks) {
            const bytes = CryptoJS.AES.decrypt(enc, secretKey);
            decryptedStr += bytes.toString(CryptoJS.enc.Utf8);
        }
    } else {
        // Case 2: single encrypted string
        const bytes = CryptoJS.AES.decrypt(encryptedChunks, secretKey);
        decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    }

    // JSON parse safely
    try {
        return JSON.parse(decryptedStr);
    } catch (err) {
        // fallback: return raw string if not valid JSON
        return decryptedStr;
    }
};

// Encrypt Data
export const encryptUrlData = (data: string) => {
  return CryptoJS.AES.encrypt(data, secretKey).toString();
};

// Decrypt Data
export const decryptUrlData = (encryptedData: string) => {
  const bytes = CryptoJS.AES.decrypt(decodeURIComponent(encryptedData), secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};
