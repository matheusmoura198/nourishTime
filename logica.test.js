// Testes unitários das funções puras de logica.js
const test = require('node:test');
const assert = require('node:assert');
const { minutos, dataStr, linkWhatsApp, telefoneComPais, normalizarEstado } = require('../logica.js');

test('minutos converte HH:MM em minutos do dia', () => {
  assert.strictEqual(minutos('00:00'), 0);
  assert.strictEqual(minutos('12:30'), 750);
});

test('dataStr devolve AAAA-MM-DD', () => {
  assert.strictEqual(dataStr(new Date(2026, 0, 5)), '2026-01-05');
});

test('linkWhatsApp monta o link com a mensagem', () => {
  const link = linkWhatsApp({ eu: 'Maria', nome: 'João', tel: '(11) 99999-8888' }, { nome: 'Almoço', hora: '12:30' });
  assert.ok(link.startsWith('https://wa.me/5511999998888?text='));
  assert.ok(decodeURIComponent(link).includes('Maria ainda não fez a refeição das 12:30'));
});

test('telefoneComPais aceita com ou sem 55 e recusa número inválido', () => {
  assert.strictEqual(telefoneComPais('11999998888'), '5511999998888');
  assert.strictEqual(telefoneComPais('+55 (11) 99999-8888'), '5511999998888');
  assert.strictEqual(telefoneComPais('1133334444'), '551133334444');
  assert.strictEqual(telefoneComPais('123'), '');
  assert.strictEqual(telefoneComPais(undefined), '');
});

test('linkWhatsApp devolve vazio quando o telefone é inválido', () => {
  assert.strictEqual(linkWhatsApp({ tel: '123' }, { nome: 'Almoço', hora: '12:30' }), '');
});

test('normalizarEstado devolve o padrão para dados estranhos', () => {
  assert.deepStrictEqual(normalizarEstado('lixo').refeicoes, []);
  assert.deepStrictEqual(normalizarEstado(null).registro, {});
});

test('normalizarEstado descarta refeição com horário inválido e limita textos', () => {
  const e = normalizarEstado({ refeicoes: [{ id: '1', hora: '25h', nome: 'x' }, { id: '2', hora: '12:30', nome: 'a'.repeat(100) }] });
  assert.strictEqual(e.refeicoes.length, 1);
  assert.strictEqual(e.refeicoes[0].nome.length, 40);
});

test('normalizarEstado limita a espera do cuidador entre 10 e 60 e ignora status inválido', () => {
  assert.strictEqual(normalizarEstado({ cuidador: { espera: 999 } }).cuidador.espera, 60);
  assert.strictEqual(normalizarEstado({ cuidador: { espera: 1 } }).cuidador.espera, 10);
  const e = normalizarEstado({ registro: { '2026-10-25': { a: 'feito', b: '<script>' } } });
  assert.deepStrictEqual(e.registro['2026-10-25'], { a: 'feito' });
});

test('normalizarEstado guarda só os últimos 30 dias', () => {
  const registro = {};
  for (let d = 1; d <= 28; d++) registro[`2026-09-${String(d).padStart(2, '0')}`] = { a: 'feito' };
  for (let d = 1; d <= 10; d++) registro[`2026-10-${String(d).padStart(2, '0')}`] = { a: 'feito' };
  assert.strictEqual(Object.keys(normalizarEstado({ registro }).registro).length, 30);
});
  
