// Funções puras do Hora de Comer (sem acesso à tela), fáceis de testar.
const doisDig = (n) => String(n).padStart(2, '0');
const dataStr = (d) => `${d.getFullYear()}-${doisDig(d.getMonth() + 1)}-${doisDig(d.getDate())}`;
const minutos = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

// Aceita DDD + número (10 ou 11 dígitos), com ou sem 55. Devolve '55...' ou '' se for inválido.
function telefoneComPais(tel) {
  let n = String(tel || '').replace(/\D/g, '');
  if ((n.length === 12 || n.length === 13) && n.startsWith('55')) n = n.slice(2);
  return n.length === 10 || n.length === 11 ? `55${n}` : '';
}

// Monta o link do WhatsApp com a mensagem para o cuidador ('' se o telefone for inválido).
function linkWhatsApp(c, refeicao) {
  const numero = telefoneComPais(c.tel);
  if (!numero) return '';
  const texto = `Oi${c.nome ? `, ${c.nome}` : ''}! ${c.eu || 'Eu'} ainda não fez a refeição das ${refeicao.hora} (${refeicao.nome}). Pode ver se está tudo bem?`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

const textoSeguro = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const STATUS_VALIDOS = ['feito', 'pulou', 'ignorar'];

// Confere os dados salvos no navegador antes de usar (evita erro e conteúdo estranho).
// Também descarta histórico com mais de 30 dias.
function normalizarEstado(bruto) {
  const e = { refeicoes: [], registro: {}, cuidador: { eu: '', nome: '', tel: '', espera: 30 }, grande: false };
  if (!bruto || typeof bruto !== 'object') return e;
  if (Array.isArray(bruto.refeicoes)) {
    e.refeicoes = bruto.refeicoes
      .filter((m) => m && typeof m.id === 'string' && typeof m.hora === 'string' && /^\d{2}:\d{2}$/.test(m.hora))
      .slice(0, 20)
      .map((m) => ({ id: textoSeguro(m.id, 30), nome: textoSeguro(m.nome, 40), hora: m.hora, comida: textoSeguro(m.comida, 80) }));
  }
  if (bruto.registro && typeof bruto.registro === 'object') {
    Object.keys(bruto.registro)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort()
      .slice(-30)
      .forEach((d) => {
        const dia = {};
        const origem = bruto.registro[d];
        if (origem && typeof origem === 'object') {
          Object.entries(origem).forEach(([id, st]) => {
            if (STATUS_VALIDOS.includes(st)) dia[id] = st;
          });
        }
        e.registro[d] = dia;
      });
  }
  const c = bruto.cuidador;
  if (c && typeof c === 'object') {
    const espera = Number(c.espera);
    e.cuidador = {
      eu: textoSeguro(c.eu, 40), nome: textoSeguro(c.nome, 40), tel: textoSeguro(c.tel, 20),
      espera: Number.isFinite(espera) ? Math.min(60, Math.max(10, espera)) : 30
    };
  }
  e.grande = bruto.grande === true;
  return e;
}

if (typeof module !== 'undefined') module.exports = { minutos, dataStr, linkWhatsApp, telefoneComPais, normalizarEstado };
    
