const fs = require('fs');
const path = require('path');

const files = ['public/index.html', 'public/directeur.html', 'public/direction.html'];

const selectorHtml = `
  <select id="lang-selector" onchange="switchLang(this.value)" style="background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.3); color:white; padding:7px 12px; border-radius:8px; cursor:pointer; font-weight:bold; outline:none; transition:all 0.2s;">
    <option value="fr" style="color:#000;">🇫🇷 Français</option>
    <option value="ar" style="color:#000;">🇲🇦 العربية</option>
  </select>
`;

const selectorHtmlIndex = `
  <select id="lang-selector" onchange="switchLang(this.value)" style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.9); border:1px solid #ccc; color:#333; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; z-index:1000;">
    <option value="fr">🇫🇷 Français</option>
    <option value="ar">🇲🇦 العربية</option>
  </select>
`;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Remove the old button
  content = content.replace(/<button id="btn-lang"[\s\S]*?<\/button>/, '');

  if (file.includes('index.html')) {
    if (!content.includes('id="lang-selector"')) {
      content = content.replace('<body>', '<body>\n' + selectorHtmlIndex);
    }
  } else {
    // directeur.html and direction.html
    if (!content.includes('id="lang-selector"')) {
      content = content.replace('<button class="btn-logout"', selectorHtml + '\n        <button class="btn-logout"');
    }
  }

  fs.writeFileSync(file, content, 'utf8');
}
console.log('HTML files updated with select dropdown');
