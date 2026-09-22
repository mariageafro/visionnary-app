import { useState } from "react";
import {
  Bell,
  Calculator,
  Camera,
  Clapperboard,
  Clock3,
  CloudSun,
  Cloud,
  Film,
  Flag,
  Focus,
  HardDrive,
  Images,
  Layers,
  LifeBuoy,
  MapPin,
  MessageCircle,
  Moon,
  NotebookPen,
  Play,
  ScanLine,
  Sun,
  SunMedium,
  Crosshair,
} from "lucide-react";
import type { Mode } from "../App";
import { useStore } from "../store";
import { moduleById } from "../model";
import { Row, Screen, Sheet, Tile } from "../ui";

const groups: [string, [string, string, typeof Bell, string?][]][] = [
  [
    "Sur le terrain",
    [
      ["/jourj", "Mode Jour J", Play, "Plan suivant, prises, minuteur"],
      ["/deroule", "Déroulé & régie", Clock3, "Retard, T-5, recalcul"],
      ["/rappels", "Rappels", Bell, "Poser → retirer"],
      ["planb", "Plans de secours", LifeBuoy, "Pluie, retard, lumière"],
      ["/fin", "Fin de tournage", Flag, "Récap & sauvegardes"],
    ],
  ],
  [
    "Préparer",
    [
      ["/m/shots", "Plans & scènes", Clapperboard],
      ["/m/inspirations", "Inspirations", Images, "Découper une vidéo en plans"],
      ["/cadrage", "Aides au cadrage", Crosshair],
      ["/reglages", "Réglages caméra", Camera],
      ["/scenes", "Plans de scène", Focus, "Lieu, caméras, lumières, mouvements"],
      ["/m/venues", "Lieux & repérage", MapPin],
      ["/meteo", "Météo, soleil & trajet", CloudSun],
      ["/couverture", "Calculer la couverture", Calculator, "Nombre de plans"],
      ["/presets", "Presets & templates", Layers],
      ["/notes", "Notes & idées", NotebookPen],
    ],
  ],
  [
    "Après & partage",
    [
      ["/montage", "Pré-montage", Film, "Timeline & EDL"],
      ["/m/postproduction", "Montage & livraison", ScanLine],
      ["/fichiers", "Fichiers & sauvegarde", HardDrive, "ZIP, exports, pack Jour J"],
      ["/communication", "Communication", MessageCircle, "Briefs à envoyer"],
      ["/sync", "Compte & synchro", Cloud],
    ],
  ],
];

export default function Tools({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const [planB, setPlanB] = useState(false);
  return (
    <Screen title="Outils rapides" backTo="/accueil">
      {groups.map(([title, tools]) => (
        <section key={title}>
          <div className="section-title">{title}</div>
          <div className="tiles wide">
            {tools.map(([path, label, Icon, sub]) =>
              path === "planb" ? (
                <Tile key={path} dark icon={<Icon size={22} />} title={label} sub={sub} onClick={() => setPlanB(true)} />
              ) : (
                <Tile key={path} dark href={path} icon={<Icon size={22} />} title={label} sub={sub} />
              ),
            )}
          </div>
        </section>
      ))}
      <div className="section-title">Affichage</div>
      <div className="tiles">
        {(
          [
            ["studio", "Studio", SunMedium, "Sombre et doré"],
            ["terrain", "Terrain", Sun, "Lisible en plein soleil"],
            ["night", "Nuit", Moon, "Discret en soirée"],
          ] as const
        ).map(([id, label, Icon, sub]) => (
          <button key={id} className={"tile" + (mode === id ? "" : " dark")} onClick={() => setMode(id)} aria-pressed={mode === id}>
            <Icon size={22} />
            <strong>{label}</strong>
            <small>{sub}</small>
          </button>
        ))}
      </div>
      {planB && <PlanBSheet onClose={() => setPlanB(false)} />}
    </Screen>
  );
}

function PlanBSheet({ onClose }: { onClose: () => void }) {
  const { project } = useStore();
  const items = (project?.items ?? []).filter((i) => i.planB || i.groundPlan);
  return (
    <Sheet title="Plans de secours" onClose={onClose}>
      <div className="list">
        {items.map((i) => (
          <Row key={i.id} title={i.title} sub={`${moduleById(i.module)?.label} · ${String(i.planB || i.groundPlan)}`} />
        ))}
        {!items.length && <Row title="Aucun plan B renseigné" sub="Ajoutez-en dans les étapes, plans, lieux (plan pluie) ou drone (plan au sol)." />}
      </div>
    </Sheet>
  );
}
