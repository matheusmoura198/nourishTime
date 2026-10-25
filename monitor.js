// Observabilidade caseira: guarda os últimos erros do site no navegador.
// Para ver: abra o console e digite  JSON.parse(localStorage.getItem('erros-horadecomer'))
function registrarErro(tipo, mensagem) {
  try {
    const lista = JSON.parse(localStorage.getItem('erros-horadecomer') || '[]');
    lista.push({ quando: new Date().toISOString(), pagina: location.pathname, tipo, mensagem: String(mensagem) });
    localStorage.setItem('erros-horadecomer', JSON.stringify(lista.slice(-20)));
  } catch (e) { /* sem armazenamento */ }
}
window.addEventListener('error', (e) => registrarErro('erro', e.message));
window.addEventListener('unhandledrejection', (e) => registrarErro('promessa', e.reason));
