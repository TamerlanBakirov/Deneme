import { loadJSON, saveJSON, updateLead, logAction, loadConfig, slugify, getLeadsByStage } from '../lib/state.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const config = loadConfig();

const CATEGORY_DATA = {
  restaurant: {
    heroTitle: (name) => `${name}`,
    heroSub: (city) => `Autentikus ízek, felejthetetlen élmények ${city} szívében`,
    heroCta: 'Asztalfoglalás',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
    accentGrad: 'linear-gradient(135deg, #e94560, #f5a623)',
    accent: '#e94560',
    accentLight: 'rgba(233,69,96,0.1)',
    icon: '🍽️',
    pattern: 'radial-gradient(circle at 20% 80%, rgba(233,69,96,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245,166,35,0.1) 0%, transparent 50%)',
    services: [
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`, title: 'Friss alapanyagok', desc: 'Minden nap friss, helyi alapanyagokból készítjük ételeinket a legjobb minőségben.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/></svg>`, title: 'Változatos menü', desc: 'Hagyományos magyar és nemzetközi ételek széles választéka minden ízlésnek.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/></svg>`, title: 'Hangulatos terem', desc: 'Elegáns belső tér, amely tökéletes helyszín üzleti ebédekhez és családi vacsorákhoz.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3m0 14v3m-7-10H2m20 0h-3m-1.8-6.2l2.1-2.1M4.9 19.1l2.1-2.1m0-10L4.9 4.9M19.1 19.1l-2.1-2.1"/></svg>`, title: 'Rendezvények', desc: 'Születésnap, céges vacsora vagy esküvő - bármilyen alkalomra tökéletes helyszín.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M18.36 9l.6 3H5.04l.6-3h12.72M20 4H4v2h16V4zm0 18H4v-8h16v8z"/></svg>`, title: 'Házhozszállítás', desc: 'Rendeljen kényelmesen otthonról! Gyors házhozszállítás egész városban.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 6c1.11 0 2-.9 2-2 0-.38-.1-.73-.29-1.03L12 0l-1.71 2.97c-.19.3-.29.65-.29 1.03 0 1.1.9 2 2 2zm4.6 9.99l-1.07-1.07-1.08 1.07c-1.3 1.3-3.58 1.31-4.89 0l-1.07-1.07-1.09 1.07C6.75 16.64 5.88 17 4.96 17c-.73 0-1.4-.23-1.96-.61V21h18v-4.61c-.56.38-1.23.61-1.96.61-.92 0-1.79-.36-2.44-1.01zM18 9h-5V7h-2v2H6c-1.1 0-2 .9-2 2v1.46l2 2 2-2 2 2 2-2 2 2 2-2V11c0-1.1-.9-2-2-2z"/></svg>`, title: 'Napi menü', desc: 'Minden hétköznap friss napi menü kedvező áron, levesválasztékkal.' }
    ],
    stats: [
      { num: '4.8', label: 'Google értékelés', suffix: '★' },
      { num: '2000', label: 'Elégedett vendég', suffix: '+' },
      { num: '15', label: 'Év tapasztalat', suffix: '+' }
    ],
    testimonials: [
      { text: 'Fantasztikus ételek és csodálatos hangulat! A gulyás egyszerűen tökéletes volt.', author: 'Szabó Anna', role: 'Törzsvendég' },
      { text: 'A legjobb étterem a környéken. Kedves kiszolgálás és gyönyörű belső tér.', author: 'Nagy Péter', role: 'Gasztro blogger' },
      { text: 'Minden családi ünnepet itt tartunk. Soha nem csalódtunk!', author: 'Kiss Katalin', role: 'Rendszeres vendég' }
    ]
  },
  dentist: {
    heroTitle: (name) => `${name}`,
    heroSub: (city) => `Modern fogászati ellátás, fájdalommentes kezelések ${city}-ban`,
    heroCta: 'Időpontfoglalás',
    gradient: 'linear-gradient(135deg, #0c2340 0%, #0d4f8b 50%, #0077b6 100%)',
    accentGrad: 'linear-gradient(135deg, #00b4d8, #48cae4)',
    accent: '#00b4d8',
    accentLight: 'rgba(0,180,216,0.1)',
    icon: '🦷',
    pattern: 'radial-gradient(circle at 30% 70%, rgba(0,180,216,0.12) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(72,202,228,0.08) 0%, transparent 50%)',
    services: [
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/><path d="M10 21h4"/></svg>`, title: 'Általános fogászat', desc: 'Szűrővizsgálat, fogkő-eltávolítás, tömés és megelőző kezelések.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 3l1.45 3.55L17 8l-3.55 1.45L12 13l-1.45-3.55L7 8l3.55-1.45L12 3z"/></svg>`, title: 'Fogfehérítés', desc: 'Professzionális fogfehérítés látványos eredménnyel, akár egyetlen alkalom alatt.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>`, title: 'Implantáció', desc: 'Tartós megoldás hiányzó fogak pótlására, természetes megjelenéssel.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M7 11H1v2h6v-2zm2.17-3.24L7.05 5.64 5.64 7.05l2.12 2.12 1.41-1.41zM13 1h-2v6h2V1zm5.36 6.05l-1.41-1.41-2.12 2.12 1.41 1.41 2.12-2.12zM17 11v2h6v-2h-6zm-5-2c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm2.83 7.24l2.12 2.12 1.41-1.41-2.12-2.12-1.41 1.41zm-9.19.71l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM11 23h2v-6h-2v6z"/></svg>`, title: 'Esztétikai fogászat', desc: 'Héjak, koronák és mosoly-tervezés a tökéletes megjelenésért.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M17.73 12.02l3.98-3.98a.996.996 0 0 0 0-1.41l-4.34-4.34a.996.996 0 0 0-1.41 0l-3.98 3.98L8 2.29C7.8 2.1 7.55 2 7.29 2c-.13 0-.26.02-.39.07L2.93 3.79C2.4 4.02 2.08 4.56 2.17 5.14l1.07 6.83c.09.55.44 1.03.93 1.29l3.98 2.15-1.89 3.49c-.29.53-.09 1.2.44 1.49l3.98 2.15c.53.29 1.2.09 1.49-.44l1.89-3.49 2.07 1.11 4.53 1.7c.17.06.35.09.53.09.26 0 .51-.1.71-.29l2.83-2.83c.29-.29.39-.72.26-1.1l-1.7-4.53z"/></svg>`, title: 'Gyermekfogászat', desc: 'Gyengéd, barátságos kezelések a legkisebb páciensek számára.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`, title: 'Fogszabályozás', desc: 'Láthatatlan és hagyományos fogszabályozók felnőtteknek és gyerekeknek.' }
    ],
    stats: [
      { num: '4.9', label: 'Páciens értékelés', suffix: '★' },
      { num: '5000', label: 'Sikeres kezelés', suffix: '+' },
      { num: '20', label: 'Év tapasztalat', suffix: '+' }
    ],
    testimonials: [
      { text: 'Végre találtam egy fogorvost, akitől nem félek! Profi, fájdalommentes kezelés.', author: 'Tóth Mária', role: 'Páciens' },
      { text: 'A fogfehérítés eredménye lenyűgöző volt. Végre magabiztosan mosolygok!', author: 'Kovács László', role: 'Páciens' },
      { text: 'A gyerekeink is szeretnek ide járni. Nagyon kedves és türelmes csapat.', author: 'Horváth Éva', role: 'Szülő' }
    ]
  },
  'hair salon': {
    heroTitle: (name) => `${name}`,
    heroSub: (city) => `Stílus és elegancia - prémium fodrászat ${city}-ban`,
    heroCta: 'Foglaljon időpontot',
    gradient: 'linear-gradient(135deg, #2d1b4e 0%, #4c1d95 50%, #7c3aed 100%)',
    accentGrad: 'linear-gradient(135deg, #c084fc, #e879f9)',
    accent: '#a855f7',
    accentLight: 'rgba(168,85,247,0.1)',
    icon: '✂️',
    pattern: 'radial-gradient(circle at 25% 75%, rgba(168,85,247,0.12) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(232,121,249,0.08) 0%, transparent 50%)',
    services: [
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M6 2v6l4 4-4 4v6"/><path d="M18 2v6l-4 4 4 4v6"/></svg>`, title: 'Hajvágás & Styling', desc: 'Személyre szabott hajvágás és formázás a legújabb trendek szerint.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 3a9 9 0 1 0 9 9c0-4.97-4.03-9-9-9zm0 16a7 7 0 1 1 0-14 7 7 0 0 1 0 14z"/><path d="M12 8v4l3 3"/></svg>`, title: 'Festés & Melírozás', desc: 'Professzionális hajfestés prémium termékekkel, ragyogó eredménnyel.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`, title: 'Keratinos kezelés', desc: 'Sima, fényes, egészséges haj keratinos hajegyenesítő kezeléssel.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`, title: 'Menyasszonyi frizura', desc: 'Álomszép esküvői frizurák, próbaalkalom és helyszíni készítés.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/></svg>`, title: 'Szakállvágás', desc: 'Precíz szakálligazítás és formázás a tökéletes megjelenésért.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`, title: 'Hajápolás', desc: 'Professzionális hajápoló kezelések a gyönyörű, egészséges hajért.' }
    ],
    stats: [
      { num: '4.9', label: 'Ügyfél értékelés', suffix: '★' },
      { num: '3000', label: 'Elégedett ügyfél', suffix: '+' },
      { num: '12', label: 'Év tapasztalat', suffix: '+' }
    ],
    testimonials: [
      { text: 'Mindig pontosan olyan lesz a frizurám, amilyet elképzeltem. Csodálatos csapat!', author: 'Varga Zsófia', role: 'Törzsvendég' },
      { text: 'A festés színe hónapok után is gyönyörű. Csak ide járok!', author: 'Molnár Andrea', role: 'Törzsvendég' },
      { text: 'Az esküvői frizurám tökéletes volt! Mindenki dicsérte.', author: 'Balogh Réka', role: 'Menyasszony' }
    ]
  },
  'auto repair': {
    heroTitle: (name) => `${name}`,
    heroSub: (city) => `Megbízható autójavítás és szerviz ${city}-ban`,
    heroCta: 'Kérjen árajánlatot',
    gradient: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #374151 100%)',
    accentGrad: 'linear-gradient(135deg, #ef4444, #f59e0b)',
    accent: '#ef4444',
    accentLight: 'rgba(239,68,68,0.1)',
    icon: '🔧',
    pattern: 'radial-gradient(circle at 20% 80%, rgba(239,68,68,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245,158,11,0.08) 0%, transparent 50%)',
    services: [
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>`, title: 'Általános szerviz', desc: 'Teljes körű szerviz és karbantartás minden autómárkához.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`, title: 'Karosszéria javítás', desc: 'Horpadás javítás, fényezés és karosszéria munkák szakszerűen.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 2c1.93 0 3.5 1.57 3.5 3.5S13.93 12 12 12s-3.5-1.57-3.5-3.5S10.07 5 12 5z"/></svg>`, title: 'Diagnosztika', desc: 'Korszerű komputer-diagnosztika a pontos hibafelismeréshez.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`, title: 'Fékrendszer', desc: 'Fékbetét csere, féktárcsa javítás, teljes fékrendszer felülvizsgálat.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`, title: 'Olajcsere', desc: 'Gyors olajcsere és szűrőcsere minden típusú járműhöz.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/></svg>`, title: 'Műszaki vizsga', desc: 'Teljes műszaki vizsgára való felkészítés és lebonyolítás.' }
    ],
    stats: [
      { num: '4.7', label: 'Ügyfél értékelés', suffix: '★' },
      { num: '8000', label: 'Javított autó', suffix: '+' },
      { num: '18', label: 'Év tapasztalat', suffix: '+' }
    ],
    testimonials: [
      { text: 'Gyors, megbízható szerviz, fair árakkal. Mindig ide hozom az autómat.', author: 'Takács Gábor', role: 'Törzsügyfél' },
      { text: 'Precíz diagnosztika, őszinte tanácsadás. Nem akarnak felesleges munkát eladni.', author: 'Farkas Zoltán', role: 'Ügyfél' },
      { text: 'A karosszéria javítás után olyan volt az autóm, mint új! Profi munka.', author: 'Németh István', role: 'Ügyfél' }
    ]
  },
  bakery: {
    heroTitle: (name) => `${name}`,
    heroSub: (city) => `Frissen sült kenyér és pékáruk, hagyományos receptek ${city}-ban`,
    heroCta: 'Termékeink',
    gradient: 'linear-gradient(135deg, #451a03 0%, #78350f 50%, #92400e 100%)',
    accentGrad: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    accent: '#d97706',
    accentLight: 'rgba(217,119,6,0.1)',
    icon: '🥐',
    pattern: 'radial-gradient(circle at 20% 80%, rgba(217,119,6,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(251,191,36,0.08) 0%, transparent 50%)',
    services: [
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>`, title: 'Friss kenyerek', desc: 'Házi kovászos kenyér, rozskenyér, ciabatta - naponta frissen sütve.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`, title: 'Torták & Sütemények', desc: 'Egyedi torták, rétes, kürtőskalács és finom sütemények minden alkalomra.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M18.36 9l.6 3H5.04l.6-3h12.72M20 4H4v2h16V4zm0 18H4v-8h16v8z"/></svg>`, title: 'Péksütemények', desc: 'Croissant, briós, pogácsa és más péksütemények frissen.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 6c1.11 0 2-.9 2-2 0-.38-.1-.73-.29-1.03L12 0l-1.71 2.97c-.19.3-.29.65-.29 1.03 0 1.1.9 2 2 2z"/><path d="M5 22h14V10H5v12z"/></svg>`, title: 'Rendelésre készítés', desc: 'Egyedi rendelésre készített torták és sütemények esküvőre, születésnapra.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`, title: 'Gluténmentes', desc: 'Gluténmentes és laktózmentes termékek étel-érzékenyek számára.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1z"/></svg>`, title: 'Kávézó', desc: 'Kellemes kávézó sarok frissen főzött kávéval és péksüteményekkel.' }
    ],
    stats: [
      { num: '4.8', label: 'Ügyfél értékelés', suffix: '★' },
      { num: '500', label: 'Napi vásárló', suffix: '+' },
      { num: '25', label: 'Év hagyomány', suffix: '+' }
    ],
    testimonials: [
      { text: 'A legjobb kovászos kenyér a városban! Nem veszek máshol kenyeret.', author: 'Horváth Judit', role: 'Törzsvendég' },
      { text: 'Az esküvői tortánk gyönyörű és isteni finom volt. Köszönjük!', author: 'Szabó Bence', role: 'Ügyfél' },
      { text: 'Reggeli nélkül nem indulhat a nap a friss croissantjuk nélkül!', author: 'Kiss Dóra', role: 'Rendszeres vásárló' }
    ]
  },
  'beauty salon': {
    heroTitle: (name) => `${name}`,
    heroSub: (city) => `Szépség és wellness - professzionális szépségápolás ${city}-ban`,
    heroCta: 'Foglaljon időpontot',
    gradient: 'linear-gradient(135deg, #4a044e 0%, #831843 50%, #be185d 100%)',
    accentGrad: 'linear-gradient(135deg, #f472b6, #fb7185)',
    accent: '#ec4899',
    accentLight: 'rgba(236,72,153,0.1)',
    icon: '💆',
    pattern: 'radial-gradient(circle at 25% 75%, rgba(236,72,153,0.12) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(244,114,182,0.08) 0%, transparent 50%)',
    services: [
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`, title: 'Arc kezelések', desc: 'Tisztító, hidratáló és anti-aging arc kezelések prémium termékekkel.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`, title: 'Manikűr & Pedikűr', desc: 'Klasszikus és géllakk manikűr, pedikűr a gyönyörű körmökért.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 3a9 9 0 1 0 9 9c0-4.97-4.03-9-9-9z"/></svg>`, title: 'Szőrtelenítés', desc: 'Gyanta és lézeres szőrtelenítés tartós eredménnyel.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`, title: 'Smink', desc: 'Alkalmi és esküvői smink professzionális sminkesektől.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M17.73 12.02l3.98-3.98a.996.996 0 0 0 0-1.41l-4.34-4.34a.996.996 0 0 0-1.41 0l-3.98 3.98"/></svg>`, title: 'Masszázs', desc: 'Relaxáló, sport és gyógymasszázs a testi-lelki felfrissülésért.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M7 11H1v2h6v-2zm2.17-3.24L7.05 5.64 5.64 7.05l2.12 2.12 1.41-1.41z"/></svg>`, title: 'Szemöldök formázás', desc: 'Szemöldök formázás, festés és laminálás a tökéletes ívért.' }
    ],
    stats: [
      { num: '4.9', label: 'Ügyfél értékelés', suffix: '★' },
      { num: '4000', label: 'Elégedett ügyfél', suffix: '+' },
      { num: '10', label: 'Év tapasztalat', suffix: '+' }
    ],
    testimonials: [
      { text: 'Minden alkalommal kipihentem magam! Csodálatos szépségszalon.', author: 'Papp Viktória', role: 'Törzsvendég' },
      { text: 'A géllakk hetekig tartott, és a kiszolgálás mindig kedves.', author: 'Szűcs Anita', role: 'Rendszeres ügyfél' },
      { text: 'Az esküvői sminkem tökéletes volt egész nap! Köszönöm!', author: 'Balogh Nóra', role: 'Menyasszony' }
    ]
  }
};

function getDefaultData() {
  return {
    heroTitle: (name) => `${name}`,
    heroSub: (city) => `Professzionális szolgáltatások ${city}-ban`,
    heroCta: 'Kapcsolat',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)',
    accentGrad: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    accent: '#2563eb',
    accentLight: 'rgba(37,99,235,0.1)',
    icon: '⭐',
    pattern: 'radial-gradient(circle at 20% 80%, rgba(37,99,235,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(96,165,250,0.08) 0%, transparent 50%)',
    services: [
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`, title: 'Prémium minőség', desc: 'Kiváló minőségű szolgáltatás, személyre szabott megoldásokkal.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`, title: 'Gyors kiszolgálás', desc: 'Időben és hatékonyan végezzük el a munkát.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`, title: 'Garanciával', desc: 'Munkánkra garanciát vállalunk.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1z"/></svg>`, title: 'Kedvező árak', desc: 'Versenyképes árak, kiváló ár-érték arány.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M13 7h-2v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>`, title: 'Rugalmas időpontok', desc: 'Hétköznap és hétvégén is rendelkezésre állunk.' },
      { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>`, title: 'Szakértelem', desc: 'Tapasztalt csapatunk professzionális megoldásokat nyújt.' }
    ],
    stats: [
      { num: '4.8', label: 'Értékelés', suffix: '★' },
      { num: '1000', label: 'Elégedett ügyfél', suffix: '+' },
      { num: '10', label: 'Év tapasztalat', suffix: '+' }
    ],
    testimonials: [
      { text: 'Kiváló szolgáltatás, nagyon profik és kedvesek!', author: 'Szabó Anna', role: 'Ügyfél' },
      { text: 'Gyors, precíz munka, fair árak. Visszatérő ügyfél vagyok.', author: 'Nagy Péter', role: 'Ügyfél' },
      { text: 'Mindig megbízható és pontos. Csak ajánlani tudom!', author: 'Kiss Katalin', role: 'Ügyfél' }
    ]
  };
}

function getCategoryData(category) {
  return CATEGORY_DATA[category] || getDefaultData();
}

function generateHTML(lead, diagnosis) {
  const cat = getCategoryData(lead.category);
  const pkg = diagnosis?.recommendation || {};

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${lead.name} - Professzionális ${lead.category} szolgáltatások ${lead.city}-ban. ${cat.stats[1].num}+ elégedett ügyfél.">
  <meta name="keywords" content="${lead.name}, ${lead.category}, ${lead.city}, ${lead.category} ${lead.city}">
  <meta property="og:title" content="${lead.name} | ${lead.city}">
  <meta property="og:description" content="${cat.heroSub(lead.city)}">
  <meta property="og:type" content="website">
  <title>${lead.name} | ${lead.city}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --accent: ${cat.accent};
      --accent-light: ${cat.accentLight};
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #1f2937;
      line-height: 1.6;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

    /* ═══════ NAVBAR ═══════ */
    .navbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(0,0,0,0.06);
      transition: all 0.3s;
    }
    .navbar.scrolled { box-shadow: 0 4px 30px rgba(0,0,0,0.08); }
    .navbar .container { display: flex; justify-content: space-between; align-items: center; height: 72px; }
    .nav-brand { font-size: 22px; font-weight: 800; color: #111827; text-decoration: none; letter-spacing: -0.5px; }
    .nav-brand span { color: var(--accent); }
    .nav-links { display: flex; align-items: center; gap: 36px; list-style: none; }
    .nav-links a { text-decoration: none; color: #6b7280; font-weight: 500; font-size: 15px; transition: color 0.2s; }
    .nav-links a:hover { color: #111827; }
    .nav-cta-btn {
      background: ${cat.accentGrad}; color: #fff !important;
      padding: 10px 28px; border-radius: 50px; font-weight: 600; font-size: 14px;
      box-shadow: 0 4px 15px ${cat.accentLight};
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .nav-cta-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
    .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 8px; }
    .hamburger span { display: block; width: 24px; height: 2px; background: #374151; margin: 6px 0; transition: all 0.3s; border-radius: 2px; }

    /* ═══════ HERO ═══════ */
    .hero {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: ${cat.gradient};
      position: relative; overflow: hidden; padding: 120px 24px 80px;
    }
    .hero::before {
      content: ''; position: absolute; inset: 0;
      background: ${cat.pattern};
      pointer-events: none;
    }
    .hero::after {
      content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 120px;
      background: linear-gradient(to top, rgba(255,255,255,0.03), transparent);
    }
    .hero-content { position: relative; z-index: 2; text-align: center; max-width: 800px; }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
      padding: 8px 20px; border-radius: 50px; margin-bottom: 32px;
      border: 1px solid rgba(255,255,255,0.15);
    }
    .hero-badge span { color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500; }
    .hero h1 {
      font-size: clamp(40px, 6vw, 72px); font-weight: 900; color: #fff;
      line-height: 1.1; margin-bottom: 24px; letter-spacing: -2px;
    }
    .hero-sub {
      font-size: clamp(17px, 2vw, 21px); color: rgba(255,255,255,0.8);
      max-width: 600px; margin: 0 auto 40px; line-height: 1.7;
    }
    .hero-btns { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
    .btn-primary {
      display: inline-flex; align-items: center; gap: 8px;
      background: ${cat.accentGrad}; color: #fff;
      padding: 16px 36px; border-radius: 50px; font-size: 16px; font-weight: 700;
      text-decoration: none; border: none; cursor: pointer;
      box-shadow: 0 8px 30px rgba(0,0,0,0.2);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
    .btn-secondary {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.1); color: #fff;
      padding: 16px 36px; border-radius: 50px; font-size: 16px; font-weight: 600;
      text-decoration: none; border: 1px solid rgba(255,255,255,0.2);
      backdrop-filter: blur(10px); transition: all 0.2s;
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.2); }
    .hero-stats {
      display: flex; justify-content: center; gap: 48px; margin-top: 64px;
      padding-top: 48px; border-top: 1px solid rgba(255,255,255,0.1);
    }
    .hero-stat { text-align: center; }
    .hero-stat-num { font-size: 36px; font-weight: 900; color: #fff; }
    .hero-stat-label { font-size: 14px; color: rgba(255,255,255,0.6); margin-top: 4px; }

    /* ═══════ SECTIONS ═══════ */
    .section { padding: 100px 0; }
    .section-header { text-align: center; margin-bottom: 64px; }
    .section-label {
      display: inline-block; font-size: 13px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 2px; color: var(--accent); margin-bottom: 16px;
      background: var(--accent-light); padding: 6px 16px; border-radius: 50px;
    }
    .section-title { font-size: clamp(32px, 4vw, 44px); font-weight: 800; color: #111827; line-height: 1.2; letter-spacing: -1px; }
    .section-desc { font-size: 18px; color: #6b7280; max-width: 600px; margin: 16px auto 0; }

    /* ═══════ SERVICES GRID ═══════ */
    .services-section { background: #f9fafb; }
    .services-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
    }
    .service-card {
      background: #fff; padding: 40px 32px; border-radius: 20px;
      border: 1px solid #f3f4f6;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative; overflow: hidden;
    }
    .service-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: ${cat.accentGrad}; opacity: 0; transition: opacity 0.3s;
    }
    .service-card:hover { transform: translateY(-8px); box-shadow: 0 20px 60px rgba(0,0,0,0.08); border-color: transparent; }
    .service-card:hover::before { opacity: 1; }
    .service-icon-wrap {
      width: 64px; height: 64px; border-radius: 16px;
      background: var(--accent-light); display: flex; align-items: center; justify-content: center;
      margin-bottom: 24px; color: var(--accent);
    }
    .service-card h3 { font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #111827; }
    .service-card p { font-size: 15px; color: #6b7280; line-height: 1.7; }

    /* ═══════ STATS BAR ═══════ */
    .stats-bar {
      background: ${cat.gradient}; padding: 60px 0; position: relative; overflow: hidden;
    }
    .stats-bar::before { content: ''; position: absolute; inset: 0; background: ${cat.pattern}; }
    .stats-grid { display: flex; justify-content: center; gap: 80px; position: relative; z-index: 2; }
    .stat-item { text-align: center; }
    .stat-num { font-size: 48px; font-weight: 900; color: #fff; }
    .stat-label { font-size: 15px; color: rgba(255,255,255,0.7); margin-top: 4px; }

    /* ═══════ TESTIMONIALS ═══════ */
    .testimonials-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .testimonial-card {
      background: #fff; padding: 36px; border-radius: 20px;
      border: 1px solid #f3f4f6; transition: all 0.3s;
    }
    .testimonial-card:hover { box-shadow: 0 10px 40px rgba(0,0,0,0.06); }
    .testimonial-stars { color: #f59e0b; font-size: 18px; margin-bottom: 20px; letter-spacing: 2px; }
    .testimonial-text { font-size: 16px; color: #4b5563; line-height: 1.8; font-style: italic; margin-bottom: 24px; }
    .testimonial-author { display: flex; align-items: center; gap: 12px; }
    .testimonial-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: ${cat.accentGrad}; display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: 16px;
    }
    .testimonial-name { font-weight: 700; color: #111827; font-size: 15px; }
    .testimonial-role { font-size: 13px; color: #9ca3af; }

    /* ═══════ CTA SECTION ═══════ */
    .cta-section {
      background: ${cat.gradient}; padding: 100px 0; text-align: center; position: relative; overflow: hidden;
    }
    .cta-section::before { content: ''; position: absolute; inset: 0; background: ${cat.pattern}; }
    .cta-content { position: relative; z-index: 2; }
    .cta-content h2 { font-size: clamp(32px, 4vw, 48px); font-weight: 900; color: #fff; margin-bottom: 20px; letter-spacing: -1px; }
    .cta-content p { font-size: 18px; color: rgba(255,255,255,0.8); max-width: 500px; margin: 0 auto 40px; }

    /* ═══════ CONTACT ═══════ */
    .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: start; }
    .contact-form { display: flex; flex-direction: column; gap: 20px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-field label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #374151; }
    .form-field input, .form-field textarea, .form-field select {
      width: 100%; padding: 14px 18px; border: 2px solid #e5e7eb; border-radius: 12px;
      font-size: 15px; font-family: inherit; transition: all 0.2s; background: #fff;
    }
    .form-field input:focus, .form-field textarea:focus, .form-field select:focus {
      outline: none; border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-light);
    }
    .form-submit {
      background: ${cat.accentGrad}; color: #fff; padding: 16px 32px; border: none;
      border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer;
      font-family: inherit; transition: all 0.2s;
      box-shadow: 0 4px 15px ${cat.accentLight};
    }
    .form-submit:hover { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
    .contact-info-list { display: flex; flex-direction: column; gap: 28px; }
    .contact-info-item { display: flex; gap: 16px; align-items: flex-start; }
    .contact-info-icon {
      width: 52px; height: 52px; min-width: 52px; border-radius: 14px;
      background: var(--accent-light); display: flex; align-items: center; justify-content: center;
      font-size: 22px;
    }
    .contact-info-item h4 { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .contact-info-item p { font-size: 15px; color: #6b7280; }
    .map-container {
      margin-top: 32px; border-radius: 16px; overflow: hidden; height: 220px;
      background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
      display: flex; align-items: center; justify-content: center;
      border: 1px solid #e5e7eb;
    }
    .map-container span { color: #9ca3af; font-size: 15px; }

    /* ═══════ FOOTER ═══════ */
    .footer { background: #111827; color: #fff; padding: 64px 0 32px; }
    .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; margin-bottom: 48px; }
    .footer-brand p { color: #9ca3af; font-size: 15px; margin-top: 16px; line-height: 1.7; }
    .footer-col h4 { font-size: 15px; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; }
    .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 12px; }
    .footer-col a { text-decoration: none; color: #9ca3af; font-size: 15px; transition: color 0.2s; }
    .footer-col a:hover { color: #fff; }
    .footer-bottom { border-top: 1px solid #1f2937; padding-top: 32px; display: flex; justify-content: space-between; align-items: center; }
    .footer-bottom p { color: #6b7280; font-size: 14px; }
    .footer-social { display: flex; gap: 16px; }
    .footer-social a {
      width: 40px; height: 40px; border-radius: 10px; background: #1f2937;
      display: flex; align-items: center; justify-content: center;
      color: #9ca3af; text-decoration: none; font-size: 18px; transition: all 0.2s;
    }
    .footer-social a:hover { background: var(--accent); color: #fff; }

    /* ═══════ ANIMATIONS ═══════ */
    .reveal { opacity: 0; transform: translateY(30px); transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
    .reveal.visible { opacity: 1; transform: translateY(0); }
    .reveal-delay-1 { transition-delay: 0.1s; }
    .reveal-delay-2 { transition-delay: 0.2s; }
    .reveal-delay-3 { transition-delay: 0.3s; }

    /* ═══════ MOBILE ═══════ */
    @media (max-width: 1024px) {
      .services-grid, .testimonials-grid { grid-template-columns: repeat(2, 1fr); }
      .footer-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 768px) {
      .nav-links { display: none; }
      .hamburger { display: block; }
      .nav-links.active {
        display: flex; flex-direction: column; position: absolute;
        top: 72px; left: 0; right: 0; background: #fff;
        padding: 24px; gap: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        border-bottom: 1px solid #f3f4f6;
      }
      .services-grid, .testimonials-grid { grid-template-columns: 1fr; }
      .contact-grid { grid-template-columns: 1fr; gap: 48px; }
      .form-row { grid-template-columns: 1fr; }
      .hero-stats { flex-direction: column; gap: 24px; }
      .stats-grid { flex-direction: column; gap: 32px; }
      .footer-grid { grid-template-columns: 1fr; gap: 32px; }
      .footer-bottom { flex-direction: column; gap: 16px; text-align: center; }
      .hero { min-height: auto; padding: 140px 24px 80px; }
    }
  </style>
</head>
<body>

  <!-- NAVBAR -->
  <nav class="navbar" id="navbar">
    <div class="container">
      <a href="#" class="nav-brand"><span>${lead.name.charAt(0)}</span>${lead.name.slice(1)}</a>
      <ul class="nav-links" id="navLinks">
        <li><a href="#services">Szolgáltatások</a></li>
        <li><a href="#about">Rólunk</a></li>
        <li><a href="#reviews">Vélemények</a></li>
        <li><a href="#contact" class="nav-cta-btn">${cat.heroCta}</a></li>
      </ul>
      <button class="hamburger" id="hamburger" aria-label="Menü">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>

  <!-- HERO -->
  <section class="hero">
    <div class="hero-content">
      <div class="hero-badge">
        <span>${cat.icon} ${lead.city} | ${lead.category}</span>
      </div>
      <h1>${cat.heroTitle(lead.name)}</h1>
      <p class="hero-sub">${cat.heroSub(lead.city)}</p>
      <div class="hero-btns">
        <a href="#contact" class="btn-primary">${cat.heroCta} →</a>
        <a href="#services" class="btn-secondary">Szolgáltatásaink ↓</a>
      </div>
      <div class="hero-stats">
        ${cat.stats.map(s => `
        <div class="hero-stat">
          <div class="hero-stat-num">${s.num}${s.suffix}</div>
          <div class="hero-stat-label">${s.label}</div>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- SERVICES -->
  <section class="section services-section" id="services">
    <div class="container">
      <div class="section-header reveal">
        <span class="section-label">Szolgáltatások</span>
        <h2 class="section-title">Miben segíthetünk?</h2>
        <p class="section-desc">Teljes körű ${lead.category} szolgáltatásaink ${lead.city}-ban</p>
      </div>
      <div class="services-grid">
        ${cat.services.map((s, i) => `
        <div class="service-card reveal reveal-delay-${(i % 3) + 1}">
          <div class="service-icon-wrap">${s.icon}</div>
          <h3>${s.title}</h3>
          <p>${s.desc}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- STATS -->
  <section class="stats-bar">
    <div class="container">
      <div class="stats-grid">
        ${cat.stats.map(s => `
        <div class="stat-item reveal">
          <div class="stat-num">${s.num}${s.suffix}</div>
          <div class="stat-label">${s.label}</div>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- TESTIMONIALS -->
  <section class="section" id="reviews">
    <div class="container">
      <div class="section-header reveal">
        <span class="section-label">Vélemények</span>
        <h2 class="section-title">Ügyfeleink mondták</h2>
        <p class="section-desc">Büszkék vagyunk elégedett ügyfeleinkre</p>
      </div>
      <div class="testimonials-grid">
        ${cat.testimonials.map((t, i) => `
        <div class="testimonial-card reveal reveal-delay-${i + 1}">
          <div class="testimonial-stars">★★★★★</div>
          <p class="testimonial-text">"${t.text}"</p>
          <div class="testimonial-author">
            <div class="testimonial-avatar">${t.author.charAt(0)}</div>
            <div>
              <div class="testimonial-name">${t.author}</div>
              <div class="testimonial-role">${t.role}</div>
            </div>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="cta-section">
    <div class="cta-content reveal">
      <h2>Készen áll a kezdésre?</h2>
      <p>Vegye fel velünk a kapcsolatot még ma, és tapasztalja meg a különbséget!</p>
      <a href="#contact" class="btn-primary">${cat.heroCta} →</a>
    </div>
  </section>

  <!-- CONTACT -->
  <section class="section" id="contact">
    <div class="container">
      <div class="section-header reveal">
        <span class="section-label">Kapcsolat</span>
        <h2 class="section-title">Írjon nekünk</h2>
        <p class="section-desc">Szívesen válaszolunk kérdéseire</p>
      </div>
      <div class="contact-grid">
        <form class="contact-form reveal" onsubmit="event.preventDefault(); this.querySelector('.form-submit').textContent='✓ Elküldve!'; this.querySelector('.form-submit').style.background='#16a34a';">
          <div class="form-row">
            <div class="form-field">
              <label>Név *</label>
              <input type="text" placeholder="Az Ön neve" required>
            </div>
            <div class="form-field">
              <label>Email *</label>
              <input type="email" placeholder="pelda@email.com" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>Telefon</label>
              <input type="tel" placeholder="+36 XX XXX XXXX">
            </div>
            <div class="form-field">
              <label>Tárgy</label>
              <select>
                <option>Időpontfoglalás</option>
                <option>Árajánlat kérés</option>
                <option>Általános kérdés</option>
                <option>Egyéb</option>
              </select>
            </div>
          </div>
          <div class="form-field">
            <label>Üzenet</label>
            <textarea rows="5" placeholder="Miben segíthetünk?"></textarea>
          </div>
          <button type="submit" class="form-submit">Üzenet küldése →</button>
        </form>
        <div class="reveal reveal-delay-2">
          <div class="contact-info-list">
            <div class="contact-info-item">
              <div class="contact-info-icon">📍</div>
              <div>
                <h4>Cím</h4>
                <p>${lead.address || lead.city + ', Magyarország'}</p>
              </div>
            </div>
            ${lead.phone ? `
            <div class="contact-info-item">
              <div class="contact-info-icon">📞</div>
              <div>
                <h4>Telefon</h4>
                <p><a href="tel:${lead.phone}" style="color:#6b7280;text-decoration:none;">${lead.phone}</a></p>
              </div>
            </div>` : ''}
            ${lead.email ? `
            <div class="contact-info-item">
              <div class="contact-info-icon">✉️</div>
              <div>
                <h4>Email</h4>
                <p><a href="mailto:${lead.email}" style="color:#6b7280;text-decoration:none;">${lead.email}</a></p>
              </div>
            </div>` : ''}
            <div class="contact-info-item">
              <div class="contact-info-icon">🕐</div>
              <div>
                <h4>Nyitvatartás</h4>
                <p>Hétfő – Péntek: 9:00 – 18:00<br>Szombat: 9:00 – 14:00</p>
              </div>
            </div>
          </div>
          <div class="map-container">
            <span>📍 ${lead.name} – ${lead.address || lead.city}</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="#" class="nav-brand" style="color:#fff;font-size:24px;text-decoration:none;"><span style="color:${cat.accent}">${lead.name.charAt(0)}</span>${lead.name.slice(1)}</a>
          <p>${cat.heroSub(lead.city)}</p>
        </div>
        <div class="footer-col">
          <h4>Navigáció</h4>
          <ul>
            <li><a href="#services">Szolgáltatások</a></li>
            <li><a href="#reviews">Vélemények</a></li>
            <li><a href="#contact">Kapcsolat</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Elérhetőség</h4>
          <ul>
            <li><a href="#">${lead.city}, Magyarország</a></li>
            ${lead.phone ? `<li><a href="tel:${lead.phone}">${lead.phone}</a></li>` : ''}
            ${lead.email ? `<li><a href="mailto:${lead.email}">${lead.email}</a></li>` : ''}
          </ul>
        </div>
        <div class="footer-col">
          <h4>Nyitvatartás</h4>
          <ul>
            <li><a href="#">H-P: 9:00 – 18:00</a></li>
            <li><a href="#">Sz: 9:00 – 14:00</a></li>
            <li><a href="#">V: Zárva</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} ${lead.name}. Minden jog fenntartva.</p>
        <div class="footer-social">
          <a href="#" aria-label="Facebook">f</a>
          <a href="#" aria-label="Instagram">ig</a>
          <a href="#" aria-label="Google">G</a>
        </div>
      </div>
    </div>
  </footer>

  <script>
    // Navbar scroll effect
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Mobile menu
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      hamburger.classList.toggle('active');
    });

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(a.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          navLinks.classList.remove('active');
        }
      });
    });

    // Scroll reveal
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  </script>
</body>
</html>`;
}

export async function buildForLead(lead) {
  const slug = slugify(lead.name);
  const projectDir = `projects/${slug}`;

  console.log(`[Builder] Building website for: ${lead.name}`);
  logAction('builder', 'build_start', { name: lead.name, city: lead.city });

  mkdirSync(projectDir, { recursive: true });

  const diagnosisPath = `database/diagnosis/${slug}.json`;
  const diagnosis = existsSync(diagnosisPath) ? loadJSON(diagnosisPath) : null;

  const html = generateHTML(lead, diagnosis);
  writeFileSync(`${projectDir}/index.html`, html, 'utf-8');

  const metadata = {
    business_name: lead.name,
    city: lead.city,
    category: lead.category,
    generated_at: new Date().toISOString(),
    files: ['index.html'],
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
