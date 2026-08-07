const fs = require('fs');
const path = require('path');

const files = ['public/index.html', 'public/directeur.html', 'public/direction.html'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Insert the language toggle button into the header/navbar right side
  // For index.html it's .navbar-right or close to btn-logout
  // Since index.html has no navbar, maybe absolute position
  if (file.includes('index.html')) {
    if (!content.includes('id="btn-lang"')) {
      const btnHtml = `\n  <button id="btn-lang" onclick="toggleLanguage()" style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.7); border:1px solid #ccc; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; z-index:1000;">عربية</button>`;
      content = content.replace('<body>', '<body>' + btnHtml);
    }
  } else {
    // directeur.html and direction.html have <div class="navbar-right">
    if (!content.includes('id="btn-lang"')) {
      const btnHtml = `<button id="btn-lang" onclick="toggleLanguage()" style="background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.3); color:white; padding:7px 16px; border-radius:8px; cursor:pointer; font-weight:bold; transition:all 0.2s;">عربية</button>\n      `;
      content = content.replace('<button class="btn-logout"', btnHtml + '<button class="btn-logout"');
    }
  }

  // Include lang.js script at the end before </body>
  if (!content.includes('src="/lang.js"')) {
    content = content.replace('</body>', '  <script src="/lang.js"></script>\n</body>');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${file}`);
}
