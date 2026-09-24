import { useState } from "react";
import { Bell, Camera, ChevronRight, Clapperboard, CloudSun, Images, ListChecks, Play, Search, Users, CalendarDays } from "lucide-react";
import type { Item } from "../types";
import { done, moduleById } from "../model";
import { useStore } from "../store";
import { dueReminders } from "../reminders";
import { projectSun } from "../schedule";
import { hhmm } from "../sun";
import { Row, Sheet, Tile, navigate } from "../ui";
import { daysUntil, fr, ItemEditor, itemsOf, jLabel } from "./common";
import "./home.css";

// Citations maison : pas de reproduction d'œuvres protégées.
const quotes = [
  "Une belle image, c’est 10 % de technique et 90 % d’attention.",
  "Le plan le plus précieux est souvent celui qu’on n’avait pas prévu. Préparez tout le reste.",
  "Filmez les mains : elles racontent ce que les visages retiennent.",
  "Arrivez tôt, repérez la lumière, et le jour J vous appartient.",
  "Deux copies, sinon zéro copie.",
  "Un réalisateur calme fait une équipe calme.",
  "Le son fait pleurer, l’image fait revivre.",
];

export default function Home() {
  const { w, project, setActive, patchItem } = useStore();
  const [search, setSearch] = useState(false);
  if (!project) return null;
  const upcoming = w.projects
    .filter((p) => !p.library && p.status !== "archivé" && (daysUntil(p.date) ?? 0) >= 0)
    .sort((a, b) => (a.date || "9").localeCompare(b.date || "9"));
  const next = upcoming[0] ?? project;
  const days = daysUntil(next.date);
  const avant = itemsOf(project, "checklists").filter((i) => (i.phase ?? "avant") === "avant");
  const gear = itemsOf(project, "equipment");
  const broken = gear.filter((i) => i.state === "panne").length;
  const shots = itemsOf(project, "shots");
  const refs = itemsOf(project, "inspirations");
  const team = itemsOf(project, "team");
  const sun = projectSun(project);
  const reminders = dueReminders(project)
    .filter((r) => !done(r.item) && r.active)
    .slice(0, 3);
  const quote = quotes[new Date().getDate() % quotes.length];
  return (
    <div className="screen home">
      <header className="home-head">
        <div>
          <h1>Bonjour{w.ownerName ? " " + w.ownerName : ""} 👋</h1>
          <p className="muted">Prêt pour un nouveau tournage ?</p>
        </div>
        <button className="icon-btn gold" aria-label="Rechercher" onClick={() => setSearch(true)}>
          <Search size={20} />
        </button>
      </header>

      {days === 0 && (
        <a className="jourj-banner" href="#/jourj">
          <span className="live-dot" />
          <div>
            <strong>C’est le jour J</strong>
            <small>{next.name} · ouvrir le mode terrain</small>
          </div>
          <Play size={22} fill="currentColor" />
        </a>
      )}

      <button
        className="next-shoot"
        onClick={() => {
          setActive(next.id);
          navigate("/tournage");
        }}
      >
        <span className="pill-icon">
          <CalendarDays size={19} />
        </span>
        <span className="row-main">
          <small>{fr(next.date, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</small>
          <strong>{next.name}</strong>
          <small>{next.venue || "Lieu à définir"}</small>
        </span>
        {days !== null && <span className="chip gold">{jLabel(days)}</span>}
        <ChevronRight size={20} />
      </button>

      <div className="tiles" style={{ marginTop: 12 }}>
        <Tile href="/tournages" icon={<Clapperboard size={22} />} title="Mes tournages" sub={`${upcoming.length} à venir`} />
        <Tile
          href="/checklist"
          icon={<ListChecks size={22} />}
          title="Checklist rapide"
          sub={
            <>
              <span className={"dot " + (avant.every(done) ? "green" : "")} />
              Avant de partir · {avant.filter(done).length}/{avant.length}
            </>
          }
        />
        <Tile
          href="/m/equipment"
          icon={<Camera size={22} />}
          title="Mon matériel"
          sub={
            <>
              <span className={"dot " + (broken ? "red" : "green")} />
              {gear.length ? (broken ? `${broken} en panne` : `${gear.length} éléments`) : "À lister"}
            </>
          }
        />
        <Tile href="/m/shots" icon={<Images size={22} />} title="Plans & inspirations" sub={`${shots.length} plans · ${refs.length} références`} />
        <Tile href="/equipe" icon={<Users size={22} />} title="Équipe" sub={`${team.length} membre${team.length > 1 ? "s" : ""}`} />
        <Tile
          href="/meteo"
          icon={<CloudSun size={22} />}
          title="Météo, soleil & trajet"
          sub={sun?.times.sunset ? `Coucher ${hhmm(sun.times.sunset)} · golden ${hhmm(sun.times.goldenEveningStart)}` : "Ajouter le GPS du lieu"}
        />
      </div>

      {reminders.length > 0 && (
        <>
          <div className="section-title">
            Prochains rappels
            <button onClick={() => navigate("/rappels")}>Tout voir</button>
          </div>
          <div className="list">
            {reminders.map((r) => (
              <Row
                key={r.item.id}
                lead={<Bell size={19} color="var(--red)" />}
                title={r.item.title}
                sub={(r.due ? hhmm(new Date(r.due)) + " · " : "") + r.reason}
                onClick={() => navigate("/rappels")}
              />
            ))}
          </div>
        </>
      )}

      <div className="quote" style={{ marginTop: 18 }}>
        « {quote} »<small>Citation du jour</small>
      </div>

      <a className="btn gold full home-jourj" href="#/jourj">
        <Play size={18} fill="currentColor" /> Mode Jour J · {project.name}
      </a>

      {search && <GlobalSearch onClose={() => setSearch(false)} patch={patchItem} />}
    </div>
  );
}

function GlobalSearch({ onClose }: { onClose: () => void; patch: (id: string, v: Partial<Item>) => void }) {
  const { w, project, setActive } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Item | null>(null);
  const needle = q.trim().toLowerCase();
  const results = needle
    ? w.projects.filter((p) => !p.library).flatMap((p) =>
        p.items
          .filter((i) => Object.values(i).some((v) => typeof v === "string" && v.toLowerCase().includes(needle)))
          .map((i) => ({ p, i })),
      )
    : [];
  if (open) return <ItemEditor item={open} onClose={() => setOpen(null)} />;
  return (
    <Sheet title="Rechercher" onClose={onClose}>
      <input className="input" autoFocus placeholder="Plan, personne, lieu, matériel, tâche…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="list" style={{ marginTop: 12 }}>
        {results.slice(0, 40).map(({ p, i }) => (
          <Row
            key={i.id}
            title={i.title}
            sub={`${moduleById(i.module)?.label} · ${p.name}`}
            chevron
            onClick={() => {
              if (p.id !== project?.id) setActive(p.id);
              setOpen(i);
            }}
          />
        ))}
        {needle && !results.length && <Row title="Aucun résultat" sub="Essayez un autre mot." />}
      </div>
    </Sheet>
  );
}
