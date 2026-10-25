// Verificações estáticas antes de publicar. Uso: node verificar-lancamento.js [--lancamento]
// Com --lancamento, pendências (textos [PREENCHER]) também reprovam.
const fs = require('node:fs');
const path = require('node:path');

const raiz = __dirname;
const modoLancamento = process.argv.includes('--lancamento');
const falhas = [];
const pendencias = [];
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');
const existe = (f) => fs.existsSync(path.join(raiz, f));

for (const f of ['robots.txt', '404.html', 'privacidade-e-termos.html', '_headers']) {
  if (!existe(f)) falhas.push(`Falta o arquivo ${f}`);
}

const arquivos = fs.readdirSync(raiz);
const htmls = arquivos.filter((f) => f.endsWith('.html'));

for (const f of htmls) {
  const t = ler(f);
  if (!/<html[^>]*\slang="/.test(t)) falhas.push(`${f}: falta lang no <html>`);
  if (!/<title>[^<]+<\/title>/.test(t)) falhas.push(`${f}: falta <title>`);
  if (!/name="viewport"/.test(t)) falhas.push(`${f}: falta meta viewport`);
  if (!/name="description"/.test(t)) falhas.push(`${f}: falta meta description`);
  if (!/Content-Security-Policy/.test(t)) falhas.push(`${f}: falta a CSP`);
  if (/\sstyle="/.test(t)) falhas.push(`${f}: tem style inline (a CSP bloqueia)`);
  if (/\son[a-z]+="/.test(t)) falhas.push(`${f}: tem evento inline (onclick etc.)`);
  if (/<script(?![^>]*\ssrc=)[^>]*>/.test(t)) falhas.push(`${f}: tem script inline`);
  if (/(?:src|href)="http:\/\//.test(t)) falhas.push(`${f}: recurso http:// (conteúdo misto)`);
  for (const m of t.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const alvo = m[1];
    if (/^(https?:|mailto:|tel:|#|data:)/.test(alvo)) continue;
    const arq = alvo.split('#')[0];
    if (arq && !existe(arq)) falhas.push(`${f}: link quebrado para ${alvo}`);
  }
}

const publicos = [...arquivos.filter((f) => /\.(html|txt)$/.test(f)), 'app.js', 'logica.js', 'monitor.js', 'nativo.js', '_headers'].filter(existe);
const segredos = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /(api[_-]?key|secret|token|senha|password)\s*[:=]\s*['"][^'"\s]{8,}['"]/i
];
for (const f of publicos) {
  const t = ler(f);
  if (segredos.some((r) => r.test(t))) falhas.push(`${f}: parece conter um segredo`);
  if (/lorem ipsum/i.test(t)) falhas.push(`${f}: texto provisório (lorem ipsum)`);
  if (/\[PREENCHER/.test(t)) pendencias.push(`${f}: tem texto [PREENCHER] para completar`);
}

falhas.forEach((x) => console.log('FALHA    ', x));
pendencias.forEach((x) => console.log('PENDENTE ', x));
console.log(`${htmls.length} páginas verificadas: ${falhas.length} falha(s), ${pendencias.length} pendência(s).`);
process.exit(falhas.length || (modoLancamento && pendencias.length) ? 1 : 0);
