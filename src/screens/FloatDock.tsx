import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Layers, PanelTop } from "lucide-react";

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
export default function FloatDock({ selectMode, onSelect }: { selectMode: boolean; onSelect: () => void }) {
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
  const up = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.querySelector(".main")?.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="float-dock" aria-label="Raccourcis">
      {!folded && (
        <>
          {scrolled && <button className="dock-btn" onClick={up} aria-label="Remonter en haut" title="Remonter en haut"><ChevronUp size={20} /></button>}
          <button className={"dock-btn" + (toolsHidden ? "" : " on")} aria-pressed={!toolsHidden} onClick={() => { setToolsHidden(!toolsHidden); write("visionnary-tools-hidden", !toolsHidden); }} aria-label={toolsHidden ? "Afficher la barre d'outils" : "Masquer la barre d'outils"} title={toolsHidden ? "Afficher la barre d'outils" : "Masquer la barre d'outils"}><PanelTop size={19} /></button>
          {!selectMode && <button className="dock-btn wide" onClick={onSelect} title="Sélectionner plusieurs éléments (ou ⌘/Ctrl/Maj + clic)"><Layers size={18} /> Sélectionner</button>}
        </>
      )}
      <button className="dock-btn" onClick={() => { setFolded(!folded); write("visionnary-dock-folded", !folded); }} aria-label={folded ? "Déplier les raccourcis" : "Replier les raccourcis"}>{folded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
    </div>
  );
}
