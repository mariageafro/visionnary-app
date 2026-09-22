import { estimateRoute } from "./routes.mjs";
import http from "node:http";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile, rename, realpath } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { pathToFileURL } from "node:url";
export function createServer({
  googleRoutesKey = process.env.GOOGLE_MAPS_API_KEY,
  dataDir = resolve("data"),
  staticDir = resolve("dist"),
  allowedOrigins = [
    "http://localhost:4730",
    "http://127.0.0.1:4730",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:4311",
    "http://127.0.0.1:4311",
  ],
} = {}) {
  const sessions = new Map();
  let queue = Promise.resolve();
  const file = (n) => resolve(dataDir, n);
  const load = async (n, fallback = null) => {
    try {
      return JSON.parse(await readFile(file(n), "utf8"));
    } catch (e) {
      if (e.code === "ENOENT") return fallback;
      throw e;
    }
  };
  const save = async (n, v) => {
    await mkdir(dataDir, { recursive: true, mode: 0o700 });
    await writeFile(file(n + ".tmp"), JSON.stringify(v), { mode: 0o600 });
    await rename(file(n + ".tmp"), file(n));
  };
  const serial = (fn) => {
    const next = queue.then(fn);
    queue = next.catch(() => {});
    return next;
  };
  const attempts = new Map();
  const routeRequests = new Map();
  return http.createServer(async (req, res) => {
    const send = (status, data, headers = {}) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...headers,
      });
      res.end(JSON.stringify(data));
    };
    try {
      const path = new URL(req.url, "http://localhost").pathname;
      if (req.method === "GET" && !path.startsWith("/api")) {
        let decoded;
        try {
          decoded = decodeURIComponent(req.url.split("?")[0]);
        } catch {
          return send(400, { error: "Chemin invalide" });
        }
        if (
          decoded.includes("\\") ||
          decoded.includes("\0") ||
          decoded.split("/").some((part) => part === ".." || part.startsWith("."))
        )
          return send(404, { error: "Fichier introuvable" });
        const types = {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".svg": "image/svg+xml",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".webp": "image/webp",
          ".mp4": "video/mp4",
          ".gif": "image/gif",
          ".ico": "image/x-icon",
          ".woff2": "font/woff2",
          ".woff": "font/woff",
          ".webmanifest": "application/manifest+json",
        };
        const extension = extname(decoded);
        if (extension && !types[extension]) return send(404, { error: "Fichier introuvable" });
        try {
          const root = await realpath(staticDir);
          const target = await realpath(resolve(root, "." + (extension ? decoded : "/index.html")));
          if (!target.startsWith(root + sep)) return send(404, { error: "Fichier introuvable" });
          const content = await readFile(target);
          res.writeHead(200, {
            "Content-Type": types[extname(target)] || "application/octet-stream",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": decoded.startsWith("/assets/")
              ? "public, max-age=31536000, immutable"
              : "no-cache",
          });
          res.end(content);
          return;
        } catch (e) {
          if (["ENOENT", "EISDIR", "ENOTDIR"].includes(e.code))
            return send(404, { error: "Construction absente : lancez npm run build" });
          throw e;
        }
      }
      if (!["GET", "POST", "PUT"].includes(req.method)) return send(405, { error: "Méthode refusée" });
      if (req.method !== "GET" && !allowedOrigins.includes(req.headers.origin))
        return send(403, { error: "Origine refusée" });
      const body = async () => {
        let size = 0;
        const chunks = [];
        for await (const c of req) {
          size += c.length;
          if (size > 45 * 1024 * 1024) {
            const e = new Error("Données trop volumineuses");
            e.status = 413;
            throw e;
          }
          chunks.push(c);
        }
        try {
          return JSON.parse(Buffer.concat(chunks).toString());
        } catch {
          const e = new Error("JSON invalide");
          e.status = 400;
          throw e;
        }
      };
      const token = req.headers.cookie
        ?.split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("visionnary="))
        ?.slice(11);
      const session = sessions.get(token);
      const authenticated = !!session && session > Date.now();
      if (session && !authenticated) sessions.delete(token);
      if (path === "/api/status" && req.method === "GET")
        return send(200, { configured: !!(await load("account.json")), authenticated });
      if (path === "/api/setup" && req.method === "POST") {
        const b = await body();
        if (!b || typeof b !== "object") return send(400, { error: "Objet JSON requis" });
        return await serial(async () => {
          if (await load("account.json")) return send(409, { error: "Compte déjà configuré" });
          if (
            typeof b.username !== "string" ||
            !b.username.trim() ||
            b.username.length > 100 ||
            typeof b.password !== "string" ||
            b.password.length < 12 ||
            b.password.length > 256
          )
            return send(400, { error: "Identifiant requis et mot de passe de 12 à 256 caractères" });
          const salt = randomBytes(24).toString("hex");
          await save("account.json", {
            username: b.username.trim(),
            salt,
            hash: scryptSync(b.password, salt, 64).toString("hex"),
          });
          send(201, { ok: true });
        });
      }
      if (path === "/api/login" && req.method === "POST") {
        const key = req.socket.remoteAddress;
        const attempt = attempts.get(key);
        if (attempt && attempt.until > Date.now() && attempt.count >= 10)
          return send(429, { error: "Trop de tentatives. Réessayez dans 15 minutes." });
        const b = await body();
        if (!b || typeof b !== "object") return send(400, { error: "Objet JSON requis" });
        const account = await load("account.json");
        if (
          !account ||
          typeof b.password !== "string" ||
          b.password.length > 256 ||
          b.username !== account.username ||
          !timingSafeEqual(scryptSync(b.password, account.salt, 64), Buffer.from(account.hash, "hex"))
        ) {
          attempts.set(key, {
            count: (attempt?.until > Date.now() ? attempt.count : 0) + 1,
            until: Date.now() + 900000,
          });
          return send(401, { error: "Identifiants incorrects" });
        }
        attempts.delete(key);
        const t = randomBytes(32).toString("hex");
        sessions.set(t, Date.now() + 8 * 3600000);
        return send(
          200,
          { ok: true },
          {
            "Set-Cookie": `visionnary=${t}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=28800${req.headers.origin?.startsWith("https://") ? "; Secure" : ""}`,
          },
        );
      }
      if (!authenticated) return send(401, { error: "Connexion requise" });
      if (path === "/api/routes" && req.method === "POST") {
        if (!googleRoutesKey) return send(503, {error:"Google Maps non configuré. Utilisez la durée manuelle en attendant."});
        const previous = routeRequests.get(token) || 0;
        if (Date.now() - previous < 3000) return send(429, {error:"Attendez quelques secondes avant un nouveau calcul."});
        routeRequests.set(token, Date.now());
        return send(200, await estimateRoute(await body(), googleRoutesKey));
      }
      if (path === "/api/logout" && req.method === "POST") {
        sessions.delete(token);
        return send(
          200,
          { ok: true },
          { "Set-Cookie": "visionnary=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0" },
        );
      }
      if (path === "/api/workspace" && req.method === "GET")
        return send(200, await load("workspace.json", { workspace: null, revision: 0 }));
      if (path === "/api/workspace" && req.method === "PUT") {
        const b = await body();
        if (!b || typeof b !== "object") return send(400, { error: "Objet JSON requis" });
        return await serial(async () => {
          const old = await load("workspace.json", { workspace: null, revision: 0 });
          if (b.baseRevision !== old.revision)
            return send(409, { error: "Le serveur a changé. Rechargez sa version.", revision: old.revision });
          if (
            !b.workspace ||
            b.workspace.schemaVersion !== 1 ||
            !Array.isArray(b.workspace.projects) ||
            !Array.isArray(b.workspace.presets)
          )
            return send(400, { error: "Espace de travail invalide" });
          const next = { workspace: b.workspace, revision: old.revision + 1 };
          await save("workspace.json", next);
          send(200, { revision: next.revision });
        });
      }
      if (path === "/api/media" && req.method === "GET") return send(200, await load("media-index.json", []));
      const match = path.match(/^\/api\/media\/([a-zA-Z0-9_-]{1,100})$/);
      if (match && req.method === "GET") {
        const media = await load(`media-${match[1]}.json`);
        return send(media ? 200 : 404, media || { error: "Média introuvable" });
      }
      if (match && req.method === "PUT") {
        const b = await body();
        if (!b || typeof b !== "object") return send(400, { error: "Objet JSON requis" });
        if (
          b.id !== match[1] ||
          typeof b.base64 !== "string" ||
          b.base64.length > 44 * 1024 * 1024 ||
          !["name", "type", "projectId", "itemId"].every((k) => typeof b[k] === "string") ||
          !Number.isFinite(b.size) ||
          b.size < 0 ||
          /[^A-Za-z0-9+/=]/.test(b.base64) ||
          Buffer.from(b.base64, "base64").toString("base64") !== b.base64 ||
          Buffer.from(b.base64, "base64").length !== b.size ||
          b.size > 32 * 1024 * 1024
        )
          return send(400, { error: "Média invalide ou supérieur à 32 Mo" });
        const clean = {
          id: b.id,
          name: b.name,
          type: b.type,
          projectId: b.projectId,
          itemId: b.itemId,
          size: b.size,
          base64: b.base64,
        };
        return await serial(async () => {
          const existing = await load(`media-${b.id}.json`);
          if (existing && JSON.stringify(existing) !== JSON.stringify(clean))
            return send(409, {
              error: "Ce média existe avec un contenu différent. Importez-le sous un nouvel identifiant.",
            });
          await save(`media-${b.id}.json`, clean);
          const index = await load("media-index.json", []);
          const { base64, ...meta } = clean;
          await save("media-index.json", [...index.filter((m) => m.id !== b.id), meta]);
          send(200, { ok: true });
        });
      }
      send(404, { error: "Route introuvable" });
    } catch (e) {
      send(e.status || 500, { error: e.status ? e.message : "Erreur de stockage du serveur" });
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const host = process.env.HOST || "127.0.0.1";
  // Les hébergeurs cloud (Render, Fly, Railway…) imposent leur propre port via $PORT.
  const port = Number(process.env.PORT) || 4311;
  const configuredOrigins = process.env.ALLOWED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const local = ["127.0.0.1", "localhost", "::1"].includes(host);
  if (
    configuredOrigins?.some((origin) => {
      try {
        const url = new URL(origin);
        return !["http:", "https:"].includes(url.protocol) || url.origin !== origin;
      } catch {
        return true;
      }
    })
  )
    throw new Error("ALLOWED_ORIGINS doit contenir des origines HTTP(S) exactes, sans chemin.");
  if (!local) {
    if (!configuredOrigins?.length)
      throw new Error("Exposition réseau refusée : définissez ALLOWED_ORIGINS explicitement.");
    try {
      await readFile(resolve("data/account.json"));
    } catch {
      throw new Error("Créez le compte en local avant de démarrer sur le réseau.");
    }
  }
  createServer(configuredOrigins ? { allowedOrigins: configuredOrigins } : {}).listen(port, host, () =>
    console.log(`VISIONNARY : http://${host}:${port} (${local ? "local" : "réseau explicite"})`),
  );
}
