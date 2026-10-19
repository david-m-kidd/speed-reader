import {test,expect} from '@playwright/test';
test('choose paste or upload before showing any editor; preserve a paste draft when switching',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('./#import');
  await expect(page.getByTestId('import-text')).toHaveCount(0);await expect(page.getByPlaceholder('Document title')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Paste text',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Upload a file',exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/import-choice-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Paste text',exact:true}).click();await page.getByTestId('import-text').fill('My pasted document.');await page.getByPlaceholder('Document title').fill('Draft');await page.getByRole('button',{name:'Change import method'}).click();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Upload a file',exact:true}).click();await chooser;await expect(page.getByTestId('import-text')).toHaveCount(0);await expect(page.getByRole('button',{name:'Choose a file'})).toBeVisible();
  await page.getByLabel('Upload reading file').setInputFiles({name:'upload.txt',mimeType:'text/plain',buffer:Buffer.from('Uploaded text to review.')});await expect(page.getByTestId('import-text')).toHaveValue('Uploaded text to review.');await page.getByRole('button',{name:'Back to source'}).click();await expect(page.getByTestId('import-text')).toHaveCount(0);
  await page.getByRole('button',{name:'Change import method'}).click();await page.getByRole('button',{name:'Paste text',exact:true}).click();await page.getByTestId('import-text').fill('Final pasted document.');await page.getByRole('button',{name:'Review text'}).click();await page.getByRole('button',{name:'Save to library'}).click();await expect(page.getByTestId('rsvp-word')).toHaveText('Final');
});
