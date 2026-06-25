export interface FormatDateOptions extends Intl.DateTimeFormatOptions {
  numerals?: "latn" | "native";
}

export interface FormatNumberOptions extends Intl.NumberFormatOptions {
  numerals?: "latn" | "native";
}

export function formatDate(
  date: Date | string | number,
  locale: string = "en",
  options: FormatDateOptions = {}
): string {
  const d = date instanceof Date ? date : new Date(date);
  const { numerals = "latn", ...restOptions } = options;

  let resolvedLocale = locale;
  if (numerals === "latn" && !locale.includes("-u-nu-")) {
    resolvedLocale = `${locale}-u-nu-latn`;
  }

  return new Intl.DateTimeFormat(resolvedLocale, restOptions).format(d);
}

export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en",
  options: FormatNumberOptions = {}
): string {
  const { numerals = "latn", ...restOptions } = options;

  let resolvedLocale = locale;
  if (numerals === "latn" && !locale.includes("-u-nu-")) {
    resolvedLocale = `${locale}-u-nu-latn`;
  }

  return new Intl.NumberFormat(resolvedLocale, {
    style: "currency",
    currency,
    ...restOptions,
  }).format(amount);
}

export function formatNumber(
  num: number,
  locale: string = "en",
  options: FormatNumberOptions = {}
): string {
  const { numerals = "latn", ...restOptions } = options;

  let resolvedLocale = locale;
  if (numerals === "latn" && !locale.includes("-u-nu-")) {
    resolvedLocale = `${locale}-u-nu-latn`;
  }

  return new Intl.NumberFormat(resolvedLocale, restOptions).format(num);
}
