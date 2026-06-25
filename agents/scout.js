import { appendLead, logAction, loadConfig, slugify } from '../lib/state.js';
import { getBrowser, closeBrowser, takeScreenshot } from '../lib/browser.js';
import { existsSync, mkdirSync } from 'fs';

const config = loadConfig();
const CHAINS = config.target.exclude_chains.map(c => c.toLowerCase());

function isChain(name) {
  const lower = name.toLowerCase();
  return CHAINS.some(chain => lower.includes(chain));
}

function scoreLead(data) {
  let score = 50;

  if (!data.website || data.website === '') score += 25;
  else if (data.website_issues?.length > 3) score += 15;
  else if (data.website_issues?.length > 0) score += 5;

  if (data.rating >= 4.0) score += 10;
  else if (data.rating >= 3.0) score += 5;
  else if (data.rating < 3.0) score -= 10;

  if (data.reviews >= 50) score += 5;
  else if (data.reviews >= 20) score += 3;

  if (!data.email && !data.phone) score -= 20;

  if (data.has_social_media) score += 5;

  score = Math.max(0, Math.min(100, score));
  return score;
}

async function searchGoogleMaps(page, city, category) {
  const query = `${category} in ${city}, Hungary`;
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

  console.log(`[Scout] Searching: ${query}`);
  logAction('scout', 'search_start', { city, category, query });

  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForTimeout(2000);

    const consentButton = await page.$('button[aria-label*="Accept"], button:has-text("Accept all"), button:has-text("Elfogadom"), form[action*="consent"] button');
    if (consentButton) {
      await consentButton.click();
      await page.waitForTimeout(1000);
    }

    await autoScrollResults(page);

    const results = await page.evaluate(() => {
      const items = document.querySelectorAll('[data-result-index], .Nv2PK');
      const businesses = [];

      items.forEach(item => {
        const nameEl = item.querySelector('.qBF1Pd, .fontHeadlineSmall');
        const ratingEl = item.querySelector('.MW4etd, .ZkP5Je');
        const reviewsEl = item.querySelector('.UY7F9, .e4rVHe');
        const categoryEl = item.querySelector('.W4Efsd .W4Efsd span:first-child, .fontBodyMedium > span');
        const addressEl = item.querySelector('.W4Efsd:last-child .W4Efsd span:last-child');
        const websiteEl = item.querySelector('a[data-value="Website"], a[aria-label*="Website"]');
        const phoneEl = item.querySelector('[data-tooltip*="phone"], .UsdlK');

        if (nameEl) {
          const reviewText = reviewsEl?.textContent || '0';
          const reviewCount = parseInt(reviewText.replace(/[^0-9]/g, '')) || 0;

          businesses.push({
            name: nameEl.textContent.trim(),
            rating: parseFloat(ratingEl?.textContent) || 0,
            reviews: reviewCount,
            category: categoryEl?.textContent?.trim() || '',
            address: addressEl?.textContent?.trim() || '',
            website: websiteEl?.getAttribute('href') || '',
            phone: phoneEl?.textContent?.trim() || ''
          });
        }
      });

      return businesses;
    });

    return results;
  } catch (err) {
    logAction('scout', 'search_error', { city, category, error: err.message });
    console.error(`[Scout] Error searching ${query}: ${err.message}`);
    return [];
  }
}

async function autoScrollResults(page) {
  const scrollable = await page.$('[role="feed"], .m6QErb[aria-label]');
  if (!scrollable) return;

  for (let i = 0; i < 5; i++) {
    await scrollable.evaluate(el => el.scrollTop = el.scrollHeight);
    await page.waitForTimeout(1500);
  }
}

async function extractDetailedInfo(page, business) {
  try {
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(business.name + ' ' + business.city + ' Hungary')}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);

    const details = await page.evaluate(() => {
      const website = document.querySelector('a[data-item-id="authority"]')?.href || '';
      const phone = document.querySelector('[data-item-id*="phone"] .fontBodyMedium')?.textContent?.trim() || '';
      const address = document.querySelector('[data-item-id="address"] .fontBodyMedium')?.textContent?.trim() || '';

      const socialLinks = [];
      document.querySelectorAll('a[href*="facebook.com"], a[href*="instagram.com"], a[href*="twitter.com"], a[href*="linkedin.com"]').forEach(a => {
        socialLinks.push(a.href);
      });

      return { website, phone, address, social_links: socialLinks };
    });

    return details;
  } catch {
    return {};
  }
}

async function screenshotWebsite(page, url, businessSlug) {
  if (!url || url === '') return null;

  try {
    const dir = `database/screenshots`;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    const path = `${dir}/${businessSlug}.png`;
    await takeScreenshot(page, path);
    return path;
  } catch {
    return null;
  }
}

async function findEmail(page, website) {
  if (!website) return '';

  try {
    await page.goto(website, { waitUntil: 'networkidle', timeout: 15000 });

    let email = await page.evaluate(() => {
      const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
      if (mailtoLinks.length > 0) {
        return mailtoLinks[0].href.replace('mailto:', '').split('?')[0];
      }

      const text = document.body.innerText;
      const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      return emailMatch ? emailMatch[0] : '';
    });

    if (!email) {
      const contactLinks = await page.$$('a[href*="contact"], a[href*="kapcsolat"], a[href*="kontakt"], a[href*="elerheto"]');
      if (contactLinks.length > 0) {
        await contactLinks[0].click();
        await page.waitForTimeout(2000);

        email = await page.evaluate(() => {
          const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
          if (mailtoLinks.length > 0) return mailtoLinks[0].href.replace('mailto:', '').split('?')[0];
          const text = document.body.innerText;
          const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          return emailMatch ? emailMatch[0] : '';
        });
      }
    }

    return email || '';
  } catch {
    return '';
  }
}

export async function scoutCity(city, categories = null) {
  const cats = categories || config.target.categories;
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    locale: 'hu-HU'
  });
  const page = await context.newPage();

  let totalFound = 0;

  for (const category of cats) {
    const results = await searchGoogleMaps(page, city, category);

    for (const biz of results) {
      if (isChain(biz.name)) {
        logAction('scout', 'skip_chain', { name: biz.name, city });
        continue;
      }

      const slug = slugify(biz.name);
      const email = await findEmail(page, biz.website);
      const screenshot = await screenshotWebsite(page, biz.website, slug);

      const lead = {
        id: `${slug}-${slugify(city)}`,
        name: biz.name,
        city,
        country: 'Hungary',
        category: category,
        address: biz.address || '',
        website: biz.website || '',
        email: email,
        phone: biz.phone || '',
        rating: biz.rating,
        reviews: biz.reviews,
        screenshot: screenshot,
        social_links: biz.social_links || [],
        has_social_media: (biz.social_links || []).length > 0,
        website_issues: [],
        stage: 'scouted',
        score: 0,
        retries: 0
      };

      lead.score = scoreLead(lead);

      const added = appendLead(lead);
      if (added) {
        totalFound++;
        logAction('scout', 'lead_added', {
          name: lead.name,
          city,
          score: lead.score,
          has_website: !!lead.website
        });
        console.log(`[Scout] +${lead.name} (Score: ${lead.score}, ${lead.website ? 'Has website' : 'No website'})`);
      }
    }

    await page.waitForTimeout(2000 + Math.random() * 3000);
  }

  await context.close();

  logAction('scout', 'city_complete', { city, total_found: totalFound });
  console.log(`[Scout] ${city} complete. Found ${totalFound} new leads.`);
  return totalFound;
}

export async function runScout() {
  console.log('[Scout] Starting lead generation...');
  logAction('scout', 'run_start', { cities: config.target.cities.map(c => c.name) });

  let totalLeads = 0;

  for (const city of config.target.cities) {
    const found = await scoutCity(city.name);
    totalLeads += found;
  }

  await closeBrowser();
  console.log(`[Scout] Complete. Total new leads: ${totalLeads}`);
  logAction('scout', 'run_complete', { total_leads: totalLeads });
  return totalLeads;
}

if (process.argv[1]?.endsWith('scout.js')) {
  runScout().catch(console.error);
}
