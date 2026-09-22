import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "./index.mjs";
test("compte, protection origine, session et conflit de révision", async () => {
  const dir = await mkdtemp(join(tmpdir(), "visionnary-test-"));
  const server = createServer({ dataDir: dir });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  let cookie = "";
  const call = (path, method = "GET", body, origin = "http://localhost:5173") =>
    fetch(url + "/api" + path, {
      method,
      headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  try {
    assert.equal((await call("/workspace")).status, 401);
    assert.equal((await call("/setup", "POST", {}, "https://evil.example")).status, 403);
    const account = { username: "test", password: "long-passphrase-123" };
    assert.equal((await call("/setup", "POST", account)).status, 201);
    assert.equal((await call("/setup", "POST", account)).status, 409);
    assert.equal((await call("/login", "POST", { ...account, password: "wrong" })).status, 401);
    const login = await call("/login", "POST", account);
    assert.equal(login.status, 200);
    assert.match(login.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
    cookie = login.headers.get("set-cookie").split(";")[0];
    const workspace = { schemaVersion: 1, projects: [], presets: [] };
    assert.equal((await call("/workspace", "PUT", { workspace, baseRevision: 0 })).status, 200);
    assert.equal((await call("/workspace", "PUT", { workspace, baseRevision: 0 })).status, 409);
    assert.equal((await (await call("/workspace")).json()).revision, 1);
    const media = {
      id: "safe-id",
      projectId: "p",
      itemId: "i",
      name: "test",
      type: "text/plain",
      size: 2,
      base64: "aGk=",
    };
    assert.equal((await call("/media/safe-id", "PUT", media)).status, 200);
    assert.equal((await (await call("/media/safe-id")).json()).base64, "aGk=");
    assert.equal((await call("/logout", "POST", {})).status, 200);
    assert.equal((await call("/workspace")).status, 401);
  } finally {
    await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  }
});

test("fichiers publics same origin, isolation des données et traversée refusée", async () => {
  const dir = await mkdtemp(join(tmpdir(), "visionnary-static-"));
  const dist = join(dir, "dist");
  await mkdir(dist);
  await mkdir(join(dist, "assets"));
  await writeFile(join(dist, "index.html"), "<html>VISIONNARY</html>");
  await writeFile(join(dist, "assets", "app-123.js"), "export {}");
  await writeFile(join(dist, "assets", "font.woff"), "font fixture");
  await writeFile(join(dir, "secret.txt"), "NE PAS EXPOSER");
  await symlink(join(dir, "secret.txt"), join(dist, "leak.js"));
  const server = createServer({ dataDir: join(dir, "private"), staticDir: dist });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const shell = await fetch(url + "/projects/one");
    assert.equal(shell.status, 200);
    assert.match(shell.headers.get("content-type"), /text\/html/);
    assert.match(await shell.text(), /VISIONNARY/);
    const font = await fetch(url + "/assets/font.woff");
    assert.equal(font.status, 200);
    assert.equal(font.headers.get("content-type"), "font/woff");
    const asset = await fetch(url + "/assets/app-123.js");
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get("cache-control"), /immutable/);
    for (const path of ["/data/account.json", "/.env", "/leak.js", "/%2e%2e%2fsecret.txt", "/missing.js"])
      assert.equal((await fetch(url + path)).status, 404, path);
    assert.equal((await fetch(url + "/api/workspace")).status, 401);
  } finally {
    await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  }
});
test("deux écritures concurrentes : une seule révision acceptée et médias immuables", async () => {
  const dir = await mkdtemp(join(tmpdir(), "visionnary-cas-"));
  const server = createServer({ dataDir: dir });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/api`;
  let cookie = "";
  const call = (path, body, method = "POST") =>
    fetch(url + path, {
      method,
      headers: { Origin: "http://localhost:5173", Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    const account = { username: "test", password: "test-passphrase-long" };
    await call("/setup", account);
    const login = await call("/login", account);
    cookie = login.headers.get("set-cookie").split(";")[0];
    const body = { workspace: { schemaVersion: 1, projects: [], presets: [] }, baseRevision: 0 };
    const responses = await Promise.all([call("/workspace", body, "PUT"), call("/workspace", body, "PUT")]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
    const media = {
      id: "media",
      projectId: "p",
      itemId: "i",
      name: "n",
      type: "text/plain",
      size: 2,
      base64: "aGk=",
    };
    assert.equal((await call("/media/media", media, "PUT")).status, 200);
    assert.equal((await call("/media/media", media, "PUT")).status, 200);
    assert.equal((await call("/media/media", { ...media, base64: "bm8=" }, "PUT")).status, 409);
    assert.equal((await call("/workspace", null, "PUT")).status, 400);
  } finally {
    await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  }
});

test('Google Routes : configuration, date, trafic et arrondi', async()=>{
 const {estimateRoute}=await import('./routes.mjs');
 const input={origin:'Paris',destination:'Versailles',departureTime:new Date(Date.now()+86400000).toISOString()};
 await assert.rejects(()=>estimateRoute(input,''),/non configuré/);
 await assert.rejects(()=>estimateRoute({...input,departureTime:'2000-01-01'},'test'),/future/);
 const output=await estimateRoute(input,'test',async(url,options)=>{assert.equal(url,'https://routes.googleapis.com/directions/v2:computeRoutes');assert.equal(JSON.parse(options.body).routingPreference,'TRAFFIC_AWARE_OPTIMAL');assert.equal(options.headers['X-Goog-Api-Key'],'test');return {ok:true,json:async()=>({routes:[{duration:'2101s',distanceMeters:18000}]})};});
 assert.equal(output.minutes,36);
 await assert.rejects(()=>estimateRoute(input,'test',async()=>({ok:true,json:async()=>({routes:[]})})),/Aucun trajet/);
});
