import { chromium } from 'playwright';

let browserInstance = null;

export async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
      executablePath: '/opt/pw-browsers/chromium' in [] ? undefined : undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserInstance;
}

export async function getPage() {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'hu-HU',
    geolocation: { latitude: 47.4979, longitude: 19.0402 },
    permissions: ['geolocation']
  });
  return context.newPage();
}

export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

export async function takeScreenshot(page, path) {
  await page.screenshot({ path, fullPage: true, type: 'png' });
}

export async function getPageMetrics(page) {
  const timing = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0];
    return perf ? {
      dns: perf.domainLookupEnd - perf.domainLookupStart,
      connect: perf.connectEnd - perf.connectStart,
      ttfb: perf.responseStart - perf.requestStart,
      domLoad: perf.domContentLoadedEventEnd - perf.navigationStart,
      fullLoad: perf.loadEventEnd - perf.navigationStart
    } : null;
  });
  return timing;
}
