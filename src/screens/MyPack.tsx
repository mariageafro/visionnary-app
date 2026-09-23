import { Camera, Phone, Printer, Radar } from "lucide-react";
import type { Item } from "../types";
import { done, sectionOf } from "../model";
import { operatorDayOrder } from "../moments";
import { useProject } from "../store";
import { Empty, navigate, Row, Screen } from "../ui";
import { itemsOf, MemberAvatar, titleOf } from "./common";

/**
 * Pack individuel d'un cadreur : uniquement ses plans, dans l'ordre réel de sa journée,
 * imprimable et lisible hors ligne — pas besoin de fouiller les 100+ plans du tournage
 * pour retrouver les siens.
 */
export default function MyPack({ operatorId }: { operatorId: string }) {
  const { project: p } = useProject();
  const member = p.items.find((i) => i.id === operatorId && i.module === "team");
  const stages = itemsOf(p, "stages");
  const shots = operatorDayOrder(p, operatorId);
  const missions = stages.filter((stage) => stage.operatorId === operatorId);
  const tasks = itemsOf(p, "checklists").filter((item) => item.operatorId === operatorId);
  const reminders = itemsOf(p, "reminders").filter((item) => item.operatorId === operatorId);
  const gear = itemsOf(p, "equipment").filter((item) => item.operatorId === operatorId);
  const audio = itemsOf(p, "audio").filter((item) => item.operatorId === operatorId);
  const scenes = (p.scenePlans ?? []).filter((scene) => missions.some((stage) => stage.id === scene.stageId) || scene.elements.some((element) => element.operatorId === operatorId));

  if (!member)
    return (
      <Screen title="Membre introuvable" backTo="/equipe">
        <Empty title="Ce membre n’existe plus" text="Il a peut-être été retiré de l’équipe." />
      </Screen>
    );

  type Group = { key: string; label: string; sub?: string; shots: Item[] };
  const groups: Group[] = [];
  for (const s of shots) {
    const stage = stages.find((st) => st.id === s.stageId);
    const key = stage?.id ?? sectionOf(s);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.shots.push(s);
    else {
      const venue = stage ? titleOf(p, stage.venueId) : undefined;
      const address = stage ? p.items.find((v) => v.id === stage.venueId)?.address : undefined;
      groups.push({
        key,
        label: stage ? `${String(stage.time || "—:—")} · ${stage.title}` : sectionOf(s),
        sub: [venue, address].filter(Boolean).join(" · ") || undefined,
        shots: [s],
      });
    }
  }

  const openInFieldMode = () => {
    try {
      localStorage.setItem("visionnary-me-" + p.id, operatorId);
    } catch {
      /* filtre non mémorisé, le mode Jour J s'ouvrira non filtré */
    }
    navigate("/jourj");
  };

  return (
    <Screen
      title="Mes plans"
      backTo="/equipe"
      actions={
        <>
          <button className="icon-btn" aria-label="Ouvrir en Mode Jour J filtré sur ce cadreur" onClick={openInFieldMode}>
            <Radar size={20} />
          </button>
          <button className="icon-btn" aria-label="Imprimer / enregistrer en PDF" onClick={() => window.print()}>
            <Printer size={20} />
          </button>
        </>
      }
    >
      <div className="card no-print" style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <MemberAvatar member={member} projectId={p.id} />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{member.title}</h2>
          <p className="muted" style={{ margin: "2px 0 0" }}>
            {[member.role, member.camera, member.lenses, member.audioKit, member.intercom].filter(Boolean).join(" · ") || "Rôle à définir"}
          </p>
        </div>
        {member.phone ? (
          <a className="icon-btn" href={"tel:" + String(member.phone).replace(/\s/g, "")} aria-label={"Appeler " + member.title}>
            <Phone size={18} />
          </a>
        ) : null}
      </div>

      <div className="card no-print" style={{ marginTop: 12 }}>
        <div className="section-title">Ma journée</div>
        <div className="kv">
          <div><span>Étapes</span><b>{missions.map((item) => `${item.time || "—:—"} · ${item.title}`).join(" / ") || "Aucune étape assignée"}</b></div>
          <div><span>Prochaine mission</span><b>{missions.find((item) => !done(item))?.title || shots.find((item) => !done(item))?.title || "Aucune mission restante"}</b></div>
        </div>
      </div>
      {[{ title: "Matériel attribué", items: gear.map((item) => `${item.title}${item.quantity ? ` ×${item.quantity}` : ""}${item.state ? ` · ${item.state}` : ""}`) }, { title: "Checklist personnelle", items: tasks.map((item) => `${done(item) ? "✓" : "○"} ${item.title}`) }, { title: "Rappels personnels", items: reminders.map((item) => item.title) }, { title: "Audio", items: audio.map((item) => `${item.title}${item.source ? ` · ${item.source}` : ""}`) }, { title: "Plans de scène", items: scenes.map((scene) => scene.name) }].map((group) => <section key={group.title} className="card no-print" style={{ marginTop: 12 }}><div className="section-title">{group.title}<span>{group.items.length}</span></div>{group.items.length ? <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">Aucun élément assigné.</p>}</section>)}

      <div className="card no-print" style={{ marginTop: 12 }}>
        <div className="section-title" style={{ margin: 0 }}>
          Ses plans
          <span>
            {shots.filter(done).length}/{shots.length} tournés
          </span>
        </div>
        <div className="progress" style={{ marginTop: 8 }}>
          <span style={{ width: `${shots.length ? (shots.filter(done).length / shots.length) * 100 : 0}%` }} />
        </div>
      </div>

      {groups.length ? (
        groups.map((g) => (
          <section key={g.key + g.shots[0].id} className="no-print">
            <div className="section-title">
              {g.label}
              {g.sub && <span>{g.sub}</span>}
            </div>
            <div className="list">
              {g.shots.map((s) => (
                <Row
                  key={s.id}
                  lead={<Camera size={18} />}
                  title={s.title}
                  sub={[s.framing, s.movement].filter(Boolean).join(" · ") || undefined}
                  done={done(s)}
                  trail={s.priority === "MUST HAVE" ? <span className="chip red">MUST HAVE</span> : undefined}
                />
              ))}
            </div>
          </section>
        ))
      ) : (
        <Empty
          icon={<Camera size={32} />}
          title="Aucun plan assigné"
          text={`Affectez ${member.title} à des plans depuis « Plans & scènes » pour qu’ils apparaissent ici.`}
        />
      )}

      <section className="print-report">
        <h1>VISIONNARY · {member.title}</h1>
        <p>
          {p.name} · {p.date}
        </p>
        <p>{[member.role, member.camera, member.phone].filter(Boolean).join(" · ")}</p>
        <p>{[member.lenses, member.audioKit, member.batteries, member.cards, member.accessories, member.intercom].filter(Boolean).join(" · ")}</p>
        <h2>Étapes et missions</h2><ul>{missions.map((item) => <li key={item.id}>{item.time || "—:—"} · {item.title}</li>)}</ul>
        <h2>Matériel personnel</h2><ul>{gear.map((item) => <li key={item.id}>{item.title}{item.quantity ? ` ×${item.quantity}` : ""} · {String(item.state || "état à vérifier")}{item.connection ? " · Branchement : " + item.connection : ""}{item.configuration ? " · " + item.configuration : ""}{item.quickProcedure ? " · Procédure : " + item.quickProcedure : ""}{item.commonProblem ? " · Problème : " + item.commonProblem : ""}{item.solution ? " · Solution : " + item.solution : ""}{item.notes ? " · Note : " + item.notes : ""}</li>)}</ul>
        <h2>Checklist et rappels</h2><ul>{[...tasks, ...reminders].map((item) => <li key={item.id}>[{done(item) ? "x" : " "}] {item.title}</li>)}</ul>
        <h2>Audio et scènes</h2><ul>{[...audio.map((item) => item.title), ...scenes.map((scene) => scene.name)].map((item) => <li key={item}>{item}</li>)}</ul>
        {groups.map((g) => (
          <div key={g.key + g.shots[0].id}>
            <h2>
              {g.label}
              {g.sub ? ` — ${g.sub}` : ""}
            </h2>
            {g.shots.map((s) => (
              <p key={s.id}>
                [{done(s) ? "x" : " "}] {s.title} — {[s.framing, s.movement].filter(Boolean).join(" · ") || "—"}
                {s.priority === "MUST HAVE" ? " · MUST HAVE" : ""}
              </p>
            ))}
          </div>
        ))}
      </section>
    </Screen>
  );
}
