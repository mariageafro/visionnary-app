import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Layers, ListTree, PanelTop } from "lucide-react";

const read = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};
const write = (key: string, on: boolean) => {
  try {
    localStorage.setItem(key, on ? "1" : "0");
  } catch {
    /* préférence non mémorisée */
  }
};

/**
 * Raccourcis flottants, où qu'on soit dans la page : remonter, masquer/afficher la barre d'outils
 * du haut, sélectionner. Le tout se replie en une petite poignée.
 */
export default function FloatDock({ selectMode, onSelect, onExit }: { selectMode: boolean; onSelect: () => void; onExit: () => void }) {
  const [jump, setJump] = useState<string[] | null>(null);
  const [folded, setFolded] = useState(() => read("visionnary-dock-folded"));
  const [toolsHidden, setToolsHidden] = useState(() => read("visionnary-tools-hidden"));
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    document.body.classList.toggle("tools-hidden", toolsHidden);
    return () => document.body.classList.remove("tools-hidden");
  }, [toolsHidden]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 300 || (document.querySelector(".main")?.scrollTop ?? 0) > 300);
    window.addEventListener("scroll", on, true);
    return () => window.removeEventListener("scroll", on, true);
  }, []);
  // Un clic ailleurs (ni vignette, ni bouton, ni barre) ou Échap termine la sélection.
  useEffect(() => {
    if (!selectMode) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (t && !t.closest("[data-reorder], .select-bar, .float-dock, button, a, input, select, label, .sim-panel, .pose-select")) onExit();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onExit();
    document.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [selectMode, onExit]);
  const openJump = () => {
    if (jump) return setJump(null);
    const names = [...document.querySelectorAll<HTMLElement>("[data-reorder-section]")].map((el) => el.dataset.reorderSection ?? "").filter(Boolean);
    setJump([...new Set(names)]);
  };
  const goTo = (name: string) => {
    const el = [...document.querySelectorAll<HTMLElement>("[data-reorder-section]")].find((x) => x.dataset.reorderSection === name);
    setJump(null);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => window.scrollBy(0, -70), 400);
  };
  const up = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.querySelector(".main")?.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="float-dock" aria-label="Raccourcis">
      {!folded && (
        <>
          {jump && <div className="dock-jump" role="menu">{jump.length ? jump.map((n) => <button key={n} role="menuitem" onClick={() => goTo(n)}>{n}</button>) : <span className="muted">Aucune section</span>}</div>}
          <button className={"dock-btn" + (jump ? " on" : "")} onClick={openJump} aria-label="Aller à une section" title="Aller à une section"><ListTree size={19} /></button>
          {scrolled && <button className="dock-btn" onClick={up} aria-label="Remonter en haut" title="Remonter en haut"><ChevronUp size={20} /></button>}
          <button className={"dock-btn" + (toolsHidden ? "" : " on")} aria-pressed={!toolsHidden} onClick={() => { setToolsHidden(!toolsHidden); write("visionnary-tools-hidden", !toolsHidden); }} aria-label={toolsHidden ? "Afficher la barre d'outils" : "Masquer la barre d'outils"} title={toolsHidden ? "Afficher la barre d'outils" : "Masquer la barre d'outils"}><PanelTop size={19} /></button>
          {!selectMode && <button className="dock-btn wide" onClick={onSelect} title="Sélectionner plusieurs éléments (ou ⌘/Ctrl/Maj + clic)"><Layers size={18} /> Sélectionner</button>}
        </>
      )}
      <button className="dock-btn" onClick={() => { setFolded(!folded); write("visionnary-dock-folded", !folded); }} aria-label={folded ? "Déplier les raccourcis" : "Replier les raccourcis"}>{folded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
    </div>
  );
}
