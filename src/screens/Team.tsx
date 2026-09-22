import { useState } from "react";
import { Clapperboard, Phone, Users } from "lucide-react";
import type { Item } from "../types";
import { done, makeItem } from "../model";
import { useProject } from "../store";
import { operatorConflicts } from "../schedule";
import { Empty, Row, Screen, Tabs } from "../ui";
import { ItemEditor, itemsOf, MemberAvatar, nextOrder, QuickAdd } from "./common";

export default function Team() {
  const { project: p, update } = useProject();
  const [tab, setTab] = useState<"team" | "roles" | "missions">("team");
  const [editing, setEditing] = useState<Item | null>(null);
  const team = itemsOf(p, "team");
  const conflicts = operatorConflicts(p);
  const roles = [...new Set(team.map((m) => String(m.role || "Rôle à définir")))];
  const assigned = (m: Item, module: string) => p.items.filter((i) => i.module === module && i.operatorId === m.id && i.status !== "archivé");
  return (
    <Screen title="Mon équipe" backTo="/accueil">
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          ["team", "Équipe", team.length],
          ["roles", "Rôles"],
          ["missions", "Qui fait quoi ?"],
        ]}
      />
      {conflicts.length > 0 && (
        <div className="notice red" style={{ marginBottom: 12 }}>
          <Users size={17} />
          <div>
            {conflicts.map((c, n) => (
              <div key={n}>
                <b>{c.operator.title}</b> est sur « {c.a.title} » et « {c.b.title} » en même temps.
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === "team" && (
        <div className="list">
          {team.map((m) => (
            <Row
              key={m.id}
              lead={<MemberAvatar member={m} projectId={p.id} />}
              title={m.title}
              sub={[m.role, m.camera].filter(Boolean).join(" · ") || "Rôle à définir"}
              onClick={() => setEditing(m)}
              trail={
                <>
                  <a
                    className="icon-btn"
                    href={"#/pack/" + m.id}
                    aria-label={"Voir les plans de " + m.title}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Clapperboard size={18} />
                  </a>
                  {m.phone ? (
                    <a className="icon-btn" href={"tel:" + String(m.phone).replace(/\s/g, "")} aria-label={"Appeler " + m.title} onClick={(e) => e.stopPropagation()}>
                      <Phone size={18} />
                    </a>
                  ) : undefined}
                </>
              }
            />
          ))}
          <QuickAdd placeholder="Prénom du nouveau membre" onAdd={(title) => update({ ...p, items: [...p.items, makeItem("team", title, { order: nextOrder(p, "team") })] }, "Membre ajouté")} />
        </div>
      )}
      {tab === "roles" && (
        <div className="stack">
          {roles.map((role) => (
            <div className="list" key={role}>
              <div className="list-head">{role}</div>
              {team
                .filter((m) => String(m.role || "Rôle à définir") === role)
                .map((m) => (
                  <Row key={m.id} lead={<MemberAvatar member={m} projectId={p.id} />} title={m.title} sub={String(m.mission || m.camera || "")} onClick={() => setEditing(m)} />
                ))}
            </div>
          ))}
          {!team.length && <Empty title="Aucun membre" />}
        </div>
      )}
      {tab === "missions" && (
        <div className="stack">
          {team.map((m) => {
            const stages = assigned(m, "stages");
            const shots = assigned(m, "shots");
            const tasks = assigned(m, "checklists");
            const gear = assigned(m, "equipment");
            return (
              <div className="card" key={m.id}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                  <MemberAvatar member={m} projectId={p.id} />
                  <div>
                    <h3>{m.title}</h3>
                    <small className="muted">{String(m.role || "")}</small>
                  </div>
                </div>
                <div className="kv">
                  <div>
                    <span>Étapes</span>
                    <b>{stages.map((s) => `${s.time ?? ""} ${s.title}`).join(", ") || "—"}</b>
                  </div>
                  <div>
                    <span>Plans</span>
                    <b>
                      {shots.filter(done).length}/{shots.length}
                    </b>
                  </div>
                  <div>
                    <span>Tâches</span>
                    <b>
                      {tasks.filter(done).length}/{tasks.length}
                    </b>
                  </div>
                  <div>
                    <span>Matériel</span>
                    <b>{gear.map((g) => g.title).join(", ") || "—"}</b>
                  </div>
                </div>
                {m.mission && <p className="muted" style={{ marginTop: 8 }}>{String(m.mission)}</p>}
              </div>
            );
          })}
          <p className="muted">Affectez un responsable dans chaque étape, plan, tâche ou matériel : il apparaît ici et dans son Mode Jour J.</p>
        </div>
      )}
      {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
    </Screen>
  );
}
