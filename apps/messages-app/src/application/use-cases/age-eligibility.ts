import type { FiscalCode } from "io-messages-common/domain/fiscal-code";

interface CalendarDate {
  readonly day: number;
  readonly month: number;
  readonly year: number;
}

interface ServiceAgeRange {
  readonly max?: number;
  readonly min?: number;
}

export type AgeEligibility =
  | { readonly kind: "ELIGIBLE" }
  | { readonly kind: "INELIGIBLE" }
  | { readonly kind: "MALFORMED_SERVICE_AGE_RANGE" };

const omocodiaDigits: Readonly<Record<string, string>> = {
  L: "0",
  M: "1",
  N: "2",
  P: "3",
  Q: "4",
  R: "5",
  S: "6",
  T: "7",
  U: "8",
  V: "9",
};

const monthByCode: Readonly<Record<string, number>> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  H: 6,
  L: 7,
  M: 8,
  P: 9,
  R: 10,
  S: 11,
  T: 12,
};

const toRomeCalendarDate = (now: Date): CalendarDate => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Rome",
    year: "numeric",
  }).formatToParts(now);
  const getPart = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    day: getPart("day"),
    month: getPart("month"),
    year: getPart("year"),
  };
};

const getAge = (birthDate: CalendarDate, referenceDate: CalendarDate): number =>
  referenceDate.year -
  birthDate.year -
  (referenceDate.month < birthDate.month ||
  (referenceDate.month === birthDate.month && referenceDate.day < birthDate.day)
    ? 1
    : 0);

const isValidCalendarDate = (date: CalendarDate): boolean => {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day));
  return (
    value.getUTCFullYear() === date.year &&
    value.getUTCMonth() === date.month - 1 &&
    value.getUTCDate() === date.day
  );
};

const decodeDigit = (value: string): number | undefined => {
  const digit = omocodiaDigits[value] ?? value;
  return /^\d$/.test(digit) ? Number(digit) : undefined;
};

const decodeBirthDate = (
  fiscalCode: FiscalCode,
  referenceDate: CalendarDate,
): CalendarDate | undefined => {
  const firstYearDigit = decodeDigit(fiscalCode[6]);
  const secondYearDigit = decodeDigit(fiscalCode[7]);
  const firstDayDigit = decodeDigit(fiscalCode[9]);
  const secondDayDigit = decodeDigit(fiscalCode[10]);
  const month = monthByCode[fiscalCode[8]];
  if (
    firstYearDigit === undefined ||
    secondYearDigit === undefined ||
    firstDayDigit === undefined ||
    secondDayDigit === undefined ||
    month === undefined
  ) {
    return undefined;
  }

  const year = firstYearDigit * 10 + secondYearDigit;
  const encodedDay = firstDayDigit * 10 + secondDayDigit;
  const day = encodedDay > 40 ? encodedDay - 40 : encodedDay;
  const currentCenturyDate = {
    day,
    month,
    year: Math.floor(referenceDate.year / 100) * 100 + year,
  };
  const birthDate =
    currentCenturyDate.year <= referenceDate.year &&
    getAge(currentCenturyDate, referenceDate) >= 14
      ? currentCenturyDate
      : { ...currentCenturyDate, year: currentCenturyDate.year - 100 };

  return isValidCalendarDate(birthDate) ? birthDate : undefined;
};

export const canSendToAge = (
  fiscalCode: FiscalCode,
  ageRange: ServiceAgeRange | undefined,
  now: Date = new Date(),
): AgeEligibility => {
  const min = ageRange?.min ?? 18;
  const max = ageRange?.max;
  if (max !== undefined && min > max) {
    return { kind: "MALFORMED_SERVICE_AGE_RANGE" };
  }

  const referenceDate = toRomeCalendarDate(now);
  const birthDate = decodeBirthDate(fiscalCode, referenceDate);
  if (birthDate === undefined) {
    return { kind: "INELIGIBLE" };
  }

  const age = getAge(birthDate, referenceDate);
  return age >= min && (max === undefined || age <= max)
    ? { kind: "ELIGIBLE" }
    : { kind: "INELIGIBLE" };
};
