import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// base relatif pour le mode gh-pages : l'app tourne alors sous un sous-dossier
// (mariageafro.github.io/visionnary-app/) et non à la racine du domaine, comme en local.
export default defineConfig(({ mode }) => ({
  base: mode === 'gh-pages' ? './' : '/',
  plugins: [react(), {
    name: 'visionnary-offline-build',
    generateBundle(_, bundle) {
      const assets = Object.keys(bundle).filter(name => name.startsWith('assets/'));
      const source = readFileSync(new URL('./public/sw.js', import.meta.url), 'utf8');
      const hash = createHash('sha256').update(source + assets.sort().join('\n')).digest('hex').slice(0, 12);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: source
        .replace("'visionnary-shell-v1'", JSON.stringify('visionnary-shell-' + hash))
        // Chemins relatifs à la portée du service worker (self.registration.scope), pas à la racine
        // du domaine : ça marche aussi bien en local qu'un sous-dossier GitHub Pages.
        .replace('const BUILD_ASSETS = [];', 'const BUILD_ASSETS = ' + JSON.stringify(assets) + ';') });
    },
  }],
  server: { proxy: { '/api': 'http://127.0.0.1:4311' } },
  build: { rollupOptions: { output: { manualChunks: { 'archive': ['jszip'], 'react': ['react', 'react-dom'] } } } },
}));
