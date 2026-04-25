#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULTS = {
  categoriesPath: path.join(__dirname, 'default-categories.json'),
  outputDir: path.resolve(__dirname, '..', 'backend', 'src', 'main', 'resources', 'product'),
  targetCount: 1000,
  maxColorsPerProduct: 4,
  maxSizesPerProduct: 6,
  maxPerCategory: 120,
  delayMs: 1200,
  timeoutMs: 45_000,
  headless: true,
  maxStableRounds: 5,
};
const MAX_IMAGES_PER_PRODUCT = 6;

const HELP_TEXT = `
Gap product crawler (safe-mode) -> exports GAP importer-compatible CSV

Usage:
  node crawl/crawl-gap-products.mjs [options]

Options:
  --target-count <n>       Total products to collect (default: 1000)
  --max-colors <n>         Max colors captured per product (default: 4)
  --max-sizes <n>          Max sizes captured per product (default: 6)
  --max-per-category <n>   Max product links collected per category URL (default: 120)
  --delay-ms <n>           Delay between requests in ms (default: 1200)
  --timeout-ms <n>         Navigation timeout in ms (default: 45000)
  --categories <path>      Path to category config JSON
  --output-dir <path>      Directory for output files (default: backend/src/main/resources/product)
  --headless <true|false>  Run browser headless (default: true)
  --help                   Show this help

Outputs:
  <output-dir>/styles.csv
  <output-dir>/images.csv
  <output-dir>/products.raw.json
`;

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const [key, valueFromEq] = token.slice(2).split('=');
    if (valueFromEq !== undefined) {
      args[key] = valueFromEq;
      continue;
    }
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function parseBoolean(raw, fallback) {
  if (raw === undefined) return fallback;
  const normalized = String(raw).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return fallback;
}

function parseNumber(raw, fallback) {
  if (raw === undefined) return fallback;
  const value = Number.parseInt(String(raw), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function toAbsoluteUrl(input) {
  if (!input) return '';
  try {
    return new URL(input, 'https://www.gap.com').toString();
  } catch {
    return '';
  }
}

function extractPidFromUrl(productUrl) {
  try {
    const parsed = new URL(productUrl);
    const pid = parsed.searchParams.get('pid');
    if (pid && /^\d+$/.test(pid)) return pid;
  } catch {
    return '';
  }
  const match = String(productUrl).match(/[?&]pid=(\d+)/i);
  return match ? match[1] : '';
}

function normalizeSpace(value) {
  return String(value || '')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2032]/g, "'")
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\u2022/g, '-')
    .replace(/\u200B/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCase(value) {
  const normalized = normalizeSpace(value);
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : '';
}

function normalizeColorLabel(value) {
  const normalized = normalizeSpace(value)
    .replace(/^color\s*:?/i, '')
    .replace(/^mau\s*:?/i, '');
  return normalizeCase(normalized);
}

function normalizeSizeLabel(value) {
  const normalized = normalizeSpace(value).replace(/[_-]+/g, '/');
  if (!normalized) return '';
  const upper = normalized.toUpperCase();

  // GAP often returns waist sizes as 28W, 29W... keep digits only.
  const waistOnlyMatch = upper.match(/^(\d{2,3})\s*W$/);
  if (waistOnlyMatch) {
    return waistOnlyMatch[1];
  }

  return upper;
}

function normalizeHexColor(value) {
  const raw = normalizeSpace(value).toLowerCase();
  const match = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) {
    return '';
  }
  if (match[1].length === 3) {
    const [r, g, b] = match[1];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return `#${match[1].toLowerCase()}`;
}

function isDarkColorName(colorName) {
  const token = normalizeSpace(colorName).toLowerCase();
  if (!token) return false;
  return [
    'black',
    'night',
    'midnight',
    'moonless',
    'charcoal',
    'jet',
    'onyx',
    'ink',
    'navy',
    'washed black',
  ].some((keyword) => token.includes(keyword));
}

function inferHexFromColorName(colorName) {
  const token = normalizeSpace(colorName).toLowerCase();
  if (!token) return '';

  const keywordPalette = [
    { keys: ['white', 'ivory', 'cream', 'off white'], hex: '#f3f4f6' },
    { keys: ['black', 'charcoal', 'jet', 'onyx', 'midnight', 'moonless', 'washed black'], hex: '#111827' },
    { keys: ['navy', 'indigo', 'blue', 'denim', 'wash', 'cornflower', 'rinsed', 'resin'], hex: '#4b6b9b' },
    { keys: ['grey', 'gray', 'ash', 'silver', 'heather'], hex: '#9ca3af' },
    { keys: ['olive', 'green', 'sage', 'mint'], hex: '#6b8f71' },
    { keys: ['khaki', 'tan', 'beige', 'camel', 'cashew', 'cognac', 'brown', 'chocolate'], hex: '#b08968' },
    { keys: ['red', 'crimson', 'burgundy', 'wine'], hex: '#b91c1c' },
    { keys: ['pink', 'rose', 'blush'], hex: '#db89a8' },
    { keys: ['purple', 'violet', 'lavender'], hex: '#8b5fbf' },
    { keys: ['yellow', 'gold', 'mustard'], hex: '#ca8a04' },
    { keys: ['orange', 'peach', 'coral'], hex: '#ea580c' },
  ];

  for (const entry of keywordPalette) {
    if (entry.keys.some((key) => token.includes(key))) {
      return entry.hex;
    }
  }
  return '';
}

function normalizeHexForColorName(rawHex, colorName) {
  const normalized = normalizeHexColor(rawHex);
  if (!normalized) {
    return inferHexFromColorName(colorName);
  }

  const isBlackish = normalized === '#000000' || normalized === '#010101' || normalized === '#111111';
  if (isBlackish && !isDarkColorName(colorName)) {
    return inferHexFromColorName(colorName);
  }

  const isNeutralGray = normalized === '#9ca3af' || normalized === '#d1d5db' || normalized === '#6b7280';
  const isGrayName = /grey|gray|ash|silver|heather/i.test(normalizeSpace(colorName));
  if (isNeutralGray && !isGrayName) {
    const inferred = inferHexFromColorName(colorName);
    if (inferred) {
      return inferred;
    }
  }

  return normalized;
}

function splitTextLines(value) {
  return String(value || '')
    .split(/\r?\n+/)
    .map((line) => normalizeSpace(line))
    .filter(Boolean);
}

function sanitizeSectionLine(value) {
  return normalizeSpace(value).replace(/[|]+/g, ' ');
}

function toInlineSectionText(lines) {
  const normalized = Array.from(new Set((lines || [])
    .map((line) => sanitizeSectionLine(line))
    .filter(Boolean)));
  return normalized.join(' | ');
}

function parseGapInfoSections(detailsText) {
  const lines = splitTextLines(detailsText);
  if (lines.length === 0) {
    return {
      productDetails: '',
      sizeFitDetails: '',
      fabricDetails: '',
      careDetails: '',
    };
  }

  const sections = {
    productDetails: [],
    sizeFitDetails: [],
    fabricCare: [],
  };
  let currentSection = null;

  for (const rawLine of lines) {
    const line = sanitizeSectionLine(rawLine);
    const lowered = line.toLowerCase();

    if (/^product\s+details?$/.test(lowered)) {
      currentSection = 'productDetails';
      continue;
    }
    if (/^size\s*&?\s*fit$/.test(lowered)) {
      currentSection = 'sizeFitDetails';
      continue;
    }
    if (/^fabric\s*&?\s*care$/.test(lowered)) {
      currentSection = 'fabricCare';
      continue;
    }

    if (currentSection) {
      sections[currentSection].push(line);
    }
  }

  const hasStructuredSections =
    sections.productDetails.length > 0
    || sections.sizeFitDetails.length > 0
    || sections.fabricCare.length > 0;
  if (!hasStructuredSections) {
    return {
      productDetails: toInlineSectionText(lines),
      sizeFitDetails: '',
      fabricDetails: '',
      careDetails: '',
    };
  }

  const careKeywords = [
    'wash', 'dry', 'bleach', 'iron', 'tumble', 'clean',
    'do not', 'machine', 'hand wash', 'line dry', 'lay flat', 'rinse',
  ];
  const materialKeywords = [
    'cotton', 'polyester', 'spandex', 'elastane', 'nylon', 'wool', 'linen',
    'denim', 'rayon', 'viscose', 'acrylic', 'modal', 'silk', 'leather', 'blend', 'recycled',
  ];

  const fabricLines = [];
  const careLines = [];
  for (const line of sections.fabricCare) {
    const lowered = line.toLowerCase();
    if (careKeywords.some((keyword) => lowered.includes(keyword))) {
      careLines.push(line);
      continue;
    }
    fabricLines.push(line);
  }

  if (fabricLines.length === 0 && sections.fabricCare.length > 0) {
    const firstMaterial = sections.fabricCare.find((line) =>
      materialKeywords.some((keyword) => line.toLowerCase().includes(keyword)),
    );
    if (firstMaterial) {
      fabricLines.push(firstMaterial);
    }
  }

  if (careLines.length === 0 && sections.fabricCare.length > 1) {
    careLines.push(...sections.fabricCare.slice(1));
  }

  return {
    productDetails: toInlineSectionText(sections.productDetails),
    sizeFitDetails: toInlineSectionText(sections.sizeFitDetails),
    fabricDetails: toInlineSectionText(fabricLines),
    careDetails: toInlineSectionText(careLines),
  };
}

function parseDollarValues(text) {
  const matches = String(text || '').match(/\$\s*\d[\d,]*(?:\.\d{2})?/g) || [];
  return matches
    .map((item) => Number.parseFloat(item.replace(/[^0-9.]/g, '')))
    .filter((num) => Number.isFinite(num) && num > 0);
}

function slugContainsAny(value, needles) {
  const haystack = String(value || '').toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

function inferMasterCategory(seed, breadcrumbs, productName) {
  if (seed.masterCategory) return seed.masterCategory;
  const joined = `${breadcrumbs.join(' ')} ${productName}`.toLowerCase();
  return slugContainsAny(joined, ['accessor', 'hat', 'belt', 'bag', 'wallet', 'sunglass', 'jewelry'])
    ? 'Accessories'
    : 'Apparel';
}

function inferSubCategory(seed, breadcrumbs, productName, masterCategory) {
  if (seed.subCategory) return seed.subCategory;
  const leaf = normalizeCase(breadcrumbs[breadcrumbs.length - 1] || '');
  if (leaf) {
    if (masterCategory === 'Accessories') return 'Fashion Accessories';
    if (slugContainsAny(leaf, ['jean', 'pant', 'short', 'skirt'])) return 'Bottomwear';
    if (slugContainsAny(leaf, ['dress'])) return 'Dress';
    return 'Topwear';
  }

  const name = productName.toLowerCase();
  if (slugContainsAny(name, ['jean', 'pant', 'short', 'skirt'])) return 'Bottomwear';
  if (slugContainsAny(name, ['dress'])) return 'Dress';
  if (masterCategory === 'Accessories') return 'Fashion Accessories';
  return 'Topwear';
}

function inferArticleType(seed, productName, subCategory, masterCategory) {
  if (seed.articleType) return seed.articleType;
  const name = productName.toLowerCase();
  if (slugContainsAny(name, ['jean'])) return 'Jeans';
  if (slugContainsAny(name, ['shirt', 'blouse'])) return 'Shirts';
  if (slugContainsAny(name, ['tee', 't-shirt'])) return 'Tshirts';
  if (slugContainsAny(name, ['sweater'])) return 'Sweaters';
  if (slugContainsAny(name, ['hoodie', 'sweatshirt'])) return 'Sweatshirts';
  if (slugContainsAny(name, ['jacket', 'coat'])) return 'Jackets';
  if (slugContainsAny(name, ['dress'])) return 'Dresses';
  if (slugContainsAny(name, ['short'])) return 'Shorts';
  if (slugContainsAny(name, ['pant', 'trouser'])) return 'Trousers';
  if (masterCategory === 'Accessories') return 'Accessories';
  if (subCategory === 'Bottomwear') return 'Trousers';
  if (subCategory === 'Dress') return 'Dresses';
  return 'Topwear';
}

function inferUsage(seed, breadcrumbs, productName) {
  if (seed.usage) return seed.usage;
  const joined = `${breadcrumbs.join(' ')} ${productName}`.toLowerCase();
  if (slugContainsAny(joined, ['active', 'sport', 'athletic', 'performance', 'workout'])) {
    return 'Sports';
  }
  if (slugContainsAny(joined, ['formal', 'suit', 'office'])) {
    return 'Formal';
  }
  return 'Casual';
}

function csvEscape(value) {
  const raw = String(value ?? '');
  if (!/[",\n\r]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

function serializeCsv(headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readCategoryConfig(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Category config is empty: ${filePath}`);
  }
  return parsed
    .map((item) => ({
      url: toAbsoluteUrl(item.url),
      gender: normalizeCase(item.gender),
      masterCategory: normalizeCase(item.masterCategory),
      subCategory: normalizeCase(item.subCategory),
      articleType: normalizeCase(item.articleType),
      usage: normalizeCase(item.usage),
    }))
    .filter((item) => item.url);
}

async function tryDismissCookieBanner(page) {
  const candidates = [
    'button:has-text("Close")',
    'button[aria-label="Close"]',
    'button:has-text("Accept All")',
    'button:has-text("Accept all")',
  ];
  for (const selector of candidates) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 700 })) {
        await element.click({ timeout: 1500 });
        await page.waitForTimeout(300);
        return;
      }
    } catch {
      // no-op
    }
  }
}

async function collectProductLinksFromCategory(page, category, options) {
  const links = new Set();
  const maxWanted = options.maxPerCategory;
  let stableRounds = 0;

  await page.goto(category.url, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs });
  await tryDismissCookieBanner(page);
  await page.waitForTimeout(700);

  for (let round = 0; round < 50; round += 1) {
    const roundLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('[data-testid="plp_product-info"]'));
      const hrefs = anchors
        .map((anchor) => anchor.getAttribute('href') || '')
        .map((href) => {
          try {
            return new URL(href, location.origin).toString();
          } catch {
            return '';
          }
        })
        .filter((href) => /\/browse\/product\.do\?pid=\d+/i.test(href));
      return Array.from(new Set(hrefs));
    });

    const before = links.size;
    for (const href of roundLinks) {
      if (links.size >= maxWanted) break;
      links.add(href);
    }

    if (links.size >= maxWanted) break;

    if (links.size === before) {
      stableRounds += 1;
    } else {
      stableRounds = 0;
    }
    if (stableRounds >= options.maxStableRounds) break;

    let advanced = false;
    const loadMoreButtons = [
      'button:has-text("View More")',
      'button:has-text("Show More")',
      'button[aria-label*="Show more"]',
      'button[aria-label*="View more"]',
    ];
    for (const selector of loadMoreButtons) {
      const element = page.locator(selector).first();
      try {
        if (await element.isVisible({ timeout: 500 })) {
          await element.click({ timeout: 1200 });
          advanced = true;
          break;
        }
      } catch {
        // ignore and continue
      }
    }

    if (!advanced) {
      await page.mouse.wheel(0, 2500);
    }
    await page.waitForTimeout(options.delayMs);
  }

  return Array.from(links).slice(0, maxWanted);
}

async function scrapeProductPage(page, productUrl, seedCategory, options) {
  await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs });
  await tryDismissCookieBanner(page);
  await page.waitForTimeout(options.delayMs);

  const snapshot = await page.evaluate(() => {
    const HEX_PATTERN = /#([0-9a-f]{3}|[0-9a-f]{6})/i;
    const RGB_PATTERN = /rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i;

    const toHex = (r, g, b) => `#${[r, g, b].map((value) => {
      const normalized = Math.max(0, Math.min(255, Number(value) || 0));
      return normalized.toString(16).padStart(2, '0');
    }).join('')}`;

    const normalizeHex = (raw) => {
      const text = String(raw || '').trim();
      if (!text) {
        return '';
      }
      const hexMatch = text.match(HEX_PATTERN);
      if (hexMatch) {
        const token = hexMatch[0];
        if (token.length === 4) {
          const [hash, r, g, b] = token;
          return `${hash}${r}${r}${g}${g}${b}${b}`.toLowerCase();
        }
        return token.toLowerCase();
      }
      const rgbMatch = text.match(RGB_PATTERN);
      if (rgbMatch) {
        return toHex(rgbMatch[1], rgbMatch[2], rgbMatch[3]);
      }
      return '';
    };

    const inspectNodeForHex = (node) => {
      if (!node) {
        return '';
      }
      const style = window.getComputedStyle(node);
      const values = [
        style.backgroundColor,
        style.getPropertyValue('--swatch-color'),
        style.getPropertyValue('--color'),
        style.getPropertyValue('--bg-color'),
        style.getPropertyValue('--chip-color'),
        node.getAttribute('data-color'),
        node.getAttribute('data-hex'),
        node.getAttribute('data-swatch-color'),
        node.getAttribute('style'),
      ];
      for (const value of values) {
        const hex = normalizeHex(value);
        if (hex) {
          return hex;
        }
      }
      return '';
    };

    const findSwatchHex = (input) => {
      if (!input) {
        return '';
      }

      const id = input.getAttribute('id') || '';
      let label = null;
      if (id) {
        label = document.querySelector(`label[for="${id.replace(/"/g, '\\"')}"]`);
      }
      if (!label) {
        label = input.closest('label');
      }

      const probeNodes = [
        label,
        label?.querySelector('[data-testid*="swatch"]'),
        label?.querySelector('[class*="swatch"]'),
        label?.querySelector('[style]'),
        input.parentElement,
        input,
      ];

      for (const node of probeNodes) {
        const hex = inspectNodeForHex(node);
        if (hex) {
          return hex;
        }
      }
      return '';
    };

    const absolute = (input) => {
      if (!input) return '';
      try {
        return new URL(input, location.origin).toString();
      } catch {
        return '';
      }
    };
    const title =
      document.querySelector('[data-testid="product-title"]')?.textContent?.trim()
      || document.querySelector('h1')?.textContent?.trim()
      || '';

    const breadcrumb = Array.from(
      document.querySelectorAll('nav[aria-label="breadcrumb"] a'),
    ).map((item) => item.textContent?.trim() || '').filter(Boolean);

    const priceBlock =
      document.querySelector('[data-testid="pdp-title-price-wrapper"]')?.textContent
      || '';

    const colorValue =
      document.querySelector('[data-testid="pdp-color-value"]')?.textContent?.trim()
      || '';

    const colorOptions = Array.from(
      document.querySelectorAll('[data-testid="pdp-color-swatch-instock"], [data-testid="pdp-color-swatch-outofstock"]'),
    ).map((input) => ({
      label: input.getAttribute('aria-label') || '',
      checked: input.checked,
      disabled: input.disabled,
      hex: findSwatchHex(input),
    }));

    const sizes = Array.from(
      document.querySelectorAll('[data-testid="pdp-dimension-instock"], [data-testid="pdp-dimension-outofstock"]'),
    ).map((input) => {
      const id = input.id || '';
      const parts = id.split('_');
      const sizeLabel = parts.length > 0 ? parts[parts.length - 1] : '';
      return {
        label: sizeLabel,
        inStock: !input.disabled && input.getAttribute('data-testid') === 'pdp-dimension-instock',
      };
    }).filter((item) => item.label);

    const isLikelyProductImage = (link) => {
      const value = String(link || '').toLowerCase();
      if (!value) {
        return false;
      }
      if (value.includes('appsflyer.com') || value.includes('doubleclick.net') || value.includes('/pixel')) {
        return false;
      }
      if (value.includes('/webcontent/')) {
        return true;
      }
      return /\\.(jpg|jpeg|png|webp)(\\?|$)/i.test(value);
    };

    const imageNodes = [
      ...document.querySelectorAll('[data-testid="pdp-photo-brick-image"] img'),
      ...document.querySelectorAll('[data-testid*="pdp"] img'),
      ...document.querySelectorAll('[class*="pdp"] img'),
      ...document.querySelectorAll('[class*="gallery"] img'),
      ...document.querySelectorAll('[class*="thumb"] img'),
      ...document.querySelectorAll('img[alt*="showing"]'),
    ];
    const images = imageNodes
      .map((img) => absolute(img.getAttribute('src') || img.getAttribute('data-src') || img.currentSrc || ''))
      .filter((link) => isLikelyProductImage(link));

    const detailsContainer = document.querySelector('[data-testid="pdp-product-info-container"]');
    const detailsText =
      detailsContainer?.innerText?.trim()
      || detailsContainer?.textContent?.trim()
      || '';

    return {
      title,
      breadcrumb,
      priceBlock,
      colorValue,
      colorOptions,
      sizes,
      images: Array.from(new Set(images)),
      detailsText,
      currentUrl: location.href,
    };
  });

  const pid = extractPidFromUrl(snapshot.currentUrl || productUrl);
  if (!pid) {
    return null;
  }

  const allPrices = parseDollarValues(snapshot.priceBlock);
  const originalPrice = allPrices[0] || 0;
  const salePrice = allPrices[1] || originalPrice;
  const selectedColor = normalizeColorLabel(
    snapshot.colorValue
    || snapshot.colorOptions.find((option) => option.checked)?.label
    || snapshot.colorOptions[0]?.label
    || '',
  );
  const dedupedColors = new Set();
  const colorHexByName = new Map();
  const availableColors = [
    selectedColor,
    ...snapshot.colorOptions
      .map((option) => normalizeColorLabel(option.label))
      .filter(Boolean),
  ];
  for (const color of availableColors) {
    if (!dedupedColors.has(color)) {
      dedupedColors.add(color);
    }
    const sourceOption = snapshot.colorOptions.find((option) => normalizeColorLabel(option.label) === color);
    const normalizedHex = normalizeHexForColorName(sourceOption?.hex || '', color);
    if (normalizedHex && !colorHexByName.has(color)) {
      colorHexByName.set(color, normalizedHex);
    }
    if (dedupedColors.size >= options.maxColorsPerProduct) {
      break;
    }
  }

  const dedupedSizes = new Set();
  for (const size of snapshot.sizes || []) {
    if (!size?.inStock) {
      continue;
    }
    const normalizedSize = normalizeSizeLabel(size.label);
    if (!normalizedSize) {
      continue;
    }
    dedupedSizes.add(normalizedSize);
    if (dedupedSizes.size >= options.maxSizesPerProduct) {
      break;
    }
  }
  if (dedupedSizes.size === 0) {
    for (const size of snapshot.sizes || []) {
      const normalizedSize = normalizeSizeLabel(size?.label);
      if (normalizedSize) {
        dedupedSizes.add(normalizedSize);
        if (dedupedSizes.size >= options.maxSizesPerProduct) {
          break;
        }
      }
    }
  }

  const productName = normalizeSpace(snapshot.title);
  if (!productName) {
    return null;
  }

  const masterCategory = inferMasterCategory(seedCategory, snapshot.breadcrumb, productName);
  const subCategory = inferSubCategory(seedCategory, snapshot.breadcrumb, productName, masterCategory);
  const articleType = inferArticleType(seedCategory, productName, subCategory, masterCategory);
  const usage = inferUsage(seedCategory, snapshot.breadcrumb, productName);
  const gender = seedCategory.gender || normalizeCase(snapshot.breadcrumb[0] || 'Unisex') || 'Unisex';
  const year = new Date().getFullYear();
  const sections = parseGapInfoSections(snapshot.detailsText);

  return {
    id: pid,
    sourceUrl: snapshot.currentUrl || productUrl,
    sourceCategoryUrl: seedCategory.url,
    gender,
    masterCategory,
    subCategory,
    articleType,
    baseColour: selectedColor || 'Unknown',
    colorOptions: Array.from(dedupedColors),
    colorHexOptions: Object.fromEntries(colorHexByName.entries()),
    sizeOptions: Array.from(dedupedSizes),
    season: 'All',
    year,
    usage,
    productDisplayName: productName,
    basePrice: originalPrice,
    salePrice,
    breadcrumb: snapshot.breadcrumb,
    sizes: snapshot.sizes,
    images: snapshot.images,
    detailsText: normalizeSpace(snapshot.detailsText),
    productDetails: sections.productDetails,
    sizeFitDetails: sections.sizeFitDetails,
    fabricDetails: sections.fabricDetails,
    careDetails: sections.careDetails,
  };
}

function buildStylesRows(products) {
  return products.map((item) => ({
    id: item.id,
    gender: item.gender,
    masterCategory: item.masterCategory,
    subCategory: item.subCategory,
    articleType: item.articleType,
    baseColour: item.baseColour,
    colorOptions: (item.colorOptions || []).join('|'),
    colorHexOptions: Object.entries(item.colorHexOptions || {})
      .map(([colorName, hex]) => `${colorName}=${hex}`)
      .join('|'),
    sizeOptions: (item.sizeOptions || []).join('|'),
    season: item.season,
    year: item.year,
    usage: item.usage,
    productDisplayName: item.productDisplayName,
    productDetails: item.productDetails || '',
    sizeFitDetails: item.sizeFitDetails || '',
    fabricDetails: item.fabricDetails || '',
    careDetails: item.careDetails || '',
  }));
}

function buildImagesRows(products) {
  return products.flatMap((item) => {
    const uniqueImages = Array.from(
      new Set((item.images || []).map((link) => normalizeSpace(link)).filter(Boolean)),
    ).slice(0, MAX_IMAGES_PER_PRODUCT);
    return uniqueImages.map((link, idx) => ({
      id: item.id,
      filename: `${item.id}.jpg`,
      sortOrder: idx,
      link,
    }));
  });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help === 'true' || args.h === 'true') {
    process.stdout.write(HELP_TEXT);
    return;
  }

  const options = {
    categoriesPath: path.resolve(args.categories || DEFAULTS.categoriesPath),
    outputDir: path.resolve(args['output-dir'] || DEFAULTS.outputDir),
    targetCount: parseNumber(args['target-count'], DEFAULTS.targetCount),
    maxColorsPerProduct: Math.max(1, Math.min(4, parseNumber(args['max-colors'], DEFAULTS.maxColorsPerProduct))),
    maxSizesPerProduct: Math.max(1, Math.min(6, parseNumber(args['max-sizes'], DEFAULTS.maxSizesPerProduct))),
    maxPerCategory: parseNumber(args['max-per-category'], DEFAULTS.maxPerCategory),
    delayMs: parseNumber(args['delay-ms'], DEFAULTS.delayMs),
    timeoutMs: parseNumber(args['timeout-ms'], DEFAULTS.timeoutMs),
    headless: parseBoolean(args.headless, DEFAULTS.headless),
    maxStableRounds: DEFAULTS.maxStableRounds,
  };

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    process.stderr.write(
      'Missing dependency: playwright\n'
      + 'Install with: npm install --save-dev playwright\n'
      + 'Then install browser: npx playwright install chromium\n',
    );
    process.exitCode = 1;
    return;
  }

  const categories = await readCategoryConfig(options.categoriesPath);
  await ensureDir(options.outputDir);

  const browser = await chromium.launch({ headless: options.headless });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GapCrawlerStudentProject/1.0',
  });
  const page = await context.newPage();

  try {
    const allProductLinks = [];
    for (let i = 0; i < categories.length; i += 1) {
      const category = categories[i];
      const needed = Math.max(0, options.targetCount - allProductLinks.length);
      if (needed <= 0) break;

      const perCategoryLimit = Math.min(options.maxPerCategory, needed);
      process.stdout.write(
        `[${i + 1}/${categories.length}] Collect links: ${category.url} (limit=${perCategoryLimit})\n`,
      );

      const links = await collectProductLinksFromCategory(page, category, {
        ...options,
        maxPerCategory: perCategoryLimit,
      });

      for (const link of links) {
        if (allProductLinks.length >= options.targetCount) break;
        allProductLinks.push({ url: link, seedCategory: category });
      }
      process.stdout.write(`  -> links collected: ${links.length}, total queued: ${allProductLinks.length}\n`);
    }

    const dedupedByPid = new Map();
    for (const item of allProductLinks) {
      const pid = extractPidFromUrl(item.url);
      if (!pid || dedupedByPid.has(pid)) continue;
      dedupedByPid.set(pid, item);
      if (dedupedByPid.size >= options.targetCount) break;
    }
    const queue = Array.from(dedupedByPid.values()).slice(0, options.targetCount);

    process.stdout.write(`Queued unique products: ${queue.length}\n`);

    const products = [];
    for (let i = 0; i < queue.length; i += 1) {
      const item = queue[i];
      process.stdout.write(`Scraping ${i + 1}/${queue.length}: ${item.url}\n`);
      try {
        const product = await scrapeProductPage(page, item.url, item.seedCategory, options);
        if (!product) {
          process.stdout.write('  -> skipped (missing key fields)\n');
          continue;
        }
        products.push(product);
      } catch (error) {
        process.stdout.write(`  -> failed: ${error instanceof Error ? error.message : String(error)}\n`);
      }
    }

    const stylesRows = buildStylesRows(products);
    const imagesRows = buildImagesRows(products);
    const stylesCsv = serializeCsv(
      [
        'id',
        'gender',
        'masterCategory',
        'subCategory',
        'articleType',
        'baseColour',
        'colorOptions',
        'colorHexOptions',
        'sizeOptions',
        'season',
        'year',
        'usage',
        'productDisplayName',
        'productDetails',
        'sizeFitDetails',
        'fabricDetails',
        'careDetails',
      ],
      stylesRows,
    );
    const imagesCsv = serializeCsv(
      ['id', 'filename', 'sortOrder', 'link'],
      imagesRows,
    );

    const stylesPath = path.join(options.outputDir, 'styles.csv');
    const imagesPath = path.join(options.outputDir, 'images.csv');
    const rawPath = path.join(options.outputDir, 'products.raw.json');

    await fs.writeFile(stylesPath, stylesCsv, 'utf8');
    await fs.writeFile(imagesPath, imagesCsv, 'utf8');
    await fs.writeFile(rawPath, JSON.stringify(products, null, 2), 'utf8');

    process.stdout.write('\nDone.\n');
    process.stdout.write(`  styles.csv rows: ${stylesRows.length}\n`);
    process.stdout.write(`  images.csv rows: ${imagesRows.length}\n`);
    process.stdout.write(`  output dir: ${options.outputDir}\n`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
