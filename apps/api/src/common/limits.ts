/**
 * API-13: upper bounds for money and quantity inputs.
 *
 * `amountCents` / `priceCents` / `qtyValue` are Postgres `int4` columns (max
 * 2,147,483,647). Nothing validated an upper bound, so an absurd quantity made
 * `unitPriceCents * qty` overflow the column — a 500 on write, plus garbage
 * orders and huge phantom `reservedQty` bumps along the way. These caps keep every
 * derived product comfortably inside int4 while staying far above any real trade.
 */

/** $10,000,000 in cents — an order of magnitude below the int4 ceiling. */
export const MAX_MONEY_CENTS = 1_000_000_000;

/** Upper bound for order/bid quantities (tonnes, units, …). */
export const MAX_QTY = 1_000_000;
