const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const extensionPath = path.join(root, '.output/chrome-mv3');
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wdk-extension-demo-'));
const videoDir = path.join(root, 'docs', '.demo-video');
const videoPath = path.join(root, 'docs', 'browser-demo.webm');
const seed = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const password = 'correct horse battery staple';

async function pause(page, ms = 750) {
  await page.waitForTimeout(ms);
}

async function waitForSelectOption(page, selectIndex, label, timeout = 90_000) {
  await page.waitForFunction(
    ({ selectIndex, label }) => {
      const select = document.querySelectorAll('select')[selectIndex];
      return !!select && Array.from(select.options).some((option) => option.textContent?.trim() === label);
    },
    { selectIndex, label },
    { timeout },
  );
}

async function main() {
  fs.rmSync(videoDir, { recursive: true, force: true });
  fs.mkdirSync(videoDir, { recursive: true });
  fs.rmSync(videoPath, { force: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    viewport: { width: 420, height: 820 },
    recordVideo: { dir: videoDir, size: { width: 420, height: 820 } },
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  let page;
  try {
    let serviceWorker = context.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 15_000 });
    }
    const extensionId = new URL(serviceWorker.url()).host;
    page = await context.newPage();

    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.getByRole('heading', { name: 'WDK Wallet' }).waitFor({ timeout: 15_000 });
    await pause(page, 1_000);

    await page.getByLabel('Wallet name').fill('Demo wallet');
    await page.getByLabel('Seed phrase').fill(seed);
    await page.getByLabel('Password').fill(password);
    await pause(page);
    await page.getByRole('button', { name: /Create encrypted vault/i }).click();

    await page.getByRole('button', { name: 'Refresh' }).waitFor({ timeout: 90_000 });
    await pause(page, 1_200);

    await page.getByRole('button', { name: 'Add account' }).click();
    await waitForSelectOption(page, 2, 'Account 2');
    await pause(page, 1_000);

    await page.getByTitle('Add wallet').click();
    await page.getByPlaceholder('Wallet name').fill('Second demo wallet');
    await page.getByPlaceholder('Generate a seed or paste an existing BIP-39 phrase').fill(seed);
    await pause(page);
    await page.locator('section.wallet-form button.primary').click();
    await waitForSelectOption(page, 0, 'Second demo wallet');
    await pause(page, 1_000);

    await page.locator('select').nth(1).selectOption({ label: 'Ethereum' });
    await page.getByPlaceholder('Recipient address').fill('not-an-address');
    await page.getByPlaceholder('Amount').fill('1');
    await pause(page);
    await page.getByRole('button', { name: 'Quote' }).click();
    await page.getByText(/valid Ethereum address/i).waitFor({ timeout: 10_000 });
    await pause(page, 1_200);

    await page.getByTitle('Lock').click();
    await page.getByRole('button', { name: 'Unlock' }).waitFor({ timeout: 15_000 });
    await pause(page);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Unlock' }).click();
    await page.getByRole('button', { name: 'Refresh' }).waitFor({ timeout: 90_000 });
    await pause(page, 1_200);
  } finally {
    const video = page?.video();
    await context.close();
    if (video) {
      const recordedPath = await video.path();
      fs.renameSync(recordedPath, videoPath);
    }
    fs.rmSync(videoDir, { recursive: true, force: true });
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  console.log(JSON.stringify({ ok: true, videoPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
