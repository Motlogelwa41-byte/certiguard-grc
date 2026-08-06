// Multi-currency exchange rate reference for GRC financial risk quantification.
// Rates are relative to ZAR (1 ZAR = rate units of target currency is NOT how this works).
// Instead: 1 unit of currency X = rateInZar ZAR. To convert from currency A to B:
//   amountInB = amountInA * (rateToZar[A] / rateToZar[B])
// Source: approximate static rates as of 2026 — update periodically for accuracy.

export const CURRENCIES = [
  { code: "ZAR", name: "South African Rand", symbol: "R", rateToZar: 1 },
  { code: "USD", name: "US Dollar", symbol: "$", rateToZar: 18.5 },
  { code: "BWP", name: "Botswana Pula", symbol: "P", rateToZar: 1.38 },
  { code: "EUR", name: "Euro", symbol: "€", rateToZar: 20.1 },
  { code: "GBP", name: "British Pound", symbol: "£", rateToZar: 23.5 },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", rateToZar: 0.012 },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", rateToZar: 0.143 },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", rateToZar: 1.19 },
  { code: "ZMW", name: "Zambian Kwacha", symbol: "ZK", rateToZar: 0.66 },
  { code: "MZN", name: "Mozambican Metical", symbol: "MT", rateToZar: 0.29 },
  { code: "AOA", name: "Angolan Kwanza", symbol: "Kz", rateToZar: 0.020 },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", rateToZar: 0.0071 },
];

export const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

export function convertCurrency(amount, fromCurrency, toCurrency) {
  if (!amount || isNaN(amount)) return 0;
  const from = CURRENCY_MAP[fromCurrency];
  const to = CURRENCY_MAP[toCurrency];
  if (!from || !to) return amount;
  // Convert: amount_in_ZAR = amount * from.rateToZar; then to target: / to.rateToZar
  return (amount * from.rateToZar) / to.rateToZar;
}

export function formatCurrency(amount, currency) {
  const c = CURRENCY_MAP[currency] || CURRENCY_MAP.ZAR;
  const formatted = (amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${c.symbol} ${formatted}`;
}

export function formatCurrencyCompact(amount, currency) {
  const c = CURRENCY_MAP[currency] || CURRENCY_MAP.ZAR;
  const val = amount || 0;
  if (Math.abs(val) >= 1_000_000) return `${c.symbol} ${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `${c.symbol} ${(val / 1_000).toFixed(1)}K`;
  return `${c.symbol} ${val.toFixed(0)}`;
}