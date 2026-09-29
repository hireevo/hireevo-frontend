import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const BASE = 'http://localhost:3101';
const S = process.env.S;
writeFileSync(
  `${S}/acl.png`,
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const puts = [];
page.on('response', (r) => {
  if (r.request().method() === 'PUT') puts.push(`${r.status()} ${r.url().split('?')[0]}`);
});
await page.goto(`${BASE}/sign-in`);
await page.getByLabel('E-mail').fill('dbcheck.freelancer@hireevo.local');
await page.getByLabel('Password').fill('SaveCheck!2026#db');
await page.getByRole('button', { name: /Sign in/i }).click();
await page.waitForURL(/dashboard|client-profile/, { timeout: 30000 });
await page.goto(`${BASE}/client-profile`);
await page.waitForLoadState('networkidle');
await page.getByRole('button', { name: 'Edit profile' }).click();
await page.waitForTimeout(1200);

const section = page
  .locator('section')
  .filter({ has: page.getByRole('heading', { name: 'Portfolio' }) })
  .last();
await section.getByRole('button', { name: 'Edit' }).first().click();
await page.waitForTimeout(800);
await section.getByRole('button', { name: 'Add portfolio' }).click();
await page.waitForTimeout(400);
await section.getByLabel('Title').last().fill('ACL check');
await section.locator('input[type=file]').last().setInputFiles(`${S}/acl.png`);
await page.waitForTimeout(6000);

console.log('storage PUTs:', puts.join(' | ') || '(none)');
const tail = (await section.innerText()).split('ACL check')[1] ?? '';
console.log(
  'piece now reads:',
  tail
    .split('\n')
    .filter((l) => l.trim() !== '')
    .slice(0, 6)
    .join(' | '),
);
await browser.close();
