// Calcul solaire hors ligne (algorithme NOAA simplifié, précision ~1 à 2 minutes).
// Aucune API : les heures restent disponibles le jour J sans réseau.

export interface SunTimes {
  sunrise: Date | null;
  sunset: Date | null;
  goldenMorningEnd: Date | null;
  goldenEveningStart: Date | null;
  blueMorningStart: Date | null;
  blueEveningEnd: Date | null;
  solarNoon: Date;
  polar: "day" | "night" | null;
}

const rad = Math.PI / 180;

/** Lit « 48.8566, 2.3522 » ou « 48.8566 2.3522 ». Renvoie null si invalide. */
export function parseGps(value: unknown): { lat: number; lng: number } | null {
  const match = String(value ?? "")
    .trim()
    .match(/^(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1].replace(",", "."));
  const lng = Number(match[2].replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function julianDay(date: Date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function solar(jd: number) {
  const t = (jd - 2451545) / 36525;
  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const c =
    Math.sin(m * rad) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * m * rad) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m * rad) * 0.000289;
  const trueLong = l0 + c;
  const omega = 125.04 - 1934.136 * t;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * rad);
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * rad);
  const declination = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad)) / rad;
  const y = Math.tan((eps / 2) * rad) ** 2;
  const eqTime =
    (4 *
      (y * Math.sin(2 * l0 * rad) -
        2 * e * Math.sin(m * rad) +
        4 * e * y * Math.sin(m * rad) * Math.cos(2 * l0 * rad) -
        0.5 * y * y * Math.sin(4 * l0 * rad) -
        1.25 * e * e * Math.sin(2 * m * rad))) /
    rad;
  return { declination, eqTime };
}

/**
 * Heure (UTC) à laquelle le soleil passe à `altitude` degrés.
 * `rising` choisit le matin ou le soir. null si le soleil n'atteint jamais cette hauteur ce jour-là.
 */
function timeAtAltitude(dayUtc: number, lat: number, lng: number, altitude: number, rising: boolean) {
  // Deux itérations suffisent pour caler la déclinaison sur l'heure de l'événement.
  let minutes = 720 - 4 * lng;
  for (let pass = 0; pass < 2; pass++) {
    const { declination, eqTime } = solar(julianDay(new Date(dayUtc + minutes * 60000)));
    const cosH =
      (Math.sin(altitude * rad) - Math.sin(lat * rad) * Math.sin(declination * rad)) /
      (Math.cos(lat * rad) * Math.cos(declination * rad));
    if (cosH > 1 || cosH < -1) return null;
    const hourAngle = Math.acos(cosH) / rad;
    minutes = 720 - 4 * (lng + (rising ? hourAngle : -hourAngle)) - eqTime;
  }
  return new Date(dayUtc + minutes * 60000);
}

/** `date` au format AAAA-MM-JJ (date du tournage). */
export function sunTimes(date: string, lat: number, lng: number): SunTimes {
  const dayUtc = Date.parse(date + "T00:00:00Z");
  const noonMinutes = 720 - 4 * lng - solar(julianDay(new Date(dayUtc + (720 - 4 * lng) * 60000))).eqTime;
  const solarNoon = new Date(dayUtc + noonMinutes * 60000);
  const at = (altitude: number, rising: boolean) => timeAtAltitude(dayUtc, lat, lng, altitude, rising);
  const sunrise = at(-0.833, true);
  const sunset = at(-0.833, false);
  let polar: SunTimes["polar"] = null;
  if (!sunrise || !sunset) {
    const { declination } = solar(julianDay(solarNoon));
    polar = 90 - Math.abs(lat - declination) > 0 ? "day" : "night";
  }
  return {
    sunrise,
    sunset,
    // Golden hour : soleil entre -4° et +6°. Blue hour : entre -6° et -4°.
    goldenMorningEnd: at(6, true),
    goldenEveningStart: at(6, false),
    blueMorningStart: at(-6, true),
    blueEveningEnd: at(-6, false),
    solarNoon,
    polar,
  };
}

/** Azimut approximatif du soleil (degrés depuis le nord, sens horaire) à un instant donné. */
export function sunAzimuth(at: Date, lat: number, lng: number) {
  const { declination, eqTime } = solar(julianDay(at));
  const minutes = at.getUTCHours() * 60 + at.getUTCMinutes() + at.getUTCSeconds() / 60;
  const hourAngle = (minutes + eqTime + 4 * lng) / 4 - 180;
  const zenith = Math.acos(
    Math.sin(lat * rad) * Math.sin(declination * rad) +
      Math.cos(lat * rad) * Math.cos(declination * rad) * Math.cos(hourAngle * rad),
  );
  const azimuth =
    Math.atan2(
      Math.sin(hourAngle * rad),
      Math.cos(hourAngle * rad) * Math.sin(lat * rad) - Math.tan(declination * rad) * Math.cos(lat * rad),
    ) /
      rad +
    180;
  return { azimuth: (azimuth + 360) % 360, altitude: 90 - zenith / rad };
}

const directions = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
export function compass(degrees: number) {
  return directions[Math.round(degrees / 45) % 8];
}

export function hhmm(date: Date | null) {
  return date ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";
}
