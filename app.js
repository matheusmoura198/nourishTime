// Hora de Comer - lógica do app (JS puro, dados salvos no navegador)
const CHAVE = 'horadecomer';
function carregar() {
  try { return normalizarEstado(JSON.parse(localStorage.getItem(CHAVE))); }
  catch (e) { return normalizarEstado(null); }
}
let estado = carregar();
let adiadas = {};     // id da refeição -> hora (ms) até quando está adiada
let alertas = [];     // avisos de refeições puladas para enviar ao cuidador
let tocando = null;   // refeição que está tocando agora
let somTimer = null;
let ultimoFoco = null;  // para devolver o foco ao fechar o alarme
let audio = null;       // um único contexto de som, reaproveitado
let primeiraVez = true;
let novaId = null;    // refeição recém-criada (ganha animação de entrada)

const $ = (id) => document.getElementById(id);
const salvar = () => {
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); }
  catch (e) { $('aviso-armazenamento').hidden = false; }
};
const el = (tag, classe, texto) => {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto) e.textContent = texto;
  return e;
};
const agoraMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const registroHoje = () => estado.registro[dataStr(new Date())] || {};

function marcar(id, status) {
  const dia = dataStr(new Date());
  estado.registro[dia] = estado.registro[dia] || {};
  estado.registro[dia][id] = status;
  salvar();
}

// Reagenda os alarmes do celular (só faz algo dentro do aplicativo Android).
const reagendar = () => { if (typeof agendarAlarmes === 'function') agendarAlarmes(estado.refeicoes); };

// ---------- tela ----------
function desenhar() {
  const reg = registroHoje();
  const lista = [...estado.refeicoes].sort((a, b) => minutos(a.hora) - minutos(b.hora));
  $('lista').innerHTML = lista.length ? '' : '<p class="vazio">Nenhuma refeição ainda. Adicione a primeira abaixo.</p>';
  $('lista').setAttribute('aria-busy', 'false');
  lista.forEach((m) => {
    const s = reg[m.id];
    const [textoChip, classeChip] = s === 'feito' ? ['Comeu', 'feito'] : s === 'pulou' ? ['Pulou', 'pulou']
      : s === 'ignorar' ? ['Começa amanhã', ''] : ['Aguardando', ''];
    const div = el('div', 'refeicao' + (m.id === novaId ? ' nova' : ''));
    const info = el('div', 'info');
    info.append(el('b', '', m.nome), document.createElement('br'), el('small', '', m.comida || 'Sem descrição'));
    const apagar = el('button', 'btn sec peq', 'Apagar');
    apagar.type = 'button';
    apagar.dataset.apagar = m.id;
    apagar.setAttribute('aria-label', 'Apagar ' + m.nome);
    div.append(el('div', 'h', m.hora), info, el('span', 'chip ' + classeChip, textoChip), apagar);
    $('lista').appendChild(div);
  });
  novaId = null;
  const feitas = lista.filter((m) => reg[m.id] === 'feito').length;
  const pct = lista.length ? Math.round((feitas / lista.length) * 100) : 0;
  $('resumo').textContent = lista.length ? feitas + ' de ' + lista.length + ' refeições feitas hoje' : '';
  $('barra').style.width = pct + '%';
  $('progresso').setAttribute('aria-valuenow', pct);
  desenharAlertas();
  desenharHistorico();
}

function desenharAlertas() {
  $('alertas').innerHTML = '';
  alertas.forEach((a, i) => {
    const c = estado.cuidador;
    const div = el('div', 'alerta');
    div.setAttribute('role', 'alert');
    div.append(el('b', '', 'Refeição pulada: ' + a.nome + ' (' + a.hora + ')'), document.createElement('br'));
    const link = linkWhatsApp(c, a);
    if (link) {
      div.append('Avise ' + (c.nome || 'o cuidador') + ' agora. ');
      const botao = el('a', 'btn verde peq', 'Avisar pelo WhatsApp');
      botao.href = link;
      botao.target = '_blank';
      botao.rel = 'noopener noreferrer';
      botao.addEventListener('click', () => { alertas.splice(i, 1); desenharAlertas(); });
      div.append(botao);
    } else {
      div.append('Cadastre um cuidador com WhatsApp válido abaixo para poder avisá-lo.');
    }
    $('alertas').appendChild(div);
  });
}

function desenharHistorico() {
  $('historico').innerHTML = '';
  const nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const reg = estado.registro[dataStr(d)] || {};
    const vals = Object.values(reg).filter((v) => v === 'feito' || v === 'pulou');
    const feitas = vals.filter((v) => v === 'feito').length;
    const div = document.createElement('div');
    div.className = vals.length ? (feitas === vals.length ? 'bom' : 'ruim') : '';
    div.innerHTML = '<b>' + nomes[d.getDay()] + '</b><br>' + (vals.length ? feitas + '/' + vals.length : '–');
    $('historico').appendChild(div);
  }
}

// ---------- alarme ----------
function bip() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator();
    o.frequency.value = 880; o.connect(audio.destination);
    o.start(); o.stop(audio.currentTime + 0.3);
  } catch (e) { /* sem som */ }
}

function tocar(m) {
  tocando = m;
  $('m-hora').textContent = m.hora;
  $('m-texto').textContent = m.nome + (m.comida ? ': ' + m.comida : '');
  ultimoFoco = document.activeElement;
  document.querySelector('.app').inert = true;
  $('fundo').classList.add('aberto');
  setTimeout(() => $('m-comi').focus(), 60);
  bip(); somTimer = setInterval(bip, 2500);
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Hora de comer: ' + m.nome, { body: m.comida || m.hora, icon: 'img/logo-96.png' });
    }
  } catch (e) { /* alguns celulares não aceitam este tipo de notificação */ }
}

function fecharAlarme() {
  clearInterval(somTimer);
  $('fundo').classList.remove('aberto');
  document.querySelector('.app').inert = false;
  if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  tocando = null;
}

function avisarCuidador(m) { alertas.push({ nome: m.nome, hora: m.hora }); }

function verificar() {
  const reg = registroHoje();
  const espera = Number(estado.cuidador.espera) || 30;
  estado.refeicoes.forEach((m) => {
    if (reg[m.id]) return;
    const atraso = agoraMin() - minutos(m.hora);
    if (atraso < 0) return;
    if (atraso >= espera) {
      // se a página acabou de abrir, não sabemos o que aconteceu: não avisa o cuidador à toa
      if (primeiraVez) { marcar(m.id, 'ignorar'); }
      else { if (tocando && tocando.id === m.id) fecharAlarme(); marcar(m.id, 'pulou'); avisarCuidador(m); }
      desenhar();
      return;
    }
    if (!tocando && (adiadas[m.id] || 0) <= Date.now()) tocar(m);
  });
  primeiraVez = false;
}

// ---------- eventos ----------
$('m-comi').addEventListener('click', () => { marcar(tocando.id, 'feito'); fecharAlarme(); desenhar(); });
$('m-adiar').addEventListener('click', () => { adiadas[tocando.id] = Date.now() + 10 * 60000; fecharAlarme(); });
$('m-pular').addEventListener('click', () => { const m = tocando; marcar(m.id, 'pulou'); avisarCuidador(m); fecharAlarme(); desenhar(); });

$('btn-ativar').addEventListener('click', () => {
  bip();
  if ('Notification' in window) Notification.requestPermission();
  $('aviso-alarme').style.display = 'none';
});

$('btn-letra').addEventListener('click', () => {
  estado.grande = !estado.grande; salvar();
  document.body.classList.toggle('grande', estado.grande);
});

$('sugestoes').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  $('nome').value = b.dataset.nome; $('hora').value = b.dataset.hora; $('comida').focus();
});

$('form-refeicao').addEventListener('submit', (e) => {
  e.preventDefault();
  if (estado.refeicoes.length >= 20) { $('msg-refeicao').textContent = 'Limite de 20 refeições. Apague uma para adicionar outra.'; return; }
  $('msg-refeicao').textContent = '';
  const m = { id: String(Date.now()), nome: $('nome').value.trim(), hora: $('hora').value, comida: $('comida').value.trim() };
  estado.refeicoes.push(m);
  novaId = m.id;
  if (minutos(m.hora) <= agoraMin()) marcar(m.id, 'ignorar'); // horário de hoje já passou
  salvar(); e.target.reset(); desenhar(); reagendar();
});

$('lista').addEventListener('click', (e) => {
  const id = e.target.dataset.apagar; if (!id) return;
  // animação de saída antes de apagar
  const linha = e.target.closest('.refeicao');
  linha.classList.add('saindo');
  setTimeout(() => {
    estado.refeicoes = estado.refeicoes.filter((m) => m.id !== id);
    salvar(); desenhar(); reagendar();
  }, 250);
});

$('form-cuidador').addEventListener('submit', (e) => {
  e.preventDefault();
  const tel = $('c-tel').value.trim();
  if (tel && !telefoneComPais(tel)) { $('msg-cuidador').textContent = ' Digite DDD + número, por exemplo 11999998888.'; return; }
  const espera = Math.min(60, Math.max(10, Number($('c-espera').value) || 30));
  estado.cuidador = { eu: $('meu-nome').value.trim(), nome: $('c-nome').value.trim(), tel, espera };
  salvar(); $('msg-cuidador').textContent = ' Salvo!'; desenharAlertas();
});

$('btn-apagar-tudo').addEventListener('click', () => {
  if (!confirm('Apagar todas as refeições, o cuidador e o histórico deste aparelho? Não dá para desfazer.')) return;
  try { localStorage.removeItem(CHAVE); localStorage.removeItem('erros-horadecomer'); } catch (e) { /* sem armazenamento */ }
  location.reload();
});

// ---------- início ----------
$('meu-nome').value = estado.cuidador.eu; $('c-nome').value = estado.cuidador.nome;
$('c-tel').value = estado.cuidador.tel; $('c-espera').value = estado.cuidador.espera;
document.body.classList.toggle('grande', estado.grande);
// os esqueletos do HTML ficam visíveis por um instante e depois entra o conteúdo real
setTimeout(() => { desenhar(); verificar(); reagendar(); }, 500);
setInterval(verificar, 5000);
  
