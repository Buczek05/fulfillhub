/**
 * Reguła 8: alert leci raz, w momencie przekroczenia progu – nie przy każdej
 * kolejnej zmianie stanu, który już jest niski. Dlatego porównujemy stan przed i po.
 */
function crossedLowStockThreshold(before, after) {
  const availableBefore = before.quantityOnHand - before.quantityReserved;
  const availableAfter = after.quantityOnHand - after.quantityReserved;

  return availableBefore >= after.lowStockThreshold && availableAfter < after.lowStockThreshold;
}

module.exports = { crossedLowStockThreshold };
