const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const extensionPath = path.join(root, '.output/chrome-mv3');
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wdk-extension-e2e-'));
const screenshotPath = path.join(root, 'docs', 'browser-e2e-popup.png');
const seed = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const password = 'correct horse battery staple';

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
  const errors = [];
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    viewport: { width: 420, height: 820 },
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  try {
    let serviceWorker = context.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 15_000 });
    }
    const extensionId = new URL(serviceWorker.url()).host;
    const page = await context.newPage();

    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console error: ${message.text()}`);
    });

    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.getByRole('heading', { name: 'WDK Wallet' }).waitFor({ timeout: 15_000 });
    await page.getByLabel('Wallet name').fill('Primary E2E wallet');
    await page.getByLabel('Seed phrase').fill(seed);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: /Create encrypted vault/i }).click();

    await page.getByRole('button', { name: 'Refresh' }).waitFor({ timeout: 90_000 });
    await page.getByRole('button', { name: 'Add account' }).click();
    await waitForSelectOption(page, 2, 'Account 2');
    const primaryAccountOptions = await page.locator('select').nth(2).locator('option').allTextContents();

    await page.getByTitle('Add wallet').click();
    await page.getByPlaceholder('Wallet name').fill('Second E2E wallet');
    await page.getByPlaceholder('Generate a seed or paste an existing BIP-39 phrase').fill(seed);
    await page.locator('section.wallet-form button.primary').click();
    await waitForSelectOption(page, 0, 'Second E2E wallet');

    await page.locator('select').nth(1).selectOption({ label: 'Ethereum' });
    await page.getByPlaceholder('Recipient address').fill('not-an-address');
    await page.getByPlaceholder('Amount').fill('1');
    await page.getByRole('button', { name: 'Quote' }).click();
    await page.getByText(/valid Ethereum address/i).waitFor({ timeout: 10_000 });

    await page.getByTitle('Lock').click();
    await page.getByRole('button', { name: 'Unlock' }).waitFor({ timeout: 15_000 });
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Unlock' }).click();
    await page.getByRole('button', { name: 'Refresh' }).waitFor({ timeout: 90_000 });

    await page.screenshot({ path: screenshotPath, fullPage: true });
    const visibleText = await page.locator('body').innerText();
    const walletOptions = await page.locator('select').first().locator('option').allTextContents();
    const activeAccountOptions = await page.locator('select').nth(2).locator('option').allTextContents();
    const result = {
      ok: true,
      extensionId,
      screenshotPath,
      checks: [
        'created encrypted vault from seed phrase',
        'derived dashboard and balances view',
        'added second account on primary wallet',
        'added and selected second wallet',
        'validated invalid Ethereum recipient before quote',
        'locked and unlocked existing vault',
      ],
      walletOptions,
      primaryAccountOptions,
      activeAccountOptions,
      textSample: visibleText.slice(0, 700),
      errors,
    };

    console.log(JSON.stringify(result, null, 2));
    if (errors.length > 0) {
      process.exitCode = 2;
    }
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
