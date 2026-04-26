import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_BASE = process.env.E2E_API_BASE || 'http://localhost:8080';
const TIMEOUT = 20000;

const CREDENTIALS = {
  email: process.env.E2E_CUSTOMER_EMAIL || 'minh.customer@fashion.local',
  password: process.env.E2E_CUSTOMER_PASSWORD || 'Test@123',
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const log = (label, detail = '') => {
  console.log(`PASS ${label}${detail ? ` -> ${detail}` : ''}`);
};

const getFirstVisibleProductLink = async (page) => {
  const links = page.locator('.storefront-grid a[href^="/product/"]');
  const count = await links.count();
  for (let i = 0; i < count; i += 1) {
    const link = links.nth(i);
    const visible = await link.isVisible().catch(() => false);
    if (!visible) continue;
    const href = await link.getAttribute('href');
    if (href) return { href, link };
  }
  return null;
};

const loginAsCustomer = async (page) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: TIMEOUT });

  const emailInput = page.locator('input[type="email"], input[name="email"], input[autocomplete="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"], input[autocomplete="current-password"]').first();

  await emailInput.waitFor({ state: 'visible', timeout: TIMEOUT });
  await passwordInput.waitFor({ state: 'visible', timeout: TIMEOUT });

  await emailInput.fill(CREDENTIALS.email);
  await passwordInput.fill(CREDENTIALS.password);
  await page.getByRole('button', { name: /đăng nhập|login/i }).first().click();
  await page.waitForURL('**/', { timeout: TIMEOUT });
  await page.waitForLoadState('networkidle');
};

const discoverStoreVoucher = async (page, apiBase) =>
  page.evaluate(async (resolvedApiBase) => {
    const storesRes = await fetch(`${resolvedApiBase}/api/stores`);
    if (!storesRes.ok) {
      return null;
    }
    const stores = await storesRes.json();
    if (!Array.isArray(stores)) {
      return null;
    }

    for (const store of stores.slice(0, 40)) {
      const storeId = String(store?.id || '').trim();
      const slug = String(store?.slug || '').trim();
      if (!storeId || !slug) continue;

      const voucherRes = await fetch(`${resolvedApiBase}/api/vouchers/public?storeId=${encodeURIComponent(storeId)}`);
      if (!voucherRes.ok) continue;
      const vouchers = await voucherRes.json();
      if (!Array.isArray(vouchers)) continue;

      const firstVoucher = vouchers.find((voucher) => {
        const voucherId = String(voucher?.id || '').trim();
        const code = String(voucher?.code || '').trim();
        return Boolean(voucherId && code);
      });

      if (firstVoucher) {
        return {
          storeId,
          slug,
          voucherId: String(firstVoucher.id).trim(),
          voucherCode: String(firstVoucher.code).trim().toUpperCase(),
        };
      }
    }

    return null;
  }, apiBase);

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await loginAsCustomer(page);
    log('Customer login', CREDENTIALS.email);

    const storeVoucher = await discoverStoreVoucher(page, API_BASE);
    assert(storeVoucher, 'Không tìm thấy store có voucher public để test.');
    log('Discover store voucher', `${storeVoucher.slug} / ${storeVoucher.voucherCode}`);

    await page.goto(`${BASE_URL}/store/${encodeURIComponent(storeVoucher.slug)}`, {
      waitUntil: 'networkidle',
      timeout: TIMEOUT,
    });

    const voucherCard = page.locator('.storefront-voucher').filter({ hasText: storeVoucher.voucherCode }).first();
    await voucherCard.waitFor({ state: 'visible', timeout: TIMEOUT });

    const claimButton = voucherCard.locator('button.storefront-voucher-claim').first();
    await claimButton.waitFor({ state: 'visible', timeout: TIMEOUT });
    const claimText = ((await claimButton.textContent()) || '').trim().toLowerCase();

    if (!claimText.includes('đã nhận')) {
      await claimButton.click();
      await page.waitForFunction(
        () => {
          const buttons = Array.from(document.querySelectorAll('.storefront-voucher-claim'));
          return buttons.some((button) => (button.textContent || '').toLowerCase().includes('đã nhận'));
        },
        { timeout: TIMEOUT },
      );
    }
    log('Claim voucher');

    await page.goto(`${BASE_URL}/profile?tab=vouchers`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    const walletMatch = page.locator('.voucher-card').filter({ hasText: storeVoucher.voucherCode }).first();
    await walletMatch.waitFor({ state: 'visible', timeout: TIMEOUT });
    log('Voucher visible in profile wallet');

    await page.goto(`${BASE_URL}/store/${encodeURIComponent(storeVoucher.slug)}`, {
      waitUntil: 'networkidle',
      timeout: TIMEOUT,
    });
    const firstProduct = await getFirstVisibleProductLink(page);
    assert(firstProduct, 'Không có sản phẩm khả dụng để thêm vào giỏ.');

    await firstProduct.link.click();
    await page.waitForURL('**/product/**', { timeout: TIMEOUT });
    await page.waitForLoadState('networkidle');

    const addToCartButton = page.getByRole('button', { name: /thêm vào giỏ|đã thêm/i }).first();
    await addToCartButton.waitFor({ state: 'visible', timeout: TIMEOUT });
    const addToCartResponse = page
      .waitForResponse(
        (response) =>
          response.url().includes('/api/cart/items')
          && response.request().method().toUpperCase() === 'POST',
        { timeout: TIMEOUT },
      )
      .catch(() => null);
    await addToCartButton.click();
    await addToCartResponse;
    await page.waitForTimeout(600);
    log('Add product to cart');

    await page.goto(`${BASE_URL}/cart`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    const checkoutButton = page.locator('button.btn-checkout').first();
    await checkoutButton.waitFor({ state: 'visible', timeout: TIMEOUT });
    const isDisabled = await checkoutButton.isDisabled();
    assert(!isDisabled, 'Nút thanh toán đang disabled sau khi thêm sản phẩm.');
    await checkoutButton.click();

    await page.waitForURL('**/checkout', { timeout: TIMEOUT });
    await page.waitForLoadState('networkidle');
    log('Navigate checkout');

    const checkoutVoucher = page.locator('.coupon-ticket').filter({ hasText: storeVoucher.voucherCode }).first();
    await checkoutVoucher.waitFor({ state: 'visible', timeout: TIMEOUT });
    await checkoutVoucher.click();

    const successVisible = await page
      .locator('.coupon-success')
      .filter({ hasText: storeVoucher.voucherCode })
      .isVisible({ timeout: 4000 })
      .catch(() => false);
    const errorVisible = await page.locator('.coupon-error').isVisible({ timeout: 4000 }).catch(() => false);

    assert(successVisible || errorVisible, 'Bấm voucher nhưng không có phản hồi UI (success/error).');
    log('Select voucher at checkout', successVisible ? 'success state' : 'validation error state');

    console.log('E2E RESULT: PASS');
  } finally {
    await context.close();
    await browser.close();
  }
};

run().catch((error) => {
  console.error('E2E RESULT: FAIL');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
