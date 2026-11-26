// Regenerate with: npm i @resvg/resvg-js@2.6.2 (anywhere) then node design/brand/generate-brand.js <project folder>
// Renders Wanla's chosen brand: the "W + coin" app icon (option B) and the "Wanla. + coin" wordmark (option 1).
// Usage: node gen2.js <project folder>
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const proj = process.argv[2];
const assets = path.join(proj, 'assets');
const brand = path.join(proj, 'design', 'brand');
fs.mkdirSync(brand, { recursive: true });
const FONT = path.join(proj, 'node_modules/@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf');

const INK = '#161616', LIME = '#C6F432', SUN = '#FFD23F', TOMATO = '#FF5A36', PAPER = '#F7F1E3';

// The W monogram on a 120-unit grid: a thick ink W with a hard sticker shadow and a coin over the middle peak.
function monogram({ mono = false } = {}) {
  const ink = mono ? '#000' : INK;
  const w = 'M25 46l13 44h9l13-34 13 34h9l13-44';
  const shadow = '';
  const coin = mono
    ? `<circle cx="60" cy="25" r="13" fill="#000"/>`
    : `<circle cx="63" cy="28" r="13" fill="${INK}"/><circle cx="60" cy="25" r="13" fill="${SUN}" stroke="${INK}" stroke-width="3.2"/><circle cx="55.5" cy="23.5" r="1.9" fill="${INK}"/><circle cx="64.5" cy="23.5" r="1.9" fill="${INK}"/><path d="M55 28.5q5 4.5 10 0" fill="none" stroke="${INK}" stroke-width="2.3" stroke-linecap="round"/>`;
  const stroke = mono ? '#000' : INK;
  return `${shadow}<path d="${w}" fill="none" stroke="${stroke}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>${coin}`;
}

const icon = (size, { bg = LIME, scale = 1, mono = false } = {}) => {
  const k = (size / 120) * scale;
  const off = (size - 120 * k) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}<g transform="translate(${off} ${off + 2 * k}) scale(${k})">${monogram({ mono })}</g></svg>`;
};

// Wordmark: "Wanla" + tomato dot + coin mascot.
function wordmark({ bg = null, w = 1200, h = 360 } = {}) {
  const coin = `<g transform="translate(872 75) scale(3.3)"><circle cx="34.5" cy="34.5" r="28" fill="${INK}"/><circle cx="32" cy="32" r="28" fill="${SUN}" stroke="${INK}" stroke-width="3"/><circle cx="32" cy="32" r="21" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="3 4"/><circle cx="24" cy="29" r="3.3" fill="${INK}"/><circle cx="40" cy="29" r="3.3" fill="${INK}"/><path d="M23.5 38q8.5 7.5 17 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><ellipse cx="17" cy="37" rx="3.5" ry="2" fill="#FF8A6B"/><ellipse cx="47" cy="37" rx="3.5" ry="2" fill="#FF8A6B"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1200 360">${bg ? `<rect width="1200" height="360" fill="${bg}"/>` : ''}<text x="120" y="252" font-family="Bricolage Grotesque" font-weight="800" font-size="230" letter-spacing="-9" fill="${INK}">Wanla</text><circle cx="826" cy="232" r="27" fill="${TOMATO}"/>${coin}</svg>`;
}

const render = (svg, file, width) => {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { fontFiles: [FONT], loadSystemFonts: false, defaultFontFamily: 'Bricolage Grotesque' } }).render().asPng();
  fs.writeFileSync(file, png);
  console.log(path.relative(proj, file), width, png.length);
};

// App icons
render(icon(1024), path.join(assets, 'icon.png'), 1024);
render(icon(1024, { bg: null, scale: 0.6 }), path.join(assets, 'android-icon-foreground.png'), 1024);
render(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${LIME}"/></svg>`, path.join(assets, 'android-icon-background.png'), 1024);
render(icon(1024, { bg: null, scale: 0.6, mono: true }), path.join(assets, 'android-icon-monochrome.png'), 1024);
render(icon(1024), path.join(assets, 'favicon.png'), 48);
// Splash: the wordmark on the paper background that app.json paints.
render(wordmark(), path.join(assets, 'splash-icon.png'), 1200);

// Brand files for the website, socials and store graphics
fs.writeFileSync(path.join(brand, 'wanla-icon.svg'), icon(1024));
fs.writeFileSync(path.join(brand, 'wanla-wordmark.svg'), wordmark());
render(icon(1024), path.join(brand, 'wanla-icon-1024.png'), 1024);
render(wordmark(), path.join(brand, 'wanla-wordmark-transparent.png'), 1200);
render(wordmark({ bg: PAPER }), path.join(brand, 'wanla-wordmark-paper.png'), 1200);
render(wordmark({ bg: LIME }), path.join(brand, 'wanla-wordmark-lime.png'), 1200);
