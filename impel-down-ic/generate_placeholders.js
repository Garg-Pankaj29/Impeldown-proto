const fs = require('fs');
const path = require('path');
const https = require('https');

const assets = [
  'logo.png', 'avatar_reporter.png', 'flag_post.png', 
  'icon_track_reports.png', 'icon_announcements.png', 'icon_help.png', 'seagull.png',
  'form_hat.png', 'form_sign.png', 'form_map.png', 'form_compass.png', 
  'form_quill.png', 'form_picture.png', 'form_ship_btn.png', 'list_logbook.png',
  'cat_cell_riot.png', 'cat_poison.png', 'cat_escape.png', 'cat_seaking.png', 
  'cat_seastone.png', 'cat_gate.png', 'cat_invasion.png', 'stat_anchor.png', 
  'stat_wanted.png', 'stat_compass.png', 'stat_flag_green.png', 'stat_flag_red.png', 
  'stat_ship.png', 'empty_bottle.png', 'wave_back.svg', 'wave_mid.svg', 'wave_front.svg'
];

const dir = path.join(__dirname, '../client/public/images/reporter');

function download(filename) {
  return new Promise((resolve, reject) => {
    const ext = filename.split('.').pop();
    const isSvg = ext === 'svg';
    const url = isSvg 
      ? `https://placehold.co/100x100.svg?text=${filename.replace('.svg', '')}`
      : `https://placehold.co/100x100.png?text=${filename.replace('.png', '')}`;
    const dest = path.join(dir, filename);
    
    if (fs.existsSync(dest)) {
      console.log(`Exists: ${filename}`);
      resolve();
      return;
    }
    
    https.get(url, (res) => {
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      console.error(`Error downloading ${filename}:`, err);
      reject(err);
    });
  });
}

async function main() {
  for (const asset of assets) {
    await download(asset);
  }
}

main().catch(console.error);
