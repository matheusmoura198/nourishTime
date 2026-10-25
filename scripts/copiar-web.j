// Copia só os arquivos do site para a pasta www (é ela que vai para dentro do app).
// Uso: npm run web
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const destino = path.join(raiz, 'www');
const arquivos = [
  'app.html', 'app.js', 'logica.js', 'nativo.js', 'monitor.js', 'style.css',
  'privacidade-e-termos.html', '404.html', 'img/logo-96.png', 'img/logo-256.png'
];

fs.rmSync(destino, { recursive: true, force: true });
fs.mkdirSync(path.join(destino, 'img'), { recursive: true });
for (const f of arquivos) {
  if (!fs.existsSync(path.join(raiz, f))) {
    console.error(`Falta o arquivo ${f}. Confira se ele está na pasta do projeto.`);
    process.exit(1);
  }
  fs.copyFileSync(path.join(raiz, f), path.join(destino, f));
}
// No app, a primeira tela é o próprio "Meu dia". A landing page fica só no site.
fs.copyFileSync(path.join(raiz, 'app.html'), path.join(destino, 'index.html'));
console.log(`Pasta www pronta com ${arquivos.length + 1} arquivos.`);
