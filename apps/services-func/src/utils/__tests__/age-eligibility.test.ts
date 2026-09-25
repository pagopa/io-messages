import { describe, expect, it } from "vitest";

import { canSendToAge } from "../age-eligibility";

const now = new Date("2026-09-23T12:00:00.000Z");

const fiscalCodeWithBirthDate = (
  year: string,
  month: string,
  day: string,
): string => `RSSMRA${year}${month}${day}H501U`;

describe("canSendToAge", () => {
  it.each([
    [
      "uses the implicit minimum age",
      fiscalCodeWithBirthDate("08", "A", "01"),
      undefined,
      "ELIGIBLE",
    ],
    [
      "rejects recipients younger than the implicit minimum age",
      fiscalCodeWithBirthDate("09", "A", "01"),
      undefined,
      "INELIGIBLE",
    ],
    [
      "accepts the configured minimum age",
      fiscalCodeWithBirthDate("08", "A", "01"),
      { min: 18 },
      "ELIGIBLE",
    ],
    [
      "accepts the configured maximum age",
      fiscalCodeWithBirthDate("08", "A", "01"),
      { max: 18 },
      "ELIGIBLE",
    ],
    [
      "rejects an age above the configured maximum",
      fiscalCodeWithBirthDate("08", "A", "01"),
      { max: 17, min: 0 },
      "INELIGIBLE",
    ],
    [
      "decodes female fiscal-code days",
      fiscalCodeWithBirthDate("08", "A", "41"),
      undefined,
      "ELIGIBLE",
    ],
    [
      "decodes omocodia digits",
      fiscalCodeWithBirthDate("UQ", "A", "LR"),
      undefined,
      "ELIGIBLE",
    ],
  ])("%s", (_, fiscalCode, ageRange, expectedKind) => {
    expect(canSendToAge(fiscalCode, ageRange, now).kind).toBe(expectedKind);
  });

  it("uses the previous century for a current-century recipient younger than 14", () => {
    expect(
      canSendToAge(fiscalCodeWithBirthDate("20", "A", "01"), undefined, now)
        .kind,
    ).toBe("ELIGIBLE");
  });

  it("accepts a valid leap-day birth date", () => {
    expect(
      canSendToAge(fiscalCodeWithBirthDate("08", "B", "29"), undefined, now)
        .kind,
    ).toBe("ELIGIBLE");
  });

  it("uses the Europe/Rome calendar day for birthday boundaries", () => {
    const beforeMidnightInRome = new Date("2026-09-22T21:59:59.000Z");
    const midnightInRome = new Date("2026-09-22T22:00:00.000Z");
    const fiscalCode = fiscalCodeWithBirthDate("08", "P", "23");

    expect(canSendToAge(fiscalCode, undefined, beforeMidnightInRome).kind).toBe(
      "INELIGIBLE",
    );
    expect(canSendToAge(fiscalCode, undefined, midnightInRome).kind).toBe(
      "ELIGIBLE",
    );
  });

  it.each([
    [fiscalCodeWithBirthDate("08", "B", "30"), "INELIGIBLE"],
    [fiscalCodeWithBirthDate("08", "Z", "01"), "INELIGIBLE"],
    ["RSSMRA08A01H501", "INELIGIBLE"],
  ])(
    "rejects a fiscal code with an invalid birth date",
    (fiscalCode, expectedKind) => {
      expect(canSendToAge(fiscalCode, undefined, now).kind).toBe(expectedKind);
    },
  );

  it("rejects malformed service age ranges", () => {
    expect(
      canSendToAge(
        fiscalCodeWithBirthDate("08", "A", "01"),
        { max: 18, min: 19 },
        now,
      ).kind,
    ).toBe("MALFORMED_SERVICE_AGE_RANGE");
  });
});
