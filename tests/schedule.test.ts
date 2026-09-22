import { describe, it, expect } from "vitest";
import { parseGps, sunTimes, sunAzimuth } from "../src/sun";
import { runStages, currentDelay, proposeReschedule, applyReschedule, operatorConflicts } from "../src/schedule";
import { makeItem, newProject } from "../src/model";

const minutesUtc = (d: Date | null) => (d ? d.getUTCHours() * 60 + d.getUTCMinutes() : NaN);

describe("soleil hors ligne", () => {
  it("lit les coordonnées GPS usuelles et refuse les valeurs invalides", () => {
    expect(parseGps("48.8566, 2.3522")).toEqual({ lat: 48.8566, lng: 2.3522 });
    expect(parseGps("48,8566 ; 2,3522")).toEqual({ lat: 48.8566, lng: 2.3522 });
    expect(parseGps("-33.86 151.21")).toEqual({ lat: -33.86, lng: 151.21 });
    expect(parseGps("à compléter")).toBeNull();
    expect(parseGps("95, 2")).toBeNull();
  });
  it("donne lever et coucher à Paris au solstice d’été (référence ~03:47 et ~19:58 UTC)", () => {
    const t = sunTimes("2026-06-21", 48.8566, 2.3522);
    expect(Math.abs(minutesUtc(t.sunrise) - (3 * 60 + 47))).toBeLessThanOrEqual(3);
    expect(Math.abs(minutesUtc(t.sunset) - (19 * 60 + 58))).toBeLessThanOrEqual(3);
    // Ordre attendu : blue hour < lever < fin golden < midi < début golden < coucher < fin blue hour.
    const order = [
      t.blueMorningStart,
      t.sunrise,
      t.goldenMorningEnd,
      t.solarNoon,
      t.goldenEveningStart,
      t.sunset,
      t.blueEveningEnd,
    ].map((d) => d!.getTime());
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it("oriente le soleil au sud à midi solaire dans l’hémisphère nord", () => {
    const t = sunTimes("2026-09-24", 48.8566, 2.3522);
    const { azimuth, altitude } = sunAzimuth(t.solarNoon, 48.8566, 2.3522);
    expect(Math.abs(azimuth - 180)).toBeLessThan(2);
    expect(altitude).toBeGreaterThan(35);
  });
  it("signale le jour polaire au lieu d’inventer des heures", () => {
    const t = sunTimes("2026-06-21", 78.22, 15.65);
    expect(t.sunrise).toBeNull();
    expect(t.polar).toBe("day");
  });
});

describe("suivi réel du déroulé", () => {
  const project = () => {
    const p = newProject("Test");
    p.date = "2027-03-27";
    const a = makeItem("stages", "Préparatifs", { time: "09:00", duration: 60, order: 0 });
    const b = makeItem("stages", "Cérémonie", { time: "14:00", duration: 60, order: 1 });
    const c = makeItem("stages", "Couple", { time: "16:00", duration: 30, order: 2 });
    p.items = [a, b, c];
    return { p, a, b, c };
  };
  const local = (hhmm: string) => Date.parse(`2027-03-27T${hhmm}:00`);

  it("mesure le retard de départ puis le dépassement d’une étape", () => {
    const { p, a } = project();
    a.startedAt = new Date(local("09:20")).toISOString();
    const runs = runStages(p);
    expect(runs[0].startDelay).toBe(20);
    expect(runs[0].state).toBe("en cours");
    expect(currentDelay(runs, local("09:30"))).toBe(20);
    // Démarrée à 9h20 pour 60 min : à 10h35 on dépasse de 15 min → 35 min de retard sur le planning.
    expect(currentDelay(runs, local("10:35"))).toBe(35);
  });
  it("propose un recalcul des étapes à venir sans modifier le projet", () => {
    const { p, a } = project();
    a.startedAt = new Date(local("09:15")).toISOString();
    a.endedAt = new Date(local("10:25")).toISOString();
    const runs = runStages(p);
    const delay = currentDelay(runs, local("10:30"));
    expect(delay).toBe(25);
    const changes = proposeReschedule(runs, delay);
    expect(changes.map((c) => [c.item.title, c.from, c.to])).toEqual([
      ["Cérémonie", "14:00", "14:25"],
      ["Couple", "16:00", "16:25"],
    ]);
    expect(p.items[1].time).toBe("14:00");
    const next = applyReschedule(p, changes);
    expect(next.items[1].time).toBe("14:25");
    expect(next.items[1].originalTime).toBe("14:00");
    // Un second recalcul conserve l'horaire d'origine.
    const again = applyReschedule(next, [{ item: next.items[1], from: "14:25", to: "14:40" }]);
    expect(again.items[1].originalTime).toBe("14:00");
  });
  it("détecte un même responsable sur deux créneaux qui se chevauchent", () => {
    const { p, b } = project();
    const op = makeItem("team", "Cadreur A");
    const interview = makeItem("interviews", "Témoin", { time: "14:30", operatorId: op.id });
    b.operatorId = op.id;
    p.items.push(op, interview);
    const conflicts = operatorConflicts(p);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].operator.title).toBe("Cadreur A");
    interview.time = "15:10";
    expect(operatorConflicts(p)).toHaveLength(0);
  });
});

describe("répétition un autre jour", () => {
  it("lit les horaires sur le jour du premier démarrage", () => {
    const p = newProject("Test");
    p.date = "2030-01-01";
    const a = makeItem("stages", "Préparatifs", { time: "09:00", duration: 60, order: 0 });
    a.startedAt = new Date(Date.parse("2026-09-22T09:10:00")).toISOString();
    p.items = [a];
    expect(runStages(p)[0].startDelay).toBe(10);
  });
});
