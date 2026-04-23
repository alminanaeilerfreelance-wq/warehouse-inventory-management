/**
 * Generates an invoice number in the format: INV-MMYYDD-XXXX
 * MM  = 2-digit month
 * YY  = 2-digit year
 * DD  = 2-digit day
 * XXXX = random 4-digit number
 *
 * Example: INV-042612-3487 for April 26, 2012, random 3487
 */
const generateInvoiceNo = () => {
  const now = new Date();

  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const day = String(now.getDate()).padStart(2, '0');

  const randomPart = String(Math.floor(Math.random() * 9000) + 1000); // 1000–9999

  return `INV-${month}${year}${day}-${randomPart}`;
};

module.exports = { generateInvoiceNo };
