import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useStore } from "../store";
import { newProject } from "../model";
import { buildSkeleton, features } from "../features";
import { navigate, Sheet } from "../ui";

const styles = ["Cinématique", "Luxe éditorial / Vogue", "Néoclassique", "Dynamique", "Fast cuts", "Documentaire", "Hybride"];

/** Création guidée en 3 étapes : on ne crée que ce qui concerne ce mariage. */
export default function ShootWizard({ onClose }: { onClose: () => void }) {
  const { w, change } = useStore();
  const [step, setStep] = useState(0);
  const [p, setP] = useState(() => newProject(""));
  const [selected, setSelected] = useState<string[]>(["religious", "reception", "bridal", "dance", "photo"]);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const valid = p.couple.trim().length > 0;
  function create() {
    const name = p.couple.trim();
    const project = { ...p, name, couple: name, features: selected, items: buildSkeleton(selected) };
    change({ ...w, projects: [...w.projects, project], activeProjectId: project.id }, "Tournage créé — tout est prêt à personnaliser");
    onClose();
    navigate("/tournage");
  }
  return (
    <Sheet title={["Le couple et la date", "Le programme", "Le film"][step]} onClose={onClose}>
      <div className="stack">
        <div className="progress" aria-label={`Étape ${step + 1} sur 3`}>
          <span style={{ width: `${((step + 1) / 3) * 100}%`, background: "var(--gold-2)" }} />
        </div>
        {step === 0 && (
          <div className="form-grid">
            <label className="field span">
              Noms du couple
              <input autoFocus required placeholder="Ex. Laura & Adelphe" value={p.couple} onChange={(e) => setP({ ...p, couple: e.target.value })} />
            </label>
            <label className="field">
              Date du mariage
              <input type="date" value={p.date} onChange={(e) => setP({ ...p, date: e.target.value })} />
            </label>
            <label className="field">
              Nombre d’invités
              <input type="number" min="0" inputMode="numeric" value={p.guests || ""} onChange={(e) => setP({ ...p, guests: Number(e.target.value) })} />
            </label>
            <label className="field span">
              Lieu principal
              <input placeholder="Domaine, ville" value={p.venue} onChange={(e) => setP({ ...p, venue: e.target.value })} />
            </label>
            <label className="field span">
              Services vendus
              <input placeholder="Vidéo + Photo + Drone" value={p.services ?? ""} onChange={(e) => setP({ ...p, services: e.target.value })} />
            </label>
          </div>
        )}
        {step === 1 && (
          <>
            <p className="muted">Cochez ce qui est prévu. Chaque option ajoute ses étapes, plans essentiels, checklists et rappels.</p>
            {(["Cérémonies", "Moments", "Prestations"] as const).map((group) => (
              <div key={group} className="stack" style={{ gap: 8 }}>
                <strong>{group}</strong>
                <div className="choices">
                  {features
                    .filter((f) => f.group === group)
                    .map((f) => (
                      <button type="button" key={f.id} className={"choice" + (selected.includes(f.id) ? " on" : "")} aria-pressed={selected.includes(f.id)} onClick={() => toggle(f.id)}>
                        {selected.includes(f.id) && <Check size={15} />}
                        {f.label}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </>
        )}
        {step === 2 && (
          <div className="form-grid">
            <div className="field span">
              Style du film
              <div className="choices">
                {styles.map((s) => (
                  <button type="button" key={s} className={"choice" + (p.style === s ? " on" : "")} onClick={() => setP({ ...p, style: s })}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              Film final (minutes)
              <input type="number" min="1" inputMode="numeric" value={p.filmMinutes ?? ""} placeholder="8" onChange={(e) => setP({ ...p, filmMinutes: Number(e.target.value) || undefined })} />
            </label>
            <label className="field">
              Teaser (secondes)
              <input type="number" min="10" inputMode="numeric" value={p.teaserSeconds ?? ""} placeholder="60" onChange={(e) => setP({ ...p, teaserSeconds: Number(e.target.value) || undefined })} />
            </label>
            <label className="field span">
              À capturer absolument
              <textarea placeholder="Ex. la grand-mère pendant les vœux, les alliances" value={p.mustHave} onChange={(e) => setP({ ...p, mustHave: e.target.value })} />
            </label>
            <label className="field span">
              Traditions, contraintes, demandes du couple
              <textarea value={p.priorities} onChange={(e) => setP({ ...p, priorities: e.target.value })} />
            </label>
          </div>
        )}
        <div className="form-actions">
          {step > 0 ? (
            <button className="btn" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={17} /> Retour
            </button>
          ) : (
            <button className="btn" onClick={onClose}>
              Annuler
            </button>
          )}
          {step < 2 ? (
            <button className="btn gold" disabled={!valid} onClick={() => setStep(step + 1)}>
              Continuer <ArrowRight size={17} />
            </button>
          ) : (
            <button className="btn gold" disabled={!valid} onClick={create}>
              <Check size={17} /> Créer le tournage
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
