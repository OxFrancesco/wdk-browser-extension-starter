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

async function selectByName(page, triggerIndex, optionName) {
  await page.getByRole('combobox').nth(triggerIndex).click();
  await page.getByRole('option', { name: optionName }).click();
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

    await page.getByText(/Account 1 on Ethereum Mainnet/i).waitFor({ timeout: 90_000 });
    await selectByName(page, 0, 'Testnet');
    await page.getByText(/Account 1 on Ethereum Sepolia/i).waitFor({ timeout: 90_000 });

    await page.getByRole('button', { name: 'Add account' }).click();
    await selectByName(page, 3, 'Account 2');
    await page.getByText(/Account 2 on Ethereum Sepolia/i).waitFor({ timeout: 90_000 });

    await page.getByTitle('Add wallet').click();
    await page.locator('#new-wallet-name').fill('Second E2E wallet');
    await page.locator('#new-wallet-seed').fill(seed);
    await page.locator('[role="dialog"]').getByRole('button', { name: 'Add wallet' }).click();
    await page.getByText('Second E2E wallet').first().waitFor({ timeout: 90_000 });

    await page.getByRole('tab', { name: 'Send' }).click();
    await page.getByPlaceholder('Recipient address').fill('not-an-address');
    await page.getByPlaceholder('Amount').fill('1');
    await page.getByRole('button', { name: 'Quote' }).click();
    await page.getByText(/valid Ethereum address/i).waitFor({ timeout: 10_000 });

    await page.getByRole('tab', { name: 'WDK' }).click();
    await page.getByRole('button', { name: 'Execute primitive' }).click();
    await page.getByText(/0x9858Ef/i).waitFor({ timeout: 30_000 });

    await page.getByTitle('Lock').click();
    await page.getByRole('button', { name: 'Unlock' }).waitFor({ timeout: 15_000 });
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Unlock' }).click();
    await page.getByText(/Account 1 on Ethereum Sepolia/i).waitFor({ timeout: 90_000 });

    await page.screenshot({ path: screenshotPath, fullPage: true });
    const visibleText = await page.locator('body').innerText();
    const result = {
      ok: true,
      extensionId,
      screenshotPath,
      checks: [
        'created encrypted vault from seed phrase',
        'derived dashboard and balances view',
        'switched from mainnet to testnet',
        'added second account on primary wallet',
        'added and selected second wallet',
        'validated invalid Ethereum recipient before quote',
        'executed a WDK primitive through the popup console',
        'locked and unlocked existing vault',
      ],
      textSample: visibleText.slice(0, 900),
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
