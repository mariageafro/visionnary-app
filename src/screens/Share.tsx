import { useState } from "react";
import { Copy, MessageCircle, Send, Users } from "lucide-react";
import { useProject } from "../store";
import { runStages } from "../schedule";
import { Empty, Screen, Tabs } from "../ui";
import { itemsOf } from "./common";

/** Brief texte prêt à copier/coller ou envoyer par SMS/WhatsApp — sans backend, sans API messagerie. */
function briefFor(p: ReturnType<typeof useProject>["project"], memberId?: string) {
  const stages = runStages(p).filter((r) => !memberId || r.item.operatorId === memberId);
  const shots = itemsOf(p, "shots").filter((s) => !memberId || s.operatorId === memberId);
  const tasks = itemsOf(p, "checklists").filter((t) => !memberId || t.operatorId === memberId);
  const lines = [
    `VISIONNARY · ${p.name}`,
    p.date ? `${p.date} · ${p.venue || ""}` : p.venue,
    "",
    "DÉROULÉ",
    ...stages.map((r) => `${String(r.item.time || "—:—")} — ${r.item.title}`),
  ];
  if (shots.length) lines.push("", "PLANS", ...shots.slice(0, 20).map((s) => `• ${s.title} (${s.framing || "—"})`));
  if (tasks.length) lines.push("", "CHECKLIST", ...tasks.map((t) => `[ ] ${t.title}`));
  if (p.mustHave) lines.push("", `À CAPTURER : ${p.mustHave}`);
  return lines.filter(Boolean).join("\n");
}

export default function Share() {
  const { project: p } = useProject();
  const [tab, setTab] = useState<"team" | "custom">("team");
  const [text, setText] = useState("");
  const [copied, setCopied] = useState("");
  const team = itemsOf(p, "team");

  async function copy(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      /* copie manuelle si l'API presse-papiers est indisponible */
    }
  }

  return (
    <Screen title="Communication" backTo="/plus">
      <p className="muted" style={{ marginBottom: 12 }}>
        Préparez un brief texte à copier ou envoyer par SMS/WhatsApp — aucun message n’est envoyé automatiquement.
      </p>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          ["team", "Par membre", team.length],
          ["custom", "Message libre"],
        ]}
      />
      {tab === "team" ? (
        team.length ? (
          <div className="list">
            {team.map((m) => {
              const brief = briefFor(p, m.id);
              const phone = String(m.phone || "").replace(/\s/g, "");
              return (
                <div className="row" key={m.id} style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
                  <span className="row-main">
                    <strong>{m.title}</strong>
                    <small>{String(m.role || "")}</small>
                  </span>
                  <span className="row-trail">
                    <button className="icon-btn" aria-label={"Copier le brief de " + m.title} onClick={() => copy(brief, m.id)}>
                      <Copy size={17} />
                    </button>
                    {phone && (
                      <a className="icon-btn gold" aria-label={"WhatsApp " + m.title} href={`https://wa.me/${phone.replace(/^0/, "33").replace("+", "")}?text=${encodeURIComponent(brief)}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle size={17} />
                      </a>
                    )}
                    {phone && (
                      <a className="icon-btn" aria-label={"SMS " + m.title} href={`sms:${phone}?&body=${encodeURIComponent(brief)}`}>
                        <Send size={17} />
                      </a>
                    )}
                  </span>
                  {copied === m.id && <small className="chip green" style={{ width: "100%" }}>Copié</small>}
                </div>
              );
            })}
          </div>
        ) : (
          <Empty icon={<Users size={32} />} title="Aucun membre" text="Ajoutez votre équipe pour préparer un brief par personne." />
        )
      ) : (
        <div className="stack">
          <button className="btn full" onClick={() => setText(briefFor(p))}>
            Générer un brief pour toute l’équipe
          </button>
          <textarea className="input" rows={14} value={text} placeholder="Votre message…" onChange={(e) => setText(e.target.value)} />
          <div className="btn-row">
            <button className="btn gold" onClick={() => copy(text, "custom")}>
              <Copy size={16} /> Copier
            </button>
            <a className="btn" href={`sms:?&body=${encodeURIComponent(text)}`}>
              <Send size={16} /> SMS
            </a>
            <a className="btn" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>
              <MessageCircle size={16} /> WhatsApp
            </a>
          </div>
          {copied === "custom" && <p className="chip green">Copié</p>}
        </div>
      )}
    </Screen>
  );
}
