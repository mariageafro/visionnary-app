import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Check, ChevronRight, ImagePlus, Play, Star, Trash2, X, Film, FileWarning, Scissors } from "lucide-react";
import type { MediaEntry } from "./types";
import { listMedia, deleteMedia } from "./storage";
import { importMedia, unsupportedHint, formatBytes } from "./media";

/* ---------- Navigation ---------- */
export function navigate(path: string) {
  if (location.hash !== "#" + path) location.hash = path;
}
/** Suit une requête média (téléphone portrait, écran tactile…) et réagit à la rotation de l'appareil. */
export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => typeof matchMedia === "function" && matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}
/** Retour vers l'écran parent : prévisible sur le terrain, même après un rechargement. */
export function back(parent = "/accueil") {
  navigate(parent);
}

export function Screen({
  title,
  backTo,
  actions,
  children,
  className = "",
}: {
  title: ReactNode;
  backTo?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={"screen " + className}>
      <header className="screen-head">
        {backTo && (
          <button className="icon-btn" aria-label="Retour" onClick={() => back(backTo)}>
            <ArrowLeft size={22} />
          </button>
        )}
        <h1>{title}</h1>
        {actions && <div className="head-actions">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string, number?][];
}) {
  return (
    <div className="tabs" role="tablist">
      {options.map(([id, label, count]) => (
        <button key={id} role="tab" aria-selected={value === id} className={value === id ? "active" : ""} onClick={() => onChange(id)}>
          {label}
          {count !== undefined && <span>{count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Row({
  lead,
  title,
  sub,
  trail,
  onClick,
  href,
  done,
  chevron,
}: {
  lead?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  trail?: ReactNode;
  onClick?: () => void;
  href?: string;
  done?: boolean;
  chevron?: boolean;
}) {
  const body = (
    <>
      {lead}
      <span className="row-main">
        <strong>{title}</strong>
        {sub && <small>{sub}</small>}
      </span>
      {(trail || chevron) && (
        <span className="row-trail">
          {trail}
          {chevron && <ChevronRight size={18} />}
        </span>
      )}
    </>
  );
  const className = "row" + (done ? " is-done" : "");
  if (href)
    return (
      <a className={className} href={"#" + href}>
        {body}
      </a>
    );
  if (onClick)
    return (
      <button type="button" className={className} onClick={onClick}>
        {body}
      </button>
    );
  return <div className={className}>{body}</div>;
}

export function CheckBox({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      className={"check" + (on ? " on" : "")}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {on && <Check size={16} strokeWidth={3} />}
    </button>
  );
}

export function Tile({ icon, title, sub, href, onClick, dark }: { icon: ReactNode; title: string; sub?: ReactNode; href?: string; onClick?: () => void; dark?: boolean }) {
  const body = (
    <>
      {icon}
      <strong>{title}</strong>
      {sub && <small>{sub}</small>}
    </>
  );
  return href ? (
    <a className={"tile" + (dark ? " dark" : "")} href={"#" + href}>
      {body}
    </a>
  ) : (
    <button type="button" className={"tile" + (dark ? " dark" : "")} onClick={onClick}>
      {body}
    </button>
  );
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Sheet({ title, onClose, children, actions }: { title: string; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-head">
        <h2>{title}</h2>
        {actions}
        <button className="icon-btn" aria-label="Fermer" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <div className="sheet-body">{children}</div>
    </dialog>
  );
}
/** Ancien nom conservé pour les écrans existants. */
export const Modal = Sheet;

/* ---------- Médias ---------- */
const listeners = new Set<() => void>();
export const mediaChanged = () => listeners.forEach((l) => l());

export function useMedia(projectId: string, itemId?: string) {
  const [media, setMedia] = useState<MediaEntry[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      listMedia(projectId).then((all) => {
        if (alive) setMedia(itemId === undefined ? all : all.filter((m) => m.itemId === itemId));
      });
    void load();
    listeners.add(load);
    return () => {
      alive = false;
      listeners.delete(load);
    };
  }, [projectId, itemId]);
  return media;
}

export function useObjectUrl(blob?: Blob) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!blob) return setUrl("");
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

export function Thumb({ media, className = "", onClick, full = false, animate = false }: { media?: MediaEntry; className?: string; onClick?: () => void; full?: boolean; animate?: boolean }) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const container = useRef<HTMLDivElement & HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const moving = animate && !reduced && visible;
  const videoUrl = useObjectUrl(moving && media?.type.startsWith("video/") && !media.unsupported ? media.blob : undefined);
  // La miniature suffit dans les listes. En grand (`full` : aperçu, référence du Jour J), la photo
  // originale reste nette, tant qu'elle est raisonnable à décoder sur un téléphone (≤ 16 Mpx).
  const sharp = full && media?.type.startsWith("image/") && Number(media.width) > 0 && Number(media.width) * Number(media.height) <= 16e6;
  const url = useObjectUrl(
    media && !media.unsupported ? ((sharp || (moving && media.type.startsWith("image/"))) ? media.blob : media.thumbnail ?? (media.type.startsWith("image/") ? media.blob : undefined)) : undefined,
  );
  const content = !media ? null : media.unsupported ? (
    <span>
      <FileWarning size={18} />
      <br />
      {media.name.split(".").pop()?.toUpperCase()}
    </span>
  ) : videoUrl ? <video src={videoUrl} muted autoPlay loop playsInline preload="metadata" aria-label={media.name} draggable={false} /> : url ? (
    <>
      {/* Apparition en fondu une fois l'image décodée : pas de saut ni d'image à moitié chargée. */}
      <img
        src={url}
        alt={media.name}
        draggable={false}
        loading="lazy"
        decoding="async"
        onLoad={(e) => e.currentTarget.classList.add("is-loaded")}
        onError={(e) => e.currentTarget.classList.add("is-loaded")}
      />
      {media.type.startsWith("video/") && (
        <span className="play">
          <Play size={13} fill="#fff" />
        </span>
      )}
    </>
  ) : media.type.startsWith("video/") ? (
    <Film size={20} />
  ) : null;
  const cls = "thumb " + (media?.unsupported || !url ? "fallback " : "") + className;
  return onClick ? (
    <button ref={container} type="button" className={cls} onClick={onClick} aria-label={media ? "Ouvrir " + media.name : "Média"}>
      {content}
    </button>
  ) : (
    <div ref={container} className={cls}>{content}</div>
  );
}

export function MediaViewer({
  media,
  onClose,
  clip,
  onClip,
}: {
  media: MediaEntry;
  onClose: () => void;
  clip?: { in: number; out: number };
  /** Si fourni, permet de marquer IN/OUT et de créer des plans depuis la vidéo. */
  onClip?: (range: { in: number; out: number }) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const url = useObjectUrl(media.unsupported ? undefined : media.blob);
  const [range, setRange] = useState(clip ?? { in: 0, out: 0 });
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const t = () => Math.round((video.current?.currentTime ?? 0) * 10) / 10;
  return (
    <dialog ref={ref} className="viewer" onCancel={(e) => (e.preventDefault(), onClose())}>
      <div className="viewer-body">
        <div className="viewer-top">
          <strong>{media.name}</strong>
          <small className="muted">{formatBytes(media.size)}</small>
          <button className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <div className="viewer-stage">
          {media.unsupported ? (
            <p style={{ maxWidth: 420, padding: 20, textAlign: "center" }}>{unsupportedHint(media)}</p>
          ) : media.type.startsWith("video/") ? (
            <video
              ref={video}
              src={url || undefined}
              controls
              playsInline
              autoPlay
              onLoadedMetadata={() => {
                if (video.current && range.in) video.current.currentTime = range.in;
              }}
              onTimeUpdate={() => {
                if (video.current && range.out > range.in && video.current.currentTime >= range.out) {
                  video.current.pause();
                }
              }}
            />
          ) : media.type.startsWith("image/") ? (
            <img src={url || undefined} alt={media.name} />
          ) : (
            <a className="btn gold" href={url} download={media.name}>
              Télécharger {media.name}
            </a>
          )}
        </div>
        {media.type.startsWith("video/") && !media.unsupported && (
          <div className="viewer-tools">
            <button className="btn small" onClick={() => setRange({ ...range, in: t() })}>
              IN {range.in.toFixed(1)} s
            </button>
            <button className="btn small" onClick={() => setRange({ ...range, out: t() })}>
              OUT {range.out ? range.out.toFixed(1) + " s" : "—"}
            </button>
            <button
              className="btn small"
              onClick={() => {
                if (video.current) {
                  video.current.currentTime = range.in;
                  void video.current.play();
                }
              }}
            >
              <Play size={14} /> Lire le clip
            </button>
            {onClip && (
              <button
                className="btn small gold"
                disabled={!(range.out > range.in)}
                onClick={() => {
                  onClip(range);
                  setRange({ in: range.out, out: 0 });
                }}
              >
                <Scissors size={14} /> Créer un plan avec ce clip
              </button>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}

export function MediaManager({
  projectId,
  itemId,
  coverId,
  protectedIds,
  onCover,
  onClip,
  title = "Photos, vidéos & fichiers",
}: {
  projectId: string;
  itemId: string;
  coverId?: string;
  protectedIds?: ReadonlySet<string>;
  onCover?: (id: string) => void;
  onClip?: (media: MediaEntry, range: { in: number; out: number }) => void;
  title?: string;
}) {
  const media = useMedia(projectId, itemId);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const [open, setOpen] = useState<MediaEntry | null>(null);
  const input = useRef<HTMLInputElement>(null);
  async function add(files: File[]) {
    setError("");
    for (const [n, file] of files.entries()) {
      setBusy(`Import ${n + 1}/${files.length}…`);
      try {
        const entry = await importMedia(file, projectId, itemId);
        if (entry.unsupported) setError(unsupportedHint(entry));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    setBusy("");
    mediaChanged();
  }
  return (
    <section className="stack" style={{ marginTop: 18 }}>
      <div className="list-head" style={{ padding: 0 }}>
        {title}
        <span className="muted">{media.length || ""}</span>
      </div>
      <div
        className={"dropzone" + (over ? " over" : "")}
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void add(Array.from(e.dataTransfer.files));
        }}
      >
        <ImagePlus size={22} />
        {busy || "Ajouter depuis la galerie, l’appareil photo ou glisser des fichiers"}
        <input
          ref={input}
          className="sr-only"
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.heic,.heif,.mov"
          onChange={(e) => {
            void add(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p className="notice red" role="alert">
          <FileWarning size={16} />
          {error}
        </p>
      )}
      {media.length > 0 && (
        <div className="media-grid">
          {media.map((m) => (
            <div className="media-cell" key={m.id}>
              <Thumb media={m} onClick={() => setOpen(m)} />
              {coverId === m.id && <span className="chip gold badge-cover">Couverture</span>}
              <small>
                {m.duration ? `${Math.round(m.duration)} s · ` : ""}
                {formatBytes(m.size)}
              </small>
              {protectedIds?.has(m.id) && <small>Utilisé par une autre fiche</small>}
              <div className="btn-row">
                {onCover && m.type.startsWith("image/") && !m.unsupported && (
                  <button className="icon-btn" aria-label={"Utiliser " + m.name + " en couverture"} onClick={() => onCover(m.id)}>
                    <Star size={15} />
                  </button>
                )}
                <button
                  className="icon-btn danger"
                  aria-label={"Supprimer " + m.name}
                  disabled={protectedIds?.has(m.id)}
                  title={protectedIds?.has(m.id) ? "Supprimez d’abord les fiches qui utilisent ce fichier" : undefined}
                  onClick={async () => {
                    if (!confirm(`Supprimer « ${m.name} » de cet appareil ?`)) return;
                    await deleteMedia(m.id);
                    mediaChanged();
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && <MediaViewer media={open} onClose={() => setOpen(null)} onClip={onClip && ((r) => onClip(open, r))} />}
    </section>
  );
}
