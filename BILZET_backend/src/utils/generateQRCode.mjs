import QRCode from 'qrcode';

/**
 * Generates a base64 Data URL for a QR code.
 * @param {string} text - The text/URL/data to encode
 * @returns {Promise<string>} Base64 data URL
 */
export const generateQRCodeDataUrl = async (text) => {
  return await QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 6
  });
};

/**
 * Generates a PNG Buffer for a QR code (useful for PDFKit embedding).
 * @param {string} text - The text/URL/data to encode
 * @returns {Promise<Buffer>} PNG image buffer
 */
export const generateQRCodeBuffer = async (text) => {
  return await QRCode.toBuffer(text, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 6
  });
};

/**
 * Builds standard Indian UPI payment URI string.
 * Format: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
 */
export const buildUPIPaymentString = ({
  upiId,
  payeeName = 'Bilzet Shop',
  amount = 0,
  transactionNote = 'Bill Payment',
  transactionRef = ''
}) => {
  const params = new URLSearchParams();
  params.append('pa', upiId);
  params.append('pn', payeeName);
  if (amount > 0) {
    params.append('am', amount.toFixed(2));
  }
  params.append('cu', 'INR');
  if (transactionNote) {
    params.append('tn', transactionNote);
  }
  if (transactionRef) {
    params.append('tr', transactionRef);
  }

  return `upi://pay?${params.toString()}`;
};

export default {
  generateQRCodeDataUrl,
  generateQRCodeBuffer,
  buildUPIPaymentString
};
