const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'client', 'public', 'images', 'reporter');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const files = [
  'logo.png', 'avatar_reporter.png', 'flag_post.png', 
  'icon_track_reports.png', 'icon_announcements.png', 'icon_help.png',
  'seagull.png', 'form_hat.png', 'form_sign.png', 'form_map.png',
  'form_compass.png', 'form_quill.png', 'form_picture.png', 'form_ship_btn.png',
  'list_logbook.png', 'cat_cell.png', 'cat_poison.png', 'cat_escape.png',
  'cat_seaking.png', 'cat_seastone.png', 'cat_gate.png', 'cat_invasion.png',
  'stat_anchor.png', 'stat_wanted.png', 'stat_compass.png', 'stat_flag_green.png',
  'stat_flag_red.png', 'stat_ship.png', 'empty_bottle.png'
];

const svgTemplate = (text) => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#e2e8f0" rx="10" />
  <text x="100" y="100" font-family="sans-serif" font-size="20" fill="#475569" text-anchor="middle" dominant-baseline="middle">${text.replace('.png', '')}</text>
</svg>`;

files.forEach(file => {
  fs.writeFileSync(path.join(dir, file), svgTemplate(file));
});

const waveBack = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none"><path fill="#1e3a8a" fill-opacity="0.3" d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>`;
const waveMid = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none"><path fill="#1e3a8a" fill-opacity="0.6" d="M0,160L48,144C96,128,192,96,288,106.7C384,117,480,171,576,197.3C672,224,768,224,864,197.3C960,171,1056,117,1152,112C1248,107,1344,149,1392,170.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>`;
const waveFront = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none"><path fill="#1e3a8a" fill-opacity="1" d="M0,256L48,229.3C96,203,192,149,288,149.3C384,149,480,203,576,218.7C672,235,768,213,864,197.3C960,181,1056,171,1152,181.3C1248,192,1344,224,1392,240L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>`;

fs.writeFileSync(path.join(dir, 'wave_back.svg'), waveBack);
fs.writeFileSync(path.join(dir, 'wave_mid.svg'), waveMid);
fs.writeFileSync(path.join(dir, 'wave_front.svg'), waveFront);

console.log('Placeholders created.');
