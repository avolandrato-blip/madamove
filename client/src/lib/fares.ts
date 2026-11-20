export type RideServiceType = "taxi" | "vtc" | "moto";

const CAR_MINIMUM_FARE = 10_000;
const MOTO_MINIMUM_FARE = 5_000;
const CAR_PEAK_RATE = 2_500;
const CAR_OFF_PEAK_RATE = 2_000;
const MOTO_RATE = 1_500;

export function getAntananarivoHour(date: Date = new Date()): number {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Indian/Antananarivo",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date)
  );
  return hour === 24 ? 0 : hour;
}

export function getRatePerKm(
  serviceType: RideServiceType,
  date: Date = new Date()
): number {
  if (serviceType === "moto") return MOTO_RATE;

  const hour = getAntananarivoHour(date);
  const isOffPeak = (hour >= 8 && hour < 11) || (hour >= 13 && hour < 16);
  return isOffPeak ? CAR_OFF_PEAK_RATE : CAR_PEAK_RATE;
}

export function getMinimumFare(serviceType: RideServiceType): number {
  return serviceType === "moto" ? MOTO_MINIMUM_FARE : CAR_MINIMUM_FARE;
}

export function calculateSuggestedFare(
  serviceType: RideServiceType,
  distanceKm: number,
  date: Date = new Date()
): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0)
    return getMinimumFare(serviceType);

  const rawFare = Math.max(
    getMinimumFare(serviceType),
    distanceKm * getRatePerKm(serviceType, date)
  );
  return Math.ceil(rawFare / 500) * 500;
}
