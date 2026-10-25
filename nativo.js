// Alarmes nativos do aplicativo Android (Capacitor).
// No navegador este arquivo não faz nada: o site continua funcionando como antes.
const ehApp = !!(window.Capacitor && (typeof window.Capacitor.isNativePlatform === 'function'
  ? window.Capacitor.isNativePlatform()
  : window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web'));
const LN = ehApp && window.Capacitor.Plugins ? window.Capacitor.Plugins.LocalNotifications : null;
const CANAL = 'refeicoes';

// O Android pede um número inteiro como identificador de cada notificação.
const idNotificacao = (idRefeicao) => Number(String(idRefeicao).slice(-9)) || 1;

// Agenda um alarme por refeição, repetindo todo dia no horário marcado.
async function agendarAlarmes(refeicoes) {
  if (!LN) return;
  try {
    const pendentes = await LN.getPending();
    if (pendentes.notifications.length) await LN.cancel({ notifications: pendentes.notifications });
    await LN.createChannel({ id: CANAL, name: 'Refeições', description: 'Alarmes de refeição', importance: 5, visibility: 1, vibration: true });
    if (!refeicoes.length) return;
    await LN.schedule({
      notifications: refeicoes.map((m) => ({
        id: idNotificacao(m.id),
        title: 'Hora de comer: ' + m.nome,
        body: m.comida || 'Está na hora da sua refeição.',
        channelId: CANAL,
        schedule: { on: { hour: Number(m.hora.slice(0, 2)), minute: Number(m.hora.slice(3, 5)) }, allowWhileIdle: true }
      }))
    });
  } catch (e) { registrarErro('alarme', e && e.message ? e.message : e); }
}

// Pede ao usuário a permissão de notificações e de alarme exato.
async function pedirPermissoes() {
  if (!LN) return false;
  try {
    const p = await LN.requestPermissions();
    if (p.display !== 'granted') return false;
    const exato = await LN.checkExactNotificationSetting();
    if (exato.exact_alarm !== 'granted') await LN.changeExactNotificationSetting();
    return true;
  } catch (e) { registrarErro('permissao', e && e.message ? e.message : e); return false; }
}

if (ehApp) {
  document.addEventListener('DOMContentLoaded', () => {
    const caixa = document.getElementById('aviso-alarme');
    const botao = document.getElementById('btn-ativar');
    if (!caixa || !botao) return;
    caixa.querySelector('b').textContent = 'Permita os alarmes para o app tocar mesmo fechado.';
    caixa.querySelector('p').textContent = 'Toque no botão e aceite as duas permissões que o celular pedir.';
    botao.addEventListener('click', async () => {
      const ok = await pedirPermissoes();
      if (ok) { if (typeof estado !== 'undefined') agendarAlarmes(estado.refeicoes); return; }
      caixa.style.display = '';
      caixa.querySelector('p').textContent = 'Sem a permissão os alarmes não tocam. Abra Configurações > Apps > Hora de Comer > Notificações e permita.';
    });
  });
                                      }
    
