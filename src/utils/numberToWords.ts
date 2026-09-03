/**
 * Converts a numeric currency amount into Indian English words.
 * Handles Indian numbering system (Lakhs, Crores, Thousands, Hundreds).
 * Example: 700 -> "Rupees Seven Hundred Only"
 * Example: 1450.50 -> "Rupees One Thousand Four Hundred Fifty and Fifty Paise Only"
 */
export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "Rupees Zero Only";
  }

  const num = Math.round(Math.abs(amount) * 100) / 100;
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) {
    return "Rupees Zero Only";
  }

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertTwoDigits(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return (tens[t] + (o ? " " + ones[o] : "")).trim();
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = "";
    if (hundred > 0) {
      res += ones[hundred] + " Hundred";
    }
    if (rest > 0) {
      res += (res ? " " : "") + convertTwoDigits(rest);
    }
    return res.trim();
  }

  let words = "";

  if (integerPart > 0) {
    const crore = Math.floor(integerPart / 10000000);
    const lakh = Math.floor((integerPart % 10000000) / 100000);
    const thousand = Math.floor((integerPart % 100000) / 1000);
    const hundred = integerPart % 1000;

    if (crore > 0) {
      words += convertTwoDigits(crore) + " Crore ";
    }
    if (lakh > 0) {
      words += convertTwoDigits(lakh) + " Lakh ";
    }
    if (thousand > 0) {
      words += convertTwoDigits(thousand) + " Thousand ";
    }
    if (hundred > 0) {
      words += convertThreeDigits(hundred);
    }
    words = words.trim();
  } else {
    words = "Zero";
  }

  let result = `Rupees ${words}`;

  if (decimalPart > 0) {
    const paiseWords = convertTwoDigits(decimalPart);
    result += ` and ${paiseWords} Paise`;
  }

  result += " Only";
  return result;
}
