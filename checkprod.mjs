import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://krispy-beta.vercel.app/app');
await page.waitForTimeout(1500);

await Promise.all([
  page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
  page.click('text=Continue with Google'),
]);
await page.waitForTimeout(1000);
const url = page.url();
console.log('Redirected to:', url);

const parsed = new URL(url);
if (parsed.hostname.includes('accounts.google.com')) {
  console.log('client_id:', parsed.searchParams.get('client_id'));
  const err = parsed.searchParams.get('authError');
  console.log('has authError:', Boolean(err));
  console.log('path:', parsed.pathname);
}

await browser.close();
