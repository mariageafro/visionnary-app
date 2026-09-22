import { useState } from "react";
import { Car, CloudRain, ExternalLink, MapPin, Navigation, Sun, Wind } from "lucide-react";
import { useProject } from "../store";
import { projectSun } from "../schedule";
import { hhmm } from "../sun";
import { Empty, Screen, Tabs } from "../ui";
import { itemsOf } from "./common";

/**
 * Lever/coucher/golden hour : calcul astronomique local, fiable hors ligne.
 * Météo et trajet : aucune clé API locale n'étant configurée, on ouvre les services web
 * plutôt que d'afficher une fausse prévision — jamais de donnée inventée.
 */
export default function Weather() {
  const { project: p } = useProject();
  const [tab, setTab] = useState<"sun" | "weather" | "travel">("sun");
  const venues = itemsOf(p, "venues");
  const sun = projectSun(p);
  const address = [p.venue, ...venues.map((v) => v.address)].find((a) => a && String(a).trim());
  const query = String(address || p.venue || "").trim();

  return (
    <Screen title="Météo, soleil & trajet" backTo="/tournage">
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          ["sun", "Soleil"],
          ["weather", "Météo"],
          ["travel", "Trajet"],
        ]}
      />
      {tab === "sun" &&
        (sun ? (
          <div className="stack">
            <div className="card">
              <div className="list-head" style={{ padding: "0 0 8px" }}>
                {sun.venue.title}
                <Sun size={18} />
              </div>
              {sun.times.polar ? (
                <p>{sun.times.polar === "day" ? "Jour polaire : le soleil ne se couche pas." : "Nuit polaire."}</p>
              ) : (
                <div className="sun-grid">
                  <div>
                    <span>Blue hour</span>
                    <strong>{hhmm(sun.times.blueMorningStart)}</strong>
                  </div>
                  <div>
                    <span>Lever</span>
                    <strong>{hhmm(sun.times.sunrise)}</strong>
                  </div>
                  <div>
                    <span>Fin golden</span>
                    <strong>{hhmm(sun.times.goldenMorningEnd)}</strong>
                  </div>
                  <div className="is-gold">
                    <span>Golden hour</span>
                    <strong>{hhmm(sun.times.goldenEveningStart)}</strong>
                  </div>
                  <div>
                    <span>Coucher</span>
                    <strong>{hhmm(sun.times.sunset)}</strong>
                  </div>
                  <div>
                    <span>Fin blue hour</span>
                    <strong>{hhmm(sun.times.blueEveningEnd)}</strong>
                  </div>
                </div>
              )}
            </div>
            <p className="muted">Calcul astronomique local (±2 min), sans relief ni météo. Vérifiez les obstacles (bâtiments, arbres) sur place.</p>
            {venues.length > 1 && <p className="muted">D’autres lieux sont renseignés : le premier avec des coordonnées GPS valides est utilisé ici.</p>}
          </div>
        ) : (
          <Empty
            icon={<MapPin size={32} />}
            title="Coordonnées GPS manquantes"
            text="Ajoutez les coordonnées GPS d’un lieu (ex. « 48.8566, 2.3522 ») pour calculer lever, coucher et golden hour hors ligne."
            action={
              <a className="btn gold" href="#/m/venues">
                Lieux & repérage
              </a>
            }
          />
        ))}

      {tab === "weather" && (
        <div className="stack">
          <div className="notice">
            <CloudRain size={17} />
            Aucune prévision n’est simulée ici : consultez un service météo avec l’adresse du lieu et la date du tournage.
          </div>
          {[
            ["Météo-France", `https://meteofrance.com/previsions-meteo-france/${encodeURIComponent(query || "france")}`],
            ["Windy (vent, pluie, radar)", `https://www.windy.com/?${encodeURIComponent(query || "")}`],
          ].map(([label, url]) => (
            <a key={label} className="btn full" target="_blank" rel="noopener noreferrer" href={url}>
              <Wind size={16} /> {label} <ExternalLink size={14} style={{ marginLeft: "auto" }} />
            </a>
          ))}
          <p className="muted">Vérifiez aussi le vent max pour le drone dans la fiche « Drone », et le plan pluie dans le lieu concerné.</p>
        </div>
      )}

      {tab === "travel" && <a className="btn gold full" href="#/trajets">Calculer les trajets et les heures de départ</a>}
      {tab === "travel" && (
        <div className="stack">
          <div className="list">
            {venues.length ? (
              venues.map((v) => (
                <div className="row" key={v.id}>
                  <MapPin size={20} />
                  <span className="row-main">
                    <strong>{v.title}</strong>
                    <small>{String(v.address || "Adresse à compléter")}</small>
                  </span>
                  {v.address ? (
                    <a className="icon-btn gold" aria-label={"Itinéraire vers " + v.title} target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(String(v.address))}`}>
                      <Navigation size={17} />
                    </a>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="row">
                <Car size={20} />
                <span className="row-main">Aucun lieu avec adresse pour l’instant.</span>
              </div>
            )}
          </div>
          <p className="muted">Ouvre l’itinéraire dans Google Maps (application ou navigateur). Prévoyez une marge pour le repérage express et l’installation.</p>
        </div>
      )}
    </Screen>
  );
}
