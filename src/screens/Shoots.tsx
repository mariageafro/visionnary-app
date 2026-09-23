import DemoButton from "./DemoButton";
import { useState } from "react";
import { Clapperboard, Plus } from "lucide-react";
import { useStore } from "../store";
import { coverage } from "../model";
import { Empty, Screen, Tabs, navigate } from "../ui";
import { CoupleAvatar, dayMonth, daysUntil } from "./common";
import ShootWizard from "./ShootWizard";

const statusDot = (status: string) =>
  status === "montage" ? "blue" : status === "terminé" ? "green" : status === "jour J" ? "red" : "";

export default function Shoots() {
  const { w, setActive } = useStore();
  const [tab, setTab] = useState<"next" | "past" | "archive">("next");
  const [wizard, setWizard] = useState(false);
  const shown = w.projects
    .filter((p) =>
      tab === "archive" ? p.status === "archivé" : p.status !== "archivé" && (tab === "next" ? (daysUntil(p.date) ?? 0) >= 0 : (daysUntil(p.date) ?? 0) < 0),
    )
    .sort((a, b) => (tab === "past" ? -1 : 1) * (a.date || "9999").localeCompare(b.date || "9999"));
  const groups = new Map<string, typeof shown>();
  for (const p of shown) {
    const key = p.date ? new Date(p.date + "T12:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "Date à définir";
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return (
    <Screen
      title="Mes tournages"
      actions={
        <button className="icon-btn gold" aria-label="Nouveau tournage" onClick={() => setWizard(true)}>
          <Plus size={20} />
        </button>
      }
    >
      <DemoButton/>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          ["next", "À venir"],
          ["past", "Passés"],
          ["archive", "Archivés"],
        ]}
      />
      {[...groups].map(([month, projects]) => (
        <section key={month}>
          <div className="section-title">{month}</div>
          <div className="stack" style={{ gap: 8 }}>
            {projects.map((p) => {
              const { day, month: m } = dayMonth(p.date);
              const c = coverage(p);
              return (
                <button
                  key={p.id}
                  className="next-shoot"
                  onClick={() => {
                    setActive(p.id);
                    navigate("/accueil");
                  }}
                >
                  <span className="date-block">
                    <b>{day}</b>
                    <small>{m}</small>
                  </span>
                  <CoupleAvatar project={p} />
                  <span className="row-main">
                    <strong>{p.name}</strong>
                    <small>{[p.ceremony, p.venue].filter(Boolean).join(" · ") || "Lieu à définir"}</small>
                    <small>
                      {p.status} · {c.completed}/{c.total} plans
                      {p.features?.includes("démo") ? " · démo" : ""}
                    </small>
                  </span>
                  <span className={"dot " + statusDot(p.status)} />
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {!shown.length && (
        <Empty
          icon={<Clapperboard size={34} />}
          title={tab === "next" ? "Aucun tournage à venir" : tab === "past" ? "Aucun tournage passé" : "Aucun tournage archivé"}
          action={
            tab === "next" && (
              <button className="btn gold" onClick={() => setWizard(true)}>
                <Plus size={17} /> Nouveau tournage
              </button>
            )
          }
        />
      )}
      <div className="fab-bar">
        <button className="btn gold full" onClick={() => setWizard(true)}>
          <Plus size={18} /> Nouveau tournage
        </button>
      </div>
      {wizard && <ShootWizard onClose={() => setWizard(false)} />}
    </Screen>
  );
}
