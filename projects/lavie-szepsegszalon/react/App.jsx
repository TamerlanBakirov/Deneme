import React, { useState } from 'react';

const theme = {
  primary: '#DB2777',
  secondary: '#831843',
  accent: '#F9A8D4',
  bg: '#FDF2F8'
};

export default function LaVieSzpsgszalonWebsite() {
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
            LaVie Szépségszalon
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
        style={{ background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})` }}>
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-5xl font-extrabold mb-6">Üdvözöljük a LaVie Szépségszalon oldalán</h1>
          <p className="text-xl opacity-90 mb-8">
            Megbízható beauty salon szolgáltatások Budapest szívében.
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
                <div className="text-5xl mb-5">{['\u2733', '\u23F1', '\u2713'][i]}</div>
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
                  <p className="text-gray-600">Budapest, Október 6. u. 19</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-2xl">&#128222;</span>
                <div>
                  <h4 className="font-bold">Telefon</h4>
                  <p className="text-gray-600">+36 20 345 6780</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 text-center">
        <p className="text-gray-400">&copy; 2026 LaVie Szépségszalon. Minden jog fenntartva.</p>
      </footer>
    </div>
  );
}
