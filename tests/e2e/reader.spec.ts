import { test, expect, type Page } from '@playwright/test';

async function importText(page: Page, text: string, title = 'A quiet test') {
  await page.goto('./#import'); await page.getByRole('button',{name:'Paste text',exact:true}).click(); await page.getByPlaceholder('Document title').fill(title);
  await page.getByTestId('import-text').fill(text); await page.getByRole('button', { name: 'Review text' }).click();
  await page.getByRole('button', { name: 'Save to library' }).click(); await expect(page.getByTestId('rsvp-word')).toBeVisible();
}
test('import → play → pause → reload → context highlight → backup restore', async ({ page, browser }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await importText(page, '¡Hola, café! A quiet day begins.\n\nWords are a little trail. Follow them one at a time.');
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.waitForTimeout(750); await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const index = await page.getByRole('slider', { name: 'Reading position' }).inputValue(); expect(+index).toBeGreaterThan(0);
  await page.waitForTimeout(150); await page.reload(); await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible(); await expect(page.getByRole('slider', { name: 'Reading position' })).toHaveValue(index);
  await page.getByRole('button', { name: 'Context', exact: true }).click();
  await page.locator('.context-text').evaluate(el => { const span = el.querySelector('[data-token="0"]')!; const range = document.createRange(); range.selectNodeContents(span); const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range); el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); });
  await page.getByPlaceholder('What stood out?').fill('Keep this'); await page.getByRole('button', { name: 'Save highlight' }).click(); await expect(page.getByText('Highlight saved')).toBeVisible();
  await page.getByRole('button', { name: 'Close context' }).click(); await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.goto('./#settings'); await expect(page.getByRole('button', { name: 'Export backup' })).toBeVisible();
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export backup' }).click(); const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^stillword-backup-.*\.json$/);
  // Read the actual exported Blob. Host download-to-disk behavior belongs to device QA;
  // some sandboxed Windows runners cancel disk downloads after receiving their bytes.
  const payload = await page.evaluate(url => fetch(url).then(r => r.text()), download.url());
  const context = await browser.newContext({ baseURL: new URL('./', page.url()).href }); const restored = await context.newPage(); await restored.goto('./#settings'); await restored.getByLabel('Restore backup file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(payload) }); await restored.getByRole('button', { name: 'Merge backup' }).click();
  await expect(restored.getByText('Your backup has been restored.')).toBeVisible(); await restored.goto('./#highlights'); await expect(restored.getByText('Keep this')).toBeVisible();
  await restored.goto('./#library'); await restored.getByRole('button', { name: 'Continue reading' }).click(); await expect(restored.getByRole('slider', { name: 'Reading position' })).toHaveValue(index); await expect(restored.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  expect(errors).toEqual([]); await context.close();
});
test('anchor centers remain fixed in variable fonts; long tokens fit mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await importText(page, 'a café “attention,” número extraordinary anticonstitucionalmente 👩‍💻 ' + 'super'.repeat(100) + ' AVATAR a\u0301');
  await page.evaluate(() => document.fonts.ready);
  for (const font of ['sans', 'serif', 'mono']) {
    await page.getByRole('button', { name: 'Library', exact: true }).click(); await page.goto('./#settings'); await page.getByLabel('Typeface').selectOption(font); await page.goto('./#library'); await page.getByRole('button', { name: 'Continue reading' }).click();
    for (const index of [0, 1, 2, 3, 4, 5, 7, 8, 9]) {
      await page.getByRole('slider', { name: 'Reading position' }).fill(String(index));
      await page.waitForTimeout(40);
      const dimensions = await page.evaluate(() => { const glyph = document.querySelector('[data-testid="anchor"]')!.getBoundingClientRect(), box = document.querySelector('.word-box')!.getBoundingClientRect(), word = document.querySelector('[data-testid="rsvp-word"]')!.getBoundingClientRect(); return { center: glyph.x + glyph.width / 2, target: box.x + box.width / 2, left: word.left, right: word.right, width: innerWidth }; });
      expect(Math.abs(dimensions.center - dimensions.target)).toBeLessThanOrEqual(1); expect(dimensions.left).toBeGreaterThanOrEqual(0); expect(dimensions.right).toBeLessThanOrEqual(dimensions.width);
    }
  }
  await page.screenshot({ path: 'test-results/reader-mobile.png', fullPage: true });
});
test('a 100,000-word local file imports and seeks without counting skipped words', async ({ page }) => {
  await page.goto('./#import'); await page.getByLabel('Upload reading file').setInputFiles({ name: 'substantial-book.txt', mimeType: 'text/plain', buffer: Buffer.from('A little quiet goes a very long way.\n\n'.repeat(12500)) });
  await expect(page.locator('.pill')).toContainText('100,000 words'); await page.getByRole('button', { name: 'Save to library' }).click(); await expect(page.getByTestId('rsvp-word')).toBeVisible();
  await page.getByRole('slider', { name: 'Reading position' }).fill('95000'); await expect(page.getByRole('slider', { name: 'Reading position' })).toHaveValue('95000'); await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.waitForTimeout(300); await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Library', exact: true }).click(); await page.goto('./#stats'); const words = await page.locator('.stat-cards strong').first().innerText(); expect(+words).toBeGreaterThan(0); expect(+words).toBeLessThan(5);
});
test('manifest, worker, assets and hash routes remain inside the application base', async ({ page }) => {
  await page.goto('./#settings'); const manifestUrl = await page.locator('link[rel=manifest]').getAttribute('href'); expect(manifestUrl).toBeTruthy();
  const response = await page.request.get(new URL(manifestUrl!, page.url()).href); expect(response.ok()).toBe(true); const manifest = await response.json();
  const base = new URL('./', page.url()).pathname; expect(manifest.start_url).toBe(base); expect(manifest.scope).toBe(base);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope); expect(new URL(scope).pathname).toBe(base);
  for (const icon of manifest.icons) expect((await page.request.get(new URL(icon.src, new URL(manifestUrl!, page.url())).href)).ok()).toBe(true);
  await page.reload(); await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});
test('HTML extraction is inert and preserves readable order', async ({ page }) => {
  const tracking: string[] = []; page.on('request', req => { if (req.url().includes('tracker.invalid')) tracking.push(req.url()); });
  await page.goto('./#import'); await page.getByLabel('Upload reading file').setInputFiles({ name: 'unsafe.html', mimeType: 'text/html', buffer: Buffer.from('<html><head><title>noise</title></head><body><h1>Café</h1><script>window.evil=true;fetch("https://tracker.invalid/script")</script><img src="https://tracker.invalid/pixel" onerror="window.evil=true"><p>¡Hola, mundo!</p><iframe src="https://tracker.invalid/frame"></iframe><p hidden>Hidden</p></body></html>') });
  await expect(page.getByTestId('import-text')).toHaveValue('Café\n\n¡Hola, mundo!'); await page.waitForTimeout(100); expect(tracking).toEqual([]); expect(await page.evaluate(() => 'evil' in window)).toBe(false);
});
test('offline relaunch retains a locally imported document', async ({ page, context }) => {
  await importText(page, 'Read offline. The words are already here.');
  await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await expect(page.getByTestId('rsvp-word')).toBeVisible(); await context.setOffline(true);
  await page.reload(); await expect(page.getByTestId('rsvp-word')).toBeVisible(); await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.waitForTimeout(300); await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
});
test('completion counts intervals, seek counts nothing, and visibility pauses', async ({ page }) => {
  await importText(page, 'One two three.'); await page.getByRole('slider', { name: 'Reading position' }).fill('2');
  await page.getByRole('button', { name: 'Library', exact: true }).click(); await page.goto('./#stats'); await expect(page.locator('.stat-cards strong').first()).toHaveText('0');
  await page.goto('./#library'); await page.getByRole('button', { name: 'Continue reading' }).click(); await page.getByRole('button', { name: 'Play', exact: true }).click(); await expect(page.getByRole('button', { name: 'Read again', exact: true })).toBeVisible();
  await page.waitForTimeout(150); await page.getByRole('button', { name: 'Library', exact: true }).click(); await page.goto('./#stats'); await expect(page.locator('.stat-cards strong').first()).toHaveText('1');
  await page.goto('./#library'); await page.getByRole('button', { name: 'Continue reading' }).click(); await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); }); await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});
test('empty library and phone layout are usable', async ({ page }) => {
  await page.goto('./#library'); await expect(page.getByRole('button', { name: 'Add your first read' })).toBeVisible(); await page.screenshot({ path: 'test-results/library-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: 'test-results/library-mobile.png', fullPage: true }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('hold is the default; word and thumb control pause on release or cancellation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await importText(page, 'One two three four five six seven eight nine ten eleven twelve.');
  await expect(page.getByTestId('hold-control')).toBeVisible();
  const area = page.getByTestId('word-area'); const box = (await area.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible(); await page.waitForTimeout(450); await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible(); const index = await page.getByRole('slider', { name: 'Reading position' }).inputValue(); expect(+index).toBeGreaterThan(0);
  await page.waitForTimeout(300); await expect(page.getByRole('slider', { name: 'Reading position' })).toHaveValue(index);
  await page.reload(); await expect(page.getByTestId('hold-control')).toBeVisible(); await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  const nextBox = (await area.boundingBox())!; await page.mouse.move(nextBox.x + nextBox.width / 2, nextBox.y + nextBox.height / 2); await page.mouse.down();
  await area.dispatchEvent('pointercancel', { pointerId: 1 }); await page.mouse.up(); await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  const playBox = (await page.getByTestId('hold-control').boundingBox())!;
  await page.mouse.move(playBox.x + playBox.width / 2, playBox.y + playBox.height / 2); await page.mouse.down(); await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible(); await page.waitForTimeout(220); await page.mouse.up(); await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});
test('classic samples open offline, retain attribution, and do not duplicate on reuse', async ({ page, context }) => {
  await page.goto('./#library'); await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await context.setOffline(true);
  for (const title of ['Alice’s Adventures in Wonderland', 'Pride and Prejudice', 'Don Quijote']) {
    const card = page.locator('.sample-book').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    await card.getByRole('button', { name: 'Read this chapter' }).click(); await expect(page.getByTestId('rsvp-word')).toBeVisible(); await expect(page.getByRole('link', { name: 'Source & license', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Library', exact: true }).click();
  }
  await expect(page.locator('.book-card')).toHaveCount(3);
  await page.locator('.sample-book').filter({ has: page.getByRole('heading', { name: 'Don Quijote', exact: true }) }).getByRole('button', { name: 'Continue sample' }).click();
  await expect(page.getByTestId('rsvp-word')).toHaveText('En'); await page.getByRole('button', { name: 'Library', exact: true }).click(); await expect(page.locator('.book-card')).toHaveCount(3);
  const license = await page.evaluate(async () => (await fetch(document.querySelector<HTMLAnchorElement>('.sample-license a')!.href)).text()); expect(license).toContain('THE FULL PROJECT GUTENBERG'); expect(license).toContain('Don Quijote');
});
test('Spanish covers every screen, persists offline, and preserves book content and notes', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await importText(page, 'Play Settings Hello café.\n\nReading belongs to you.', 'Play Settings');
  await page.getByRole('slider', { name: 'Reading position' }).fill('1');
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('button', { name: 'Mantén pulsado para leer', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Play Settings', exact: true })).toBeVisible();
  await expect(page.getByTestId('rsvp-word')).toHaveText('Settings');
  await expect(page.getByRole('slider', { name: 'Posición de lectura' })).toHaveValue('1');
  await page.getByRole('button', { name: 'Contexto', exact: true }).click();
  await page.locator('.context-text').evaluate(el => { const span = el.querySelector('[data-token="0"]')!; const range = document.createRange(); range.selectNodeContents(span); const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range); el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); });
  await page.getByPlaceholder('¿Qué te llamó la atención?').fill('My note: Settings');
  await page.getByRole('button', { name: 'Guardar subrayado' }).click(); await expect(page.getByText('Subrayado guardado')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar contexto' }).click(); await page.getByRole('button', { name: 'Biblioteca', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tu biblioteca' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Capítulos de muestra' })).toBeVisible();
  await page.screenshot({ path: 'test-results/spanish-library-mobile.png', fullPage: true });
  await page.goto('./#import'); await expect(page.getByRole('button', { name: 'Subir un archivo' })).toBeVisible();
  await page.getByRole('button',{name:'Pegar texto',exact:true}).click();await page.getByTestId('import-text').fill('Texto de prueba.'); await page.getByRole('button', { name: 'Revisar texto' }).click(); await expect(page.getByRole('button', { name: 'Guardar en la biblioteca' })).toBeVisible();
  await page.goto('./#highlights'); await expect(page.getByText('My note: Settings')).toBeVisible(); await expect(page.locator('blockquote')).toHaveText('Play');
  await page.goto('./#stats'); await expect(page.getByText('palabras leídas', { exact: true })).toBeVisible(); await expect(page.getByText('ÚLTIMOS 7 DÍAS')).toBeVisible();
  await page.goto('./#settings'); await expect(page.getByRole('button', { name: 'Exportar copia de seguridad' })).toBeVisible(); await expect(page.getByRole('combobox', { name: 'Idioma de la interfaz', exact: true })).toHaveValue('es');
  await page.evaluate(() => navigator.serviceWorker.ready); await context.setOffline(true); await page.reload(); await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await page.getByRole('button', { name: 'English', exact: true }).click(); await expect(page.getByRole('button', { name: 'Export backup' })).toBeVisible(); await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
