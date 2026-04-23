/**
 * Determines the stock status of an inventory item.
 * @param {number} quantity  - Current quantity in stock.
 * @param {number} threshold - Low-stock threshold set for the item.
 * @returns {'out_of_stock'|'low_stock'|'in_stock'}
 */
const updateStockStatus = (quantity, threshold) => {
  if (quantity <= 0) {
    return 'out_of_stock';
  }

  if (quantity <= threshold) {
    return 'low_stock';
  }

  return 'in_stock';
};

module.exports = { updateStockStatus };
