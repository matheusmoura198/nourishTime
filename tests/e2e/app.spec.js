const { test, expect } = require('@playwright/test');

test('landing leva ao app', async ({ page }) => {
  await page.goto('/index.html');
  await page.getByRole('link', { name: 'Criar meus lembretes' }).click();
  await expect(page).toHaveURL(/app\.html/);
});

test('adiciona uma refeição e ela aparece na lista', async ({ page }) => {
  await page.goto('/app.html');
  await page.fill('#nome', 'Almoço');
  await page.fill('#hora', '23:59');
  await page.fill('#comida', 'Arroz e feijão');
  await page.getByRole('button', { name: 'Salvar refeição' }).click();
  await expect(page.locator('#lista')).toContainText('Arroz e feijão');
});

test('página de privacidade abre pelo rodapé do app', async ({ page }) => {
  await page.goto('/app.html');
  await page.getByRole('link', { name: 'Privacidade e termos' }).first().click();
  await expect(page.getByRole('heading', { name: 'Privacidade e termos' })).toBeVisible();
});

test('apagar todos os dados limpa as refeições', async ({ page }) => {
  await page.goto('/app.html');
  await page.fill('#nome', 'Jantar');
  await page.fill('#hora', '23:59');
  await page.getByRole('button', { name: 'Salvar refeição' }).click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Apagar todos os meus dados' }).click();
  await expect(page.locator('#lista')).not.toContainText('Jantar');
});
