import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const outputDir = join(root, 'outputs');
const assets = join(dist, 'assets');

const jsFile = readdirSync(assets).find((name) => name.endsWith('.js'));
const cssFile = readdirSync(assets).find((name) => name.endsWith('.css'));

if (!jsFile) throw new Error('Aucun fichier JavaScript trouve dans dist/assets.');

const js = readFileSync(join(assets, jsFile), 'utf8');
const css = cssFile ? readFileSync(join(assets, cssFile), 'utf8') : '';

mkdirSync(outputDir, { recursive: true });

writeFileSync(
  join(outputDir, 'tour-de-controle-lean-finance.html'),
  `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#10233f" />
    <title>Tour de contrôle Lean Finance</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${js}</script>
  </body>
</html>
`,
  'utf8',
);
