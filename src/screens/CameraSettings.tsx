import { useState } from "react";
import { BarChart3, Copy, Palette, Plus, Zap } from "lucide-react";
import { makeItem } from "../model";
import { useProject } from "../store";
import { Empty, Screen, Sheet, Tabs } from "../ui";
import { itemsOf, nextOrder } from "./common";

const params: [string, string, string[]][] = [
  ["format", "Format", ["4K (UHD)", "4K DCI", "1080p", "6K"]],
  ["fps", "Fréquence", ["25 fps", "50 fps", "100 fps", "24 fps", "30 fps", "60 fps", "120 fps"]],
  ["profile", "Profil d’image", ["S-Log3", "S-Cinetone", "HLG", "Standard", "C-Log 3", "V-Log"]],
  ["wb", "Balance des blancs", ["5600K", "3200K", "4300K", "Auto", "Mesurée sur place"]],
  ["aperture", "Ouverture", ["f/1.4", "f/1.8", "f/2.8", "f/4", "f/5.6"]],
  ["iso", "ISO", ["Auto (100-3200)", "800", "3200", "12800", "Base native"]],
  ["shutter", "Obturateur", ["1/50", "1/100", "1/200", "180°"]],
  ["nd", "ND", ["Selon lumière", "ND variable", "ND 0.9", "ND 1.8"]],
];

const tips: Record<string, [string, string[]]> = {
  zebras: [
    "Zébras",
    [
      "Réglez les zébras à 70 % pour la peau en profil standard, autour de 94-95 % pour ne protéger que les hautes lumières.",
      "En S-Log3, repérez plutôt l’écrêtage (zébras hauts) et exposez la peau avec la false color ou un repère d’exposition.",
      "Robe blanche : aucune zone de la robe ne doit être zébrée à 100 %.",
    ],
  ],
  false: [
    "False Color",
    [
      "Vert/gris moyen ≈ gris 18 % ; rose ≈ peau bien exposée selon l’échelle de votre moniteur.",
      "Rouge = écrêtage : baissez l’exposition ou ajoutez du ND.",
      "Bleu/violet = noirs bouchés : ouvrez ou remontez l’éclairage.",
    ],
  ],
  histo: [
    "Histogramme",
    [
      "Évitez la pile collée à droite (hautes lumières perdues), surtout sur la robe et les ciels.",
      "Scène de soirée : acceptez des noirs à gauche, protégez les visages.",
      "Contrôlez-le après chaque changement de lieu ou de lumière.",
    ],
  ],
};

/** Réglages par caméra, à harmoniser entre tous les boîtiers pour un multicam propre. */
export default function CameraSettings() {
  const { project: p, patchItem, update } = useProject();
  const cameras = itemsOf(p, "equipment").filter((i) => /cam|boîtier|boitier|drone/i.test(String(i.category ?? "") + " " + i.title));
  const [active, setActive] = useState(cameras[0]?.id ?? "");
  const [tip, setTip] = useState<string | null>(null);
  const cam = cameras.find((c) => c.id === active) ?? cameras[0];
  const add = () => {
    const item = makeItem("equipment", `Cam ${String.fromCharCode(65 + cameras.length)}`, { category: "Caméra", order: nextOrder(p, "equipment") });
    update({ ...p, items: [...p.items, item] }, "Caméra ajoutée");
    setActive(item.id);
  };
  return (
    <Screen
      title="Réglages caméra"
      backTo="/plus"
      actions={
        <button className="icon-btn gold" aria-label="Ajouter une caméra" onClick={add}>
          <Plus size={20} />
        </button>
      }
    >
      {cam ? (
        <>
          <Tabs value={cam.id} onChange={setActive} options={cameras.map((c) => [c.id, String(c.model || c.title)] as [string, string])} />
          <div className="list">
            <div className="list-head">
              Paramètres · {cam.title}
              <span className="muted">{String(cam.model ?? "")}</span>
            </div>
            {params.map(([key, label, values]) => (
              <label key={key} className="row" style={{ minHeight: 52 }}>
                <span className="row-main">
                  <strong style={{ fontWeight: 500, color: "var(--ink-2)" }}>{label}</strong>
                </span>
                <input
                  className="input"
                  style={{ maxWidth: 190, minHeight: 38, textAlign: "right", fontWeight: 650 }}
                  list={"cam-" + key}
                  value={String(cam[key] ?? "")}
                  placeholder="—"
                  onChange={(e) => patchItem(cam.id, { [key]: e.target.value })}
                />
                <datalist id={"cam-" + key}>
                  {values.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </label>
            ))}
          </div>
          {cameras.length > 1 && (
            <button
              className="btn full"
              style={{ marginTop: 12 }}
              onClick={() => {
                const shared = ["format", "fps", "shutter", "wb"] as const;
                update(
                  {
                    ...p,
                    items: p.items.map((i) =>
                      cameras.some((c) => c.id === i.id) && i.id !== cam.id ? { ...i, ...Object.fromEntries(shared.map((k) => [k, cam[k]])) } : i,
                    ),
                  },
                  "Format, fréquence, obturateur et WB alignés sur toutes les caméras",
                );
              }}
            >
              <Copy size={16} /> Aligner les autres caméras (format, fps, obturateur, WB)
            </button>
          )}
          <p className="muted" style={{ margin: "10px 2px" }}>
            Base indicative : mesurez la balance des blancs sur place et adaptez ISO/ND à la lumière réelle.
          </p>
        </>
      ) : (
        <Empty
          title="Aucune caméra"
          text="Ajoutez vos boîtiers pour noter les réglages de chacun et les harmoniser."
          action={
            <button className="btn gold" onClick={add}>
              <Plus size={17} /> Ajouter une caméra
            </button>
          }
        />
      )}
      <div className="section-title">Aides à l’exposition</div>
      <div className="tiles">
        <button className="tile dark" onClick={() => setTip("zebras")}>
          <Zap size={22} />
          <strong>Zébras</strong>
        </button>
        <button className="tile dark" onClick={() => setTip("false")}>
          <Palette size={22} />
          <strong>False Color</strong>
        </button>
        <button className="tile dark" onClick={() => setTip("histo")}>
          <BarChart3 size={22} />
          <strong>Histogramme</strong>
        </button>
      </div>
      {tip && (
        <Sheet title={tips[tip][0]} onClose={() => setTip(null)}>
          <ul className="stack" style={{ paddingLeft: 18 }}>
            {tips[tip][1].map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Sheet>
      )}
    </Screen>
  );
}
