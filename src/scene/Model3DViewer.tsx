import { useEffect, useRef, useState } from "react";
import { Download, Image as ImageIcon, X } from "lucide-react";
import { ACESFilmicToneMapping, AmbientLight, Box3, Color, DirectionalLight, Group, PerspectiveCamera, Scene, Vector3, WebGLRenderer, type Material, type Mesh, type Texture } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { MediaEntry } from "../types";
import { model3dFormat } from "./model3d";

/** Lecture 3D entièrement locale : rotation tactile/souris, zoom, panoramique et capture PNG. */
export default function Model3DViewer({ media, onClose, onCapture }: { media: MediaEntry; onClose: () => void; onCapture: (blob: Blob, width: number, height: number) => Promise<void> }) {
  const host = useRef<HTMLDivElement>(null);
  const capture = useRef<(asBackground: boolean) => void>(() => undefined);
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false;
    let frame = 0;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch {
      setError("La vue 3D nécessite WebGL sur cet appareil.");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(new Color("#171916"));
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    element.appendChild(renderer.domElement);
    const scene = new Scene();
    const camera = new PerspectiveCamera(42, 1, 0.01, 10000);
    scene.add(new AmbientLight("#ffffff", 1.1));
    const light = new DirectionalLight("#ffffff", 1.5);
    light.position.set(4, 7, 6);
    scene.add(light);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.screenSpacePanning = true;
    const minHalfFov = (aspect: number) => Math.min(Math.PI * camera.fov / 360, Math.atan(Math.tan(Math.PI * camera.fov / 360) * aspect));
    let framed = false;
    const resize = () => {
      const width = Math.max(1, element.clientWidth);
      const height = Math.max(1, element.clientHeight);
      renderer.setSize(width, height, false);
      const nextAspect = width / height;
      if (framed && Math.abs(camera.aspect - nextAspect) > 0.01) {
        const factor = Math.sin(minHalfFov(camera.aspect)) / Math.sin(minHalfFov(nextAspect));
        camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);
      }
      camera.aspect = nextAspect;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const draw = () => {
      if (disposed) return;
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    resize();
    draw();
    capture.current = (asBackground) => renderer.domElement.toBlob(async (blob) => {
      if (!blob || disposed) return;
      if (!asBackground) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${media.name.replace(/\.(glb|obj)$/i, "")}-vue-3d.png`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        return;
      }
      setBusy(true);
      try { await onCaptureRef.current(blob, renderer.domElement.width, renderer.domElement.height); }
      catch { setError("Impossible d’enregistrer la capture du modèle."); }
      finally { setBusy(false); }
    }, "image/png");

    let model: Group | null = null;
    const load = async () => {
      try {
        const format = model3dFormat(media.name);
        if (!format) throw new Error("Format inconnu");
        const object = format === "glb"
          ? (await new GLTFLoader().parseAsync(await media.blob.arrayBuffer(), "")).scene
          : new OBJLoader().parse(await media.blob.text());
        if (disposed) return;
        model = object;
        scene.add(model);
        const bounds = new Box3().setFromObject(model);
        if (bounds.isEmpty()) throw new Error("Géométrie vide");
        const center = bounds.getCenter(new Vector3());
        const size = bounds.getSize(new Vector3());
        const largest = Math.max(size.x, size.y, size.z, 0.01);
        controls.target.copy(center);
        const radius = size.length() / 2;
        const distance = radius / Math.sin(minHalfFov(camera.aspect)) * 1.35;
        camera.position.copy(center).add(new Vector3(1, 0.8, 1).normalize().multiplyScalar(distance));
        camera.near = Math.max(0.001, largest / 1000);
        camera.far = Math.max(100, largest * 100);
        camera.updateProjectionMatrix();
        controls.update();
        framed = true;
        setReady(true);
      } catch {
        if (!disposed) setError("Ce modèle ne peut pas être lu. Utilisez un GLB autonome ou un OBJ sans ressources externes.");
      }
    };
    void load();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      model?.traverse((object) => {
        const mesh = object as Mesh;
        mesh.geometry?.dispose();
        const materials = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
        for (const material of materials as Material[]) {
          for (const value of Object.values(material)) if (value && typeof value === "object" && "isTexture" in value) (value as Texture).dispose();
          material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [media]);

  return <div className="sd-model-backdrop" role="presentation" onClick={onClose}>
    <section className="sd-model-dialog" role="dialog" aria-modal="true" aria-label={`Modèle 3D · ${media.name}`} onClick={(event) => event.stopPropagation()}>
      <header><strong>Modèle 3D · {media.name}</strong><button className="icon-btn" aria-label="Fermer le modèle 3D" onClick={onClose}><X size={20} /></button></header>
      <div className="sd-model-viewport" ref={host}>{!ready && !error && <p>Chargement du modèle 3D…</p>}{error && <p role="alert">{error}</p>}</div>
      <footer><span>Glisser : tourner · Molette ou pincement : zoomer · Clic droit ou deux doigts : déplacer</span><button className="btn small" disabled={!ready} onClick={() => capture.current(false)}><Download size={15} /> Télécharger PNG</button><button className="btn gold small" disabled={!ready || busy} onClick={() => capture.current(true)}><ImageIcon size={15} /> {busy ? "Capture…" : "Utiliser la vue comme fond"}</button></footer>
    </section>
  </div>;
}
