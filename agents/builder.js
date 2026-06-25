import { loadJSON, saveJSON, updateLead, logAction, loadConfig, slugify, getLeadsByStage } from '../lib/state.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const config = loadConfig();

function generateColorPalette(category) {
  const palettes = {
    restaurant: { primary: '#D4451A', secondary: '#2C1810', accent: '#F5A623', bg: '#FFF8F0' },
    dentist: { primary: '#0077B6', secondary: '#1B4965', accent: '#00B4D8', bg: '#F0F8FF' },
    'hair salon': { primary: '#8B5CF6', secondary: '#4C1D95', accent: '#DDD6FE', bg: '#FAF5FF' },
    'auto repair': { primary: '#DC2626', secondary: '#1F2937', accent: '#F59E0B', bg: '#F9FAFB' },
    plumber: { primary: '#2563EB', secondary: '#1E3A5F', accent: '#60A5FA', bg: '#EFF6FF' },
    electrician: { primary: '#F59E0B', secondary: '#1F2937', accent: '#FBBF24', bg: '#FFFBEB' },
    bakery: { primary: '#92400E', secondary: '#451A03', accent: '#FCD34D', bg: '#FFF7ED' },
    gym: { primary: '#111827', secondary: '#374151', accent: '#EF4444', bg: '#F3F4F6' },
    'yoga studio': { primary: '#059669', secondary: '#065F46', accent: '#A7F3D0', bg: '#ECFDF5' },
    'law firm': { primary: '#1E3A5F', secondary: '#0F172A', accent: '#C9A84C', bg: '#F8FAFC' },
    accountant: { primary: '#1E40AF', secondary: '#1E3A8A', accent: '#3B82F6', bg: '#EFF6FF' },
    'beauty salon': { primary: '#DB2777', secondary: '#831843', accent: '#F9A8D4', bg: '#FDF2F8' },
    spa: { primary: '#0D9488', secondary: '#134E4A', accent: '#99F6E4', bg: '#F0FDFA' },
    'tattoo studio': { primary: '#111827', secondary: '#000000', accent: '#EF4444', bg: '#1F2937' },
    photographer: { primary: '#1F2937', secondary: '#111827', accent: '#F59E0B', bg: '#FFFFFF' },
    default: { primary: '#2563EB', secondary: '#1E3A5F', accent: '#3B82F6', bg: '#F8FAFC' }
  };

  return palettes[category] || palettes.default;
}

function generateHTML(lead, diagnosis) {
  const colors = generateColorPalette(lead.category);
  const pkg = diagnosis?.recommendation || {};

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${lead.name} - ${lead.category} in ${lead.city}, Hungary. Professional services with excellent reviews.">
  <title>${lead.name} | ${lead.category} - ${lead.city}</title>
  <style>
    :root {
      --primary: ${colors.primary};
      --secondary: ${colors.secondary};
      --accent: ${colors.accent};
      --bg: ${colors.bg};
      --white: #FFFFFF;
      --gray-50: #F9FAFB;
      --gray-100: #F3F4F6;
      --gray-200: #E5E7EB;
      --gray-600: #4B5563;
      --gray-800: #1F2937;
      --gray-900: #111827;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: var(--gray-800);
      line-height: 1.6;
    }

    .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

    /* NAVIGATION */
    nav {
      background: var(--white);
      padding: 16px 0;
      position: fixed;
      width: 100%;
      top: 0;
      z-index: 100;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    nav .container {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo {
      font-size: 24px;
      font-weight: 800;
      color: var(--primary);
      text-decoration: none;
    }

    .nav-links {
      display: flex;
      gap: 32px;
      list-style: none;
    }

    .nav-links a {
      text-decoration: none;
      color: var(--gray-600);
      font-weight: 500;
      transition: color 0.2s;
    }

    .nav-links a:hover { color: var(--primary); }

    .nav-cta {
      background: var(--primary);
      color: var(--white) !important;
      padding: 10px 24px;
      border-radius: 8px;
      font-weight: 600;
    }

    .nav-cta:hover { opacity: 0.9; }

    .mobile-menu { display: none; cursor: pointer; font-size: 24px; }

    /* HERO */
    .hero {
      background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%);
      padding: 160px 0 100px;
      color: var(--white);
      text-align: center;
    }

    .hero h1 {
      font-size: 48px;
      font-weight: 800;
      margin-bottom: 20px;
      line-height: 1.2;
    }

    .hero p {
      font-size: 20px;
      opacity: 0.9;
      max-width: 600px;
      margin: 0 auto 32px;
    }

    .hero-cta {
      display: inline-block;
      background: var(--accent);
      color: var(--secondary);
      padding: 16px 40px;
      border-radius: 12px;
      font-size: 18px;
      font-weight: 700;
      text-decoration: none;
      transition: transform 0.2s;
    }

    .hero-cta:hover { transform: translateY(-2px); }

    .hero-stats {
      display: flex;
      justify-content: center;
      gap: 48px;
      margin-top: 48px;
    }

    .stat { text-align: center; }
    .stat-number { font-size: 36px; font-weight: 800; }
    .stat-label { font-size: 14px; opacity: 0.8; }

    /* SERVICES */
    .services {
      padding: 100px 0;
      background: var(--bg);
    }

    .section-title {
      text-align: center;
      margin-bottom: 60px;
    }

    .section-title h2 {
      font-size: 36px;
      font-weight: 800;
      color: var(--gray-900);
      margin-bottom: 12px;
    }

    .section-title p {
      font-size: 18px;
      color: var(--gray-600);
      max-width: 600px;
      margin: 0 auto;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
    }

    .service-card {
      background: var(--white);
      padding: 40px 32px;
      border-radius: 16px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .service-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.1);
    }

    .service-icon {
      font-size: 48px;
      margin-bottom: 20px;
    }

    .service-card h3 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 12px;
      color: var(--gray-900);
    }

    .service-card p {
      color: var(--gray-600);
      font-size: 15px;
    }

    /* ABOUT */
    .about {
      padding: 100px 0;
    }

    .about-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 64px;
      align-items: center;
    }

    .about-content h2 {
      font-size: 36px;
      font-weight: 800;
      margin-bottom: 20px;
      color: var(--gray-900);
    }

    .about-content p {
      color: var(--gray-600);
      margin-bottom: 16px;
      font-size: 16px;
    }

    .about-image {
      background: linear-gradient(135deg, var(--primary), var(--accent));
      border-radius: 20px;
      height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--white);
      font-size: 64px;
    }

    /* TESTIMONIALS */
    .testimonials {
      padding: 100px 0;
      background: var(--gray-50);
    }

    .testimonials-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
    }

    .testimonial-card {
      background: var(--white);
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .stars { color: #F59E0B; font-size: 20px; margin-bottom: 16px; }

    .testimonial-card p {
      color: var(--gray-600);
      font-style: italic;
      margin-bottom: 16px;
      font-size: 15px;
    }

    .testimonial-author {
      font-weight: 700;
      color: var(--gray-900);
    }

    /* CONTACT */
    .contact {
      padding: 100px 0;
    }

    .contact-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 64px;
    }

    .contact-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--gray-800);
    }

    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid var(--gray-200);
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.2s;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: var(--primary);
    }

    .submit-btn {
      background: var(--primary);
      color: var(--white);
      padding: 16px 32px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .submit-btn:hover { opacity: 0.9; }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .contact-item {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .contact-icon {
      font-size: 24px;
      width: 48px;
      height: 48px;
      background: var(--bg);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .contact-item h4 {
      font-weight: 700;
      margin-bottom: 4px;
    }

    .contact-item p {
      color: var(--gray-600);
      font-size: 15px;
    }

    .map-embed {
      margin-top: 32px;
      border-radius: 16px;
      overflow: hidden;
      height: 250px;
      background: var(--gray-100);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--gray-600);
    }

    /* FOOTER */
    footer {
      background: var(--gray-900);
      color: var(--white);
      padding: 48px 0 24px;
    }

    .footer-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 48px;
      margin-bottom: 32px;
    }

    .footer-brand .logo { color: var(--white); }

    .footer-brand p {
      color: #9CA3AF;
      margin-top: 12px;
      font-size: 15px;
    }

    .footer-links h4 {
      margin-bottom: 16px;
      font-size: 16px;
    }

    .footer-links ul {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .footer-links a {
      color: #9CA3AF;
      text-decoration: none;
      font-size: 15px;
      transition: color 0.2s;
    }

    .footer-links a:hover { color: var(--white); }

    .footer-bottom {
      border-top: 1px solid #374151;
      padding-top: 24px;
      text-align: center;
      color: #6B7280;
      font-size: 14px;
    }

    /* MOBILE RESPONSIVE */
    @media (max-width: 768px) {
      .nav-links { display: none; }
      .mobile-menu { display: block; }

      .hero h1 { font-size: 32px; }
      .hero p { font-size: 16px; }
      .hero-stats { flex-direction: column; gap: 24px; }

      .services-grid,
      .testimonials-grid { grid-template-columns: 1fr; }

      .about-grid,
      .contact-grid { grid-template-columns: 1fr; gap: 32px; }

      .footer-grid { grid-template-columns: 1fr; gap: 32px; }
    }
  </style>
</head>
<body>
  <!-- NAVIGATION -->
  <nav>
    <div class="container">
      <a href="#" class="logo">${lead.name}</a>
      <ul class="nav-links">
        <li><a href="#services">Szolgáltatások</a></li>
        <li><a href="#about">Rólunk</a></li>
        <li><a href="#testimonials">Vélemények</a></li>
        <li><a href="#contact" class="nav-cta">Kapcsolat</a></li>
      </ul>
      <div class="mobile-menu">&#9776;</div>
    </div>
  </nav>

  <!-- HERO -->
  <section class="hero">
    <div class="container">
      <h1>Üdvözöljük a ${lead.name} oldalán</h1>
      <p>Megbízható ${lead.category} szolgáltatások ${lead.city} szívében. Tapasztalt csapatunk várja Önt!</p>
      <a href="#contact" class="hero-cta">Kérjen időpontot &rarr;</a>
      <div class="hero-stats">
        <div class="stat">
          <div class="stat-number">${lead.rating || '4.5'}</div>
          <div class="stat-label">Google értékelés</div>
        </div>
        <div class="stat">
          <div class="stat-number">${lead.reviews || '50'}+</div>
          <div class="stat-label">Elégedett ügyfél</div>
        </div>
        <div class="stat">
          <div class="stat-number">10+</div>
          <div class="stat-label">Év tapasztalat</div>
        </div>
      </div>
    </div>
  </section>

  <!-- SERVICES -->
  <section class="services" id="services">
    <div class="container">
      <div class="section-title">
        <h2>Szolgáltatásaink</h2>
        <p>Széles körű ${lead.category} szolgáltatásokkal állunk rendelkezésére</p>
      </div>
      <div class="services-grid">
        <div class="service-card">
          <div class="service-icon">&#9733;</div>
          <h3>Prémium szolgáltatás</h3>
          <p>Kiváló minőségű szolgáltatás, személyre szabott megoldásokkal.</p>
        </div>
        <div class="service-card">
          <div class="service-icon">&#9201;</div>
          <h3>Gyors kiszolgálás</h3>
          <p>Időben és hatékonyan végezzük el a munkát, az Ön kényelméért.</p>
        </div>
        <div class="service-card">
          <div class="service-icon">&#10003;</div>
          <h3>Garancia</h3>
          <p>Munkánkra garanciát vállalunk, mert bízunk a minőségben.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ABOUT -->
  <section class="about" id="about">
    <div class="container">
      <div class="about-grid">
        <div class="about-content">
          <h2>Rólunk</h2>
          <p>${lead.name} - ${lead.city} egyik legmegbízhatóbb ${lead.category} szolgáltatója. Évek óta dolgozunk azért, hogy ügyfeleink maximálisan elégedettek legyenek.</p>
          <p>Csapatunk elkötelezett a minőség és a professzionális kiszolgálás iránt. Legyen szó bármilyen igényről, mi megtaláljuk a legjobb megoldást.</p>
          <p>Büszkék vagyunk ${lead.reviews || 'számos'} elégedett ügyfelünkre és ${lead.rating || 'kiváló'} Google értékelésünkre.</p>
        </div>
        <div class="about-image">&#127970;</div>
      </div>
    </div>
  </section>

  <!-- TESTIMONIALS -->
  <section class="testimonials" id="testimonials">
    <div class="container">
      <div class="section-title">
        <h2>Ügyfeleink mondták</h2>
        <p>Ismerje meg elégedett ügyfeleink véleményét</p>
      </div>
      <div class="testimonials-grid">
        <div class="testimonial-card">
          <div class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          <p>"Kiváló szolgáltatás, nagyon profik és kedvesek. Csak ajánlani tudom mindenkinek!"</p>
          <div class="testimonial-author">- Anna K.</div>
        </div>
        <div class="testimonial-card">
          <div class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          <p>"Gyors, precíz munka, fair árak. Visszatérő ügyfél vagyok, mindig megbízható."</p>
          <div class="testimonial-author">- Péter M.</div>
        </div>
        <div class="testimonial-card">
          <div class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          <p>"Végre találtam egy megbízható ${lead.category} szolgáltatót ${lead.city}-ban. Köszönöm!"</p>
          <div class="testimonial-author">- Eszter B.</div>
        </div>
      </div>
    </div>
  </section>

  <!-- CONTACT -->
  <section class="contact" id="contact">
    <div class="container">
      <div class="section-title">
        <h2>Kapcsolat</h2>
        <p>Vegye fel velünk a kapcsolatot, szívesen segítünk!</p>
      </div>
      <div class="contact-grid">
        <form class="contact-form" onsubmit="event.preventDefault(); alert('Köszönjük! Hamarosan felvesszük Önnel a kapcsolatot.');">
          <div class="form-group">
            <label>Név</label>
            <input type="text" placeholder="Az Ön neve" required>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" placeholder="pelda@email.com" required>
          </div>
          <div class="form-group">
            <label>Telefon</label>
            <input type="tel" placeholder="+36 XX XXX XXXX">
          </div>
          <div class="form-group">
            <label>Üzenet</label>
            <textarea rows="4" placeholder="Miben segíthetünk?"></textarea>
          </div>
          <button type="submit" class="submit-btn">Üzenet küldése</button>
        </form>
        <div>
          <div class="contact-info">
            <div class="contact-item">
              <div class="contact-icon">&#128205;</div>
              <div>
                <h4>Cím</h4>
                <p>${lead.address || lead.city + ', Hungary'}</p>
              </div>
            </div>
            ${lead.phone ? `<div class="contact-item">
              <div class="contact-icon">&#128222;</div>
              <div>
                <h4>Telefon</h4>
                <p>${lead.phone}</p>
              </div>
            </div>` : ''}
            ${lead.email ? `<div class="contact-item">
              <div class="contact-icon">&#9993;</div>
              <div>
                <h4>Email</h4>
                <p>${lead.email}</p>
              </div>
            </div>` : ''}
            <div class="contact-item">
              <div class="contact-icon">&#128336;</div>
              <div>
                <h4>Nyitvatartás</h4>
                <p>Hétfő - Péntek: 9:00 - 18:00<br>Szombat: 9:00 - 14:00</p>
              </div>
            </div>
          </div>
          <div class="map-embed">
            &#128506; Google Maps - ${lead.address || lead.city}
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer>
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="#" class="logo">${lead.name}</a>
          <p>Megbízható ${lead.category} szolgáltatások ${lead.city}-ban. Évek tapasztalatával és elkötelezettségével állunk rendelkezésére.</p>
        </div>
        <div class="footer-links">
          <h4>Navigáció</h4>
          <ul>
            <li><a href="#services">Szolgáltatások</a></li>
            <li><a href="#about">Rólunk</a></li>
            <li><a href="#testimonials">Vélemények</a></li>
            <li><a href="#contact">Kapcsolat</a></li>
          </ul>
        </div>
        <div class="footer-links">
          <h4>Elérhetőség</h4>
          <ul>
            <li><a href="#">${lead.address || lead.city}</a></li>
            ${lead.phone ? `<li><a href="tel:${lead.phone}">${lead.phone}</a></li>` : ''}
            ${lead.email ? `<li><a href="mailto:${lead.email}">${lead.email}</a></li>` : ''}
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        &copy; ${new Date().getFullYear()} ${lead.name}. Minden jog fenntartva.
      </div>
    </div>
  </footer>

  <script>
    document.querySelector('.mobile-menu')?.addEventListener('click', () => {
      const nav = document.querySelector('.nav-links');
      nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
      nav.style.flexDirection = 'column';
      nav.style.position = 'absolute';
      nav.style.top = '100%';
      nav.style.left = '0';
      nav.style.right = '0';
      nav.style.background = 'white';
      nav.style.padding = '20px';
      nav.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    });
  </script>
</body>
</html>`;
}

function generateReactComponent(lead) {
  const colors = generateColorPalette(lead.category);

  return `import React, { useState } from 'react';

const theme = {
  primary: '${colors.primary}',
  secondary: '${colors.secondary}',
  accent: '${colors.accent}',
  bg: '${colors.bg}'
};

export default function ${lead.name.replace(/[^a-zA-Z]/g, '')}Website() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Köszönjük! Hamarosan felvesszük Önnel a kapcsolatot.');
  };

  return (
    <div className="min-h-screen font-sans">
      {/* Navigation */}
      <nav className="fixed w-full bg-white shadow-sm z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <a href="#" className="text-2xl font-bold" style={{ color: theme.primary }}>
            ${lead.name}
          </a>
          <div className="hidden md:flex gap-8 items-center">
            <a href="#services" className="text-gray-600 hover:text-gray-900">Szolgáltatások</a>
            <a href="#about" className="text-gray-600 hover:text-gray-900">Rólunk</a>
            <a href="#testimonials" className="text-gray-600 hover:text-gray-900">Vélemények</a>
            <a href="#contact" className="px-6 py-2 rounded-lg text-white font-semibold"
               style={{ background: theme.primary }}>Kapcsolat</a>
          </div>
          <button className="md:hidden text-2xl" onClick={() => setMenuOpen(!menuOpen)}>&#9776;</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 text-center text-white"
        style={{ background: \`linear-gradient(135deg, \${theme.secondary}, \${theme.primary})\` }}>
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-5xl font-extrabold mb-6">Üdvözöljük a ${lead.name} oldalán</h1>
          <p className="text-xl opacity-90 mb-8">
            Megbízható ${lead.category} szolgáltatások ${lead.city} szívében.
          </p>
          <a href="#contact" className="inline-block px-10 py-4 rounded-xl text-lg font-bold"
             style={{ background: theme.accent, color: theme.secondary }}>
            Kérjen időpontot &rarr;
          </a>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-24" style={{ background: theme.bg }}>
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-extrabold text-center mb-4">Szolgáltatásaink</h2>
          <p className="text-gray-600 text-center mb-16 text-lg">
            Széles körű szolgáltatásokkal állunk rendelkezésére
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {['Prémium szolgáltatás', 'Gyors kiszolgálás', 'Garancia'].map((title, i) => (
              <div key={i} className="bg-white p-10 rounded-2xl shadow-sm hover:shadow-lg transition text-center">
                <div className="text-5xl mb-5">{['\\u2733', '\\u23F1', '\\u2713'][i]}</div>
                <h3 className="text-xl font-bold mb-3">{title}</h3>
                <p className="text-gray-600">Kiváló minőségű, személyre szabott megoldások.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-extrabold text-center mb-16">Kapcsolat</h2>
          <div className="grid md:grid-cols-2 gap-16">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block font-semibold mb-2">Név</label>
                <input type="text" className="w-full p-3 border-2 rounded-lg" required
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block font-semibold mb-2">Email</label>
                <input type="email" className="w-full p-3 border-2 rounded-lg" required
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block font-semibold mb-2">Üzenet</label>
                <textarea rows={4} className="w-full p-3 border-2 rounded-lg"
                  value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-4 rounded-lg text-white font-bold text-lg"
                style={{ background: theme.primary }}>Üzenet küldése</button>
            </form>
            <div className="space-y-6">
              <div className="flex gap-4">
                <span className="text-2xl">&#128205;</span>
                <div>
                  <h4 className="font-bold">Cím</h4>
                  <p className="text-gray-600">${lead.address || lead.city + ', Hungary'}</p>
                </div>
              </div>
              ${lead.phone ? `<div className="flex gap-4">
                <span className="text-2xl">&#128222;</span>
                <div>
                  <h4 className="font-bold">Telefon</h4>
                  <p className="text-gray-600">${lead.phone}</p>
                </div>
              </div>` : ''}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 text-center">
        <p className="text-gray-400">&copy; ${new Date().getFullYear()} ${lead.name}. Minden jog fenntartva.</p>
      </footer>
    </div>
  );
}
`;
}

export async function buildForLead(lead) {
  const slug = slugify(lead.name);
  const projectDir = `projects/${slug}`;

  if (existsSync(projectDir)) {
    console.log(`[Builder] Project already exists for ${lead.name}, skipping`);
    return false;
  }

  console.log(`[Builder] Building website for: ${lead.name}`);
  logAction('builder', 'build_start', { name: lead.name, city: lead.city });

  mkdirSync(projectDir, { recursive: true });
  mkdirSync(`${projectDir}/react`, { recursive: true });

  const diagnosisPath = `database/diagnosis/${slug}.json`;
  const diagnosis = existsSync(diagnosisPath) ? loadJSON(diagnosisPath) : null;

  const html = generateHTML(lead, diagnosis);
  writeFileSync(`${projectDir}/index.html`, html, 'utf-8');

  const reactCode = generateReactComponent(lead);
  writeFileSync(`${projectDir}/react/App.jsx`, reactCode, 'utf-8');

  const metadata = {
    business_name: lead.name,
    city: lead.city,
    category: lead.category,
    generated_at: new Date().toISOString(),
    files: ['index.html', 'react/App.jsx'],
    colors: generateColorPalette(lead.category),
    recommended_package: diagnosis?.recommendation?.package || 'Standard'
  };

  saveJSON(`${projectDir}/metadata.json`, metadata);

  updateLead(lead.name, lead.city, { stage: 'built', project_dir: projectDir });

  logAction('builder', 'build_complete', { name: lead.name, project_dir: projectDir });
  console.log(`[Builder] ${lead.name} website generated at ${projectDir}/`);
  return true;
}

export async function runBuilder() {
  console.log('[Builder] Starting website generation...');
  logAction('builder', 'run_start');

  const config = loadConfig();
  const leads = getLeadsByStage('diagnosed').filter(l => (l.score || 0) >= config.goals.min_build_score);

  console.log(`[Builder] ${leads.length} high-score leads to build for`);

  let built = 0;

  for (const lead of leads) {
    try {
      const result = await buildForLead(lead);
      if (result) built++;
    } catch (err) {
      logAction('builder', 'build_error', { name: lead.name, error: err.message });
      console.error(`[Builder] Error building for ${lead.name}: ${err.message}`);
    }
  }

  console.log(`[Builder] Complete. Built ${built} websites.`);
  logAction('builder', 'run_complete', { built, total: leads.length });
}

if (process.argv[1]?.endsWith('builder.js')) {
  runBuilder().catch(console.error);
}
