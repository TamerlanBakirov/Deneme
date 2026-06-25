import { loadJSON, saveJSON, updateLead, logAction, loadConfig, slugify, getLeadsByStage } from '../lib/state.js';
import { getBrowser, closeBrowser, getPageMetrics } from '../lib/browser.js';
import { existsSync, mkdirSync } from 'fs';

const config = loadConfig();

async function analyzeWebsite(page, url) {
  const analysis = {
    has_website: false,
    mobile_responsive: false,
    loading_speed: 'unknown',
    loading_time_ms: 0,
    has_ssl: false,
    has_meta_description: false,
    has_title: '',
    has_h1: false,
    has_favicon: false,
    has_contact_form: false,
    has_cta: false,
    has_social_links: false,
    has_google_maps: false,
    has_testimonials: false,
    has_images: 0,
    has_analytics: false,
    design_era: 'unknown',
    issues: [],
    strengths: []
  };

  if (!url || url === '') {
    analysis.issues.push('No website exists');
    return analysis;
  }

  try {
    analysis.has_website = true;
    analysis.has_ssl = url.startsWith('https');
    if (!analysis.has_ssl) analysis.issues.push('No SSL certificate (HTTP only)');

    const start = Date.now();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    analysis.loading_time_ms = Date.now() - start;

    if (analysis.loading_time_ms > 5000) {
      analysis.loading_speed = 'slow';
      analysis.issues.push(`Slow loading: ${(analysis.loading_time_ms / 1000).toFixed(1)}s`);
    } else if (analysis.loading_time_ms > 3000) {
      analysis.loading_speed = 'moderate';
      analysis.issues.push(`Moderate loading: ${(analysis.loading_time_ms / 1000).toFixed(1)}s`);
    } else {
      analysis.loading_speed = 'fast';
      analysis.strengths.push('Fast loading speed');
    }

    const metrics = await getPageMetrics(page);
    if (metrics) analysis.performance_metrics = metrics;

    const seoData = await page.evaluate(() => {
      const title = document.title || '';
      const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
      const h1 = document.querySelector('h1')?.textContent?.trim() || '';
      const h1Count = document.querySelectorAll('h1').length;
      const imgWithoutAlt = document.querySelectorAll('img:not([alt]), img[alt=""]').length;
      const totalImages = document.querySelectorAll('img').length;
      const canonicalLink = document.querySelector('link[rel="canonical"]')?.href || '';
      const ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';

      return { title, metaDesc, h1, h1Count, imgWithoutAlt, totalImages, canonicalLink, ogTitle };
    });

    analysis.has_title = seoData.title;
    analysis.has_meta_description = seoData.metaDesc !== '';
    analysis.has_h1 = seoData.h1 !== '';
    analysis.has_images = seoData.totalImages;

    if (!seoData.title) analysis.issues.push('Missing page title');
    if (!seoData.metaDesc) analysis.issues.push('Missing meta description');
    if (!seoData.h1) analysis.issues.push('Missing H1 heading');
    if (seoData.h1Count > 1) analysis.issues.push('Multiple H1 headings');
    if (seoData.imgWithoutAlt > 0) analysis.issues.push(`${seoData.imgWithoutAlt} images without alt text`);
    if (!seoData.ogTitle) analysis.issues.push('Missing Open Graph tags');
    if (seoData.title) analysis.strengths.push('Has page title');
    if (seoData.metaDesc) analysis.strengths.push('Has meta description');

    const viewport = await page.evaluate(() => {
      const vpMeta = document.querySelector('meta[name="viewport"]');
      return vpMeta ? vpMeta.content : '';
    });

    if (viewport.includes('width=device-width')) {
      analysis.mobile_responsive = true;
      analysis.strengths.push('Has viewport meta tag');
    } else {
      analysis.issues.push('Not mobile responsive (missing viewport meta)');
    }

    const pageFeatures = await page.evaluate(() => {
      const body = document.body.innerHTML.toLowerCase();
      const text = document.body.innerText.toLowerCase();

      return {
        has_contact_form: document.querySelectorAll('form').length > 0,
        has_cta: !!(
          document.querySelector('[class*="cta"], [class*="button"], .btn, a.button') ||
          text.match(/kapcsolat|contact|book|foglal|rendel|ajánlat|offer|quote/i)
        ),
        has_social_links: !!(
          body.includes('facebook.com') || body.includes('instagram.com') ||
          body.includes('twitter.com') || body.includes('linkedin.com') ||
          body.includes('tiktok.com')
        ),
        has_google_maps: !!(body.includes('maps.google') || body.includes('google.com/maps') || body.includes('maps.googleapis')),
        has_testimonials: !!(text.includes('vélemény') || text.includes('review') || text.includes('testimonial') || text.includes('ügyfél')),
        has_analytics: !!(body.includes('google-analytics') || body.includes('gtag') || body.includes('analytics')),
        has_favicon: !!document.querySelector('link[rel*="icon"]'),
        uses_tables: document.querySelectorAll('table').length > 2,
        uses_flash: body.includes('flash') || body.includes('.swf'),
        uses_frames: document.querySelectorAll('frame, frameset, iframe:not([src*="google"]):not([src*="youtube"])').length > 0,
        font_count: new Set([...document.querySelectorAll('*')].map(el => getComputedStyle(el).fontFamily)).size,
        color_scheme: getComputedStyle(document.body).backgroundColor
      };
    });

    Object.assign(analysis, pageFeatures);

    if (!pageFeatures.has_contact_form) analysis.issues.push('No contact form');
    if (!pageFeatures.has_cta) analysis.issues.push('Weak or missing call-to-action');
    if (!pageFeatures.has_social_links) analysis.issues.push('No social media links');
    if (!pageFeatures.has_google_maps) analysis.issues.push('No Google Maps integration');
    if (!pageFeatures.has_analytics) analysis.issues.push('No analytics tracking');
    if (!pageFeatures.has_favicon) analysis.issues.push('Missing favicon');
    if (pageFeatures.uses_tables) analysis.issues.push('Outdated table-based layout');
    if (pageFeatures.uses_flash) analysis.issues.push('Uses Flash (obsolete)');
    if (pageFeatures.uses_frames) analysis.issues.push('Uses frames (outdated)');

    if (pageFeatures.has_contact_form) analysis.strengths.push('Has contact form');
    if (pageFeatures.has_social_links) analysis.strengths.push('Has social media presence');
    if (pageFeatures.has_google_maps) analysis.strengths.push('Google Maps integration');
    if (pageFeatures.has_testimonials) analysis.strengths.push('Has testimonials/reviews');

    if (pageFeatures.uses_tables || pageFeatures.uses_flash || pageFeatures.uses_frames) {
      analysis.design_era = 'outdated (pre-2010)';
    } else if (!analysis.mobile_responsive) {
      analysis.design_era = 'dated (2010-2015)';
    } else {
      analysis.design_era = 'modern';
    }

  } catch (err) {
    analysis.issues.push(`Website error: ${err.message}`);
  }

  return analysis;
}

function generateAuditReport(lead, analysis) {
  const issueCount = analysis.issues.length;
  const conversionIncrease = Math.min(issueCount * 8, 85);

  const packageRecommendation = lead.score >= 80 ? 'Premium' :
    lead.score >= 60 ? 'Standard' : 'Basic';

  const pkg = config.pricing.packages.find(p => p.name === packageRecommendation);

  return {
    business_name: lead.name,
    city: lead.city,
    category: lead.category,
    generated_at: new Date().toISOString(),
    current_state: {
      has_website: analysis.has_website,
      website_url: lead.website || 'None',
      design_era: analysis.design_era,
      loading_speed: analysis.loading_speed,
      loading_time_ms: analysis.loading_time_ms,
      mobile_responsive: analysis.mobile_responsive,
      ssl_secured: analysis.has_ssl
    },
    seo_audit: {
      title: analysis.has_title || 'Missing',
      meta_description: analysis.has_meta_description,
      h1_present: analysis.has_h1,
      images_count: analysis.has_images,
      analytics_present: analysis.has_analytics
    },
    issues: analysis.issues,
    strengths: analysis.strengths,
    score_breakdown: {
      total_issues: issueCount,
      critical_issues: analysis.issues.filter(i =>
        i.includes('No website') || i.includes('Not mobile') || i.includes('No SSL')
      ).length,
      estimated_conversion_increase: `${conversionIncrease}%`
    },
    recommendation: {
      package: packageRecommendation,
      price: pkg.price,
      currency: config.pricing.currency,
      features: pkg.features,
      delivery_days: pkg.delivery_days,
      roi_estimate: `With a modern website, ${lead.name} could see up to ${conversionIncrease}% more customer inquiries.`
    },
    outreach_message: generateOutreachMessage(lead, analysis, conversionIncrease, packageRecommendation)
  };
}

function generateOutreachMessage(lead, analysis, conversionIncrease, packageName) {
  const pkg = config.pricing.packages.find(p => p.name === packageName);
  const noWebsite = !analysis.has_website;

  const painPoint = noWebsite
    ? `I noticed that ${lead.name} doesn't have a website yet. In today's digital world, that means potential customers searching for "${lead.category}" in ${lead.city} might not find you.`
    : `I visited your website and noticed a few areas where it could work harder for your business — ${analysis.issues.slice(0, 3).join(', ').toLowerCase()}.`;

  return {
    subject_hu: `Weboldal ajánlat - ${lead.name}`,
    subject_en: `Website proposal for ${lead.name}`,
    greeting: `Kedves ${lead.name} csapata,`,
    opening: painPoint,
    value_proposition: `I specialize in creating modern, mobile-friendly websites for ${lead.category} businesses in Hungary. My clients typically see a ${conversionIncrease}% increase in online inquiries after launching their new site.`,
    offer: `I've prepared a custom preview of what your new website could look like. I'd love to show it to you — no obligation, just a quick look.`,
    package_mention: `My ${packageName} package (€${pkg.price}) includes: ${pkg.features.slice(0, 4).join(', ')}.`,
    cta: `Would you be open to a quick 15-minute call this week? You can pick a time that works for you here: ${config.agency.calendly_link}`,
    closing: `Üdvözlettel,\nAI Web Agency`,
    full_text_en: '',
    full_text_hu: ''
  };
}

export async function diagnoseLead(lead) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log(`[Diagnoser] Analyzing: ${lead.name} (${lead.city})`);
  logAction('diagnoser', 'analyze_start', { name: lead.name, city: lead.city });

  const analysis = await analyzeWebsite(page, lead.website);
  const report = generateAuditReport(lead, analysis);

  const slug = slugify(lead.name);
  const diagnosisDir = `database/diagnosis`;
  if (!existsSync(diagnosisDir)) mkdirSync(diagnosisDir, { recursive: true });

  saveJSON(`${diagnosisDir}/${slug}.json`, report);

  updateLead(lead.name, lead.city, {
    stage: 'diagnosed',
    website_issues: analysis.issues,
    diagnosis_score: 100 - analysis.issues.length * 5,
    recommended_package: report.recommendation.package
  });

  await context.close();

  logAction('diagnoser', 'analyze_complete', {
    name: lead.name,
    issues: analysis.issues.length,
    package: report.recommendation.package
  });

  console.log(`[Diagnoser] ${lead.name}: ${analysis.issues.length} issues found, recommending ${report.recommendation.package} package`);
  return report;
}

export async function runDiagnoser() {
  console.log('[Diagnoser] Starting website analysis...');
  logAction('diagnoser', 'run_start');

  const leads = getLeadsByStage('scouted');
  console.log(`[Diagnoser] ${leads.length} leads to analyze`);

  let processed = 0;

  for (const lead of leads) {
    try {
      await diagnoseLead(lead);
      processed++;
    } catch (err) {
      logAction('diagnoser', 'analyze_error', { name: lead.name, error: err.message });
      console.error(`[Diagnoser] Error analyzing ${lead.name}: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
  }

  await closeBrowser();
  console.log(`[Diagnoser] Complete. Analyzed ${processed}/${leads.length} leads.`);
  logAction('diagnoser', 'run_complete', { processed, total: leads.length });
}

if (process.argv[1]?.endsWith('diagnoser.js')) {
  runDiagnoser().catch(console.error);
}
