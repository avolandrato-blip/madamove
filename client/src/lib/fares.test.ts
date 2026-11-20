import { describe, expect, it } from "vitest";
import { calculateSuggestedFare, getMinimumFare, getRatePerKm } from "./fares";

const tanaDateAtUtc = (hour: number) =>
  new Date(Date.UTC(2026, 0, 15, hour, 0, 0));

describe("MadaMove indicative fares", () => {
  it("uses the off-peak car rate between 08:00 and 11:00 in Antananarivo", () => {
    expect(getRatePerKm("taxi", tanaDateAtUtc(5))).toBe(2_000); // 08:00 local
    expect(getRatePerKm("vtc", tanaDateAtUtc(7))).toBe(2_000); // 10:00 local
  });

  it("uses the peak car rate at the timetable boundaries", () => {
    expect(getRatePerKm("taxi", tanaDateAtUtc(8))).toBe(2_500); // 11:00 local
    expect(getRatePerKm("vtc", tanaDateAtUtc(16))).toBe(2_500); // 19:00 local
  });

  it("applies the V1 minimum fares and rounds upward to the nearest 500 Ar", () => {
    expect(getMinimumFare("taxi")).toBe(10_000);
    expect(calculateSuggestedFare("taxi", 2, tanaDateAtUtc(5))).toBe(10_000);
    expect(getMinimumFare("moto")).toBe(5_000);
    expect(calculateSuggestedFare("moto", 2, tanaDateAtUtc(5))).toBe(5_000);
    expect(calculateSuggestedFare("moto", 4.1, tanaDateAtUtc(5))).toBe(6_500);
  });
});
