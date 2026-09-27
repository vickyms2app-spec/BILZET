import bwipjs from 'bwip-js';

/**
 * Generate a PNG Buffer for a given barcode string using bwip-js.
 * @param {string} text - The barcode string
 * @param {string} bcid - Barcode symbology (default: 'code128')
 * @returns {Promise<Buffer>} PNG image buffer
 */
export const generateBarcodeBuffer = async (text, bcid = 'code128') => {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid,
        text: String(text),
        scale: 3,
        height: 12,
        includetext: true,
        textxalign: 'center'
      },
      (err, png) => {
        if (err) {
          reject(err);
        } else {
          resolve(png);
        }
      }
    );
  });
};

/**
 * Generates a unique barcode text string (12-digit numeric or alphanumeric).
 */
export const generateBarcodeString = (prefix = '890') => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${timestamp}${random}`;
};

export default {
  generateBarcodeBuffer,
  generateBarcodeString
};
