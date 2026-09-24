import { FieldAlertRunner } from "./AlertControls";
import { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Home as HomeIcon,
  LayoutGrid,
  ListChecks,
  Play,
  Undo2,
  Redo2,
  Users,
  Camera,
  Images,
  Focus,
  CloudSun,
  HardDrive,
} from "lucide-react";
import { StoreProvider, useStore } from "./store";
import { navigate, Screen } from "./ui";
import { CoupleAvatar } from "./screens/common";
import TravelPlanner from "./screens/TravelPlanner";
import MissionBoard from "./screens/MissionBoard";
import Home from "./screens/Home";
import Shoots from "./screens/Shoots";
import Shoot from "./screens/Shoot";
import FieldMode from "./screens/FieldMode";
import Timeline from "./screens/Timeline";
import Stage from "./screens/Stage";
import Checklist from "./screens/Checklist";
import Reminders from "./screens/Reminders";
import Team from "./screens/Team";
import MyPack from "./screens/MyPack";
import Tools from "./screens/Tools";
import CameraSettings from "./screens/CameraSettings";
import Framing from "./screens/Framing";
import Weather from "./screens/Weather";
import Notes from "./screens/Notes";
import Files from "./screens/Files";
import Share from "./screens/Share";
import Wrap from "./screens/Wrap";
import ModuleScreen from "./screens/ModuleScreen";
import Inspirations from "./screens/Inspirations";
import Shots from "./screens/Shots";
import PoseBoard from "./screens/PoseBoard";
import ScenesList from "./scene/ScenesList";
import SceneDesigner from "./scene/SceneDesigner";
import Coverage from "./screens/Coverage";
import Sde from "./screens/Sde";
import Teaser from "./screens/Teaser";
import Library from "./screens/Library";
import References from "./screens/References";
import SeedLoader from "./screens/SeedLoader";
import InspirationLibrary from "./screens/InspirationLibrary";
import PresetsScreen from "./screens/Presets";
import Welcome from "./screens/Welcome";
import Spatial from "./Spatial";
import PreEdit from "./PreEdit";
import SyncPanel from "./SyncPanel";

const RESUME = "visionnary-resume";
/** Retient l'écran et la position de défilement ; à la réouverture on revient exactement où on s'était arrêté. */
function useResume() {
  useEffect(() => {
    let saved: { hash: string; y: number; section?: string; delta?: number } | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(RESUME) ?? "null");
    } catch {
      saved = null;
    }
    if (saved && (!location.hash || location.hash === "#/accueil") && saved.hash && saved.hash !== "#/accueil") location.hash = saved.hash;
    if (saved && saved.y > 0) {
      let tries = 0;
      const timer = window.setInterval(() => {
        const el = saved!.section ? [...document.querySelectorAll<HTMLElement>("[data-reorder-section]")].find((x) => x.dataset.reorderSection === saved!.section) : undefined;
        const y = el ? Math.max(0, el.getBoundingClientRect().top + window.scrollY + (saved!.delta ?? 0)) : saved!.y;
        window.scrollTo(0, y);
        document.querySelector(".main")?.scrollTo(0, y);
        if (++tries > 16 || (el && Math.abs(window.scrollY - y) < 4)) window.clearInterval(timer);
      }, 250);
    }
    let pending = 0;
    const save = () => {
      window.clearTimeout(pending);
      pending = window.setTimeout(() => {
        try {
          const secs = [...document.querySelectorAll<HTMLElement>("[data-reorder-section]")].filter((x) => x.getBoundingClientRect().top <= 120);
          const top = secs[secs.length - 1];
          localStorage.setItem(RESUME, JSON.stringify({ hash: location.hash, y: Math.round(window.scrollY || (document.querySelector(".main")?.scrollTop ?? 0)), ...(top ? { section: top.dataset.reorderSection, delta: Math.round(-top.getBoundingClientRect().top) } : {}) }));
        } catch {
          /* position non mémorisée */
        }
      }, 300);
    };
    window.addEventListener("scroll", save, true);
    window.addEventListener("hashchange", save);
    return () => {
      window.removeEventListener("scroll", save, true);
      window.removeEventListener("hashchange", save);
    };
  }, []);
}

function useRoute() {
  const read = () => (location.hash.replace(/^#/, "") || "/accueil").split("?")[0];
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export type Mode = "studio" | "terrain" | "night";
function useMode() {
  const [mode, setMode] = useState<Mode>(() => {
    try {
      return (localStorage.getItem("visionnary-mode") as Mode) || "studio";
    } catch {
      return "studio";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    try {
      localStorage.setItem("visionnary-mode", mode);
    } catch {
      /* préférence non mémorisée */
    }
  }, [mode]);
  return [mode, setMode] as const;
}

// Thème clair « confort » : préférence de couleurs indépendante du mode (Studio/Terrain/Nuit
// restent des contextes de tournage ; le thème choisit juste sombre ou clair par-dessus).
export type Theme = "sombre" | "clair";
function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("visionnary-theme") as Theme) || "sombre";
    } catch {
      return "sombre";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("visionnary-theme", theme);
    } catch {
      /* préférence non mémorisée */
    }
  }, [theme]);
  return [theme, setTheme] as const;
}

const bottom = [
  ["/accueil", "Accueil", HomeIcon],
  ["/tournages", "Tournages", Clapperboard],
  ["/m/poses", "Photographe", Camera],
  ["/equipe", "Équipe", Users],
  ["/plus", "Plus", LayoutGrid],
] as const;

const side = [
  ["/accueil", "Accueil", HomeIcon],
  ["/tournages", "Mes tournages", Clapperboard],
  ["/deroule", "Déroulé du jour J", Clock3],
  ["/m/shots", "Plans & scènes", Images],
  ["/m/references", "Références du couple", Clapperboard],
  ["/m/poses", "Galerie photographe", Camera],
  ["/bibliotheque", "Bibliothèque de poses", Images],
  ["/bibliotheque/inspiration", "Bibliothèque d’inspiration", Clapperboard],
  ["/checklist", "Checklist", ListChecks],
  ["/rappels", "Rappels", Bell],
  ["/equipe", "Équipe", Users],
  ["/m/equipment", "Matériel", Camera],
  ["/scenes", "Plans de scène", Focus],
  ["/trajets", "Trajets & installation", Clock3],
  ["/meteo", "Météo & soleil", CloudSun],
  ["/fichiers", "Fichiers & sauvegarde", HardDrive],
  ["/plus", "Outils rapides", LayoutGrid],
] as const;

function Shell() {
  const store = useStore();
  const route = useRoute();
  useResume();
  const [mode, setMode] = useMode();
  const [theme, setTheme] = useTheme();
  const { w, project, toast, undo, redo, notify } = store;

  // ⌘Z / Ctrl+Z annule, ⇧⌘Z / Ctrl+Y rétablit — sauf pendant une saisie (le champ garde son propre historique).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const [, section, arg] = route.split("/");
  const free = ["accueil", "tournages", "plus", "presets", "sync", "fichiers", "bibliotheque", "charger", ""];
  let screen;
  if (section === "charger") screen = <SeedLoader key={route} part={route.split("/")[3] === "photo" ? "photo" : "video"} />;
  else if (!project && !["sync", "fichiers", "presets"].includes(section)) screen = <Welcome />;
  else if (!project && !free.includes(section)) screen = <Welcome />;
  else
    switch (section) {
      case "bibliotheque":
        screen = arg === "inspiration" ? <InspirationLibrary /> : <Library />;
        break;
      case "tournages":
        screen = <Shoots />;
        break;
      case "tournage":
        screen = <Shoot tab={arg} />;
        break;
      case "jourj":
        screen = <FieldMode />;
        break;
      case "etape":
        screen = <Stage key={project!.id + arg} id={arg} />;
        break;
      case "deroule":
        screen = <Timeline />;
        break;
      case "checklist":
        screen = <Checklist />;
        break;
      case "rappels":
        screen = <Reminders />;
        break;
      case "equipe":
        screen = <Team />;
        break;
      case "pack":
        screen = <MyPack key={project!.id + arg} operatorId={arg} />;
        break;
      case "plus":
        screen = <Tools mode={mode} setMode={setMode} theme={theme} setTheme={setTheme} />;
        break;
      case "reglages":
        screen = <CameraSettings />;
        break;
      case "cadrage":
        screen = <Framing />;
        break;
      case "trajets":
        screen = <TravelPlanner />;
        break;
      case "meteo":
        screen = <Weather />;
        break;
      case "notes":
        screen = <Notes />;
        break;
      case "fichiers":
        screen = <Files />;
        break;
      case "communication":
        screen = <Share />;
        break;
      case "fin":
        screen = <Wrap />;
        break;
      case "couverture":
        screen = <Coverage />;
        break;
      case "presets":
        screen = <PresetsScreen />;
        break;
      case "m":
        screen =
          arg === "references" ? <References /> : arg === "inspirations" ? <Inspirations /> : arg === "shots" ? <Shots /> : arg === "poses" ? <PoseBoard /> : arg === "sde" ? <Sde /> : arg === "teaser" ? <Teaser /> : <ModuleScreen key={arg} moduleId={arg} />;
        break;
      case "scenes":
      case "multicam":
        // Le placement multicam est devenu le Scene Designer ; l'ancien éditeur reste consultable.
        screen =
          arg === "ancien" ? (
            <Screen title="Ancien plan multicam" backTo="/scenes">
              <Spatial key={project!.id} project={project!} updateProject={(p) => store.update(p)} />
            </Screen>
          ) : (
            <ScenesList />
          );
        break;
      case "scene":
        screen = <SceneDesigner key={project!.id + arg} id={arg} />;
        break;
      case "montage":
        screen = (
          <Screen title="Pré-montage" backTo="/plus">
            <PreEdit key={project!.id} project={project!} updateProject={(p) => store.update(p)} />
          </Screen>
        );
        break;
      case "sync":
        screen = (
          <Screen title="Compte & synchronisation" backTo="/plus">
            <SyncPanel
              workspace={w}
              onRestore={(next) => {
                store.replace(next);
                notify("Données du serveur restaurées");
              }}
            />
          </Screen>
        );
        break;
      case "studio":
        screen = <Home />;
        break;
      default:
        screen = <MissionBoard key={project!.id} />;
    }

  const isActive = (path: string) =>
    route === path ||
    (path !== "/accueil" && route.startsWith(path)) ||
    (path === "/tournages" && route.startsWith("/tournage"));
  const today = project?.date === new Date().toISOString().slice(0, 10);

  return (
    <div className={"app" + (section === "jourj" ? " is-field" : "") + (section === "scene" ? " is-scene" : "")}>
      <FieldAlertRunner project={project}/>
      <aside className="side">
        <a className="brand" href="#/accueil">
          <b>
            VISIONNARY <i />
          </b>
          <small>SHOOT · CREATE · EMOTION</small>
        </a>
        {project && (
          <button className="side-shoot" onClick={() => navigate("/tournage")}>
            <CoupleAvatar project={project} />
            <span>
              <strong>{project.name}</strong>
              <small>
                {project.date
                  ? new Date(project.date + "T12:00").toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Date à définir"}
              </small>
            </span>
          </button>
        )}
        {project && (
          <a className="jourj" href="#/jourj">
            <Play size={17} fill="currentColor" /> Mode Jour J
          </a>
        )}
        {side.map(([path, label, Icon]) => (
          <a key={path} href={"#" + path} className={isActive(path) ? "active" : ""}>
            <Icon size={18} />
            {label}
          </a>
        ))}
        <div className="side-foot">
          <span className="script">On n’oublie rien, on fait les choses bien !</span>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            {store.saveState}
          </p>
        </div>
      </aside>
      <main className="main">{store.error && <p className="notice red" role="alert" style={{margin:16}}>{store.error}</p>}{screen}</main>
      <nav className="bottom-nav" aria-label="Navigation principale">
        {bottom.map(([path, label, Icon]) => (
          <a
            key={path}
            href={"#" + path}
            className={(isActive(path) ? "active" : "") + (path === "/accueil" && today ? " live" : "")}
          >
            <Icon size={21} />
            {label}
          </a>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast.text}
          {toast.undo && store.canUndo && (
            <button onClick={undo}>
              <Undo2 size={14} /> Annuler
            </button>
          )}
          {toast.redo && store.canRedo && (
            <button onClick={redo}>
              <Redo2 size={14} /> Rétablir
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      {({ ready, error }) =>
        ready ? (
          <Shell />
        ) : (
          <div className="loading">
            <span className="brand">
              <b>
                VISIONNARY <i />
              </b>
              <small>SHOOT · CREATE · EMOTION</small>
            </span>
            <p>{error || "Ouverture de votre studio…"}</p>
          </div>
        )
      }
    </StoreProvider>
  );
}
