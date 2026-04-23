const QRCode = require('qrcode');

/**
 * Generates a QR code from the given data and returns a base64-encoded PNG string.
 * @param {string|object} data - The data to encode into the QR code.
 * @returns {Promise<string>} - Base64 data URL string (e.g. "data:image/png;base64,...")
 */
const generateQRCode = async (data) => {
  try {
    const payload = typeof data === 'object' ? JSON.stringify(data) : String(data);

    const base64String = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 256,
    });

    return base64String;
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
};

module.exports = { generateQRCode };
