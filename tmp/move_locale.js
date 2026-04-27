const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '../frontend/src/app');
const localeDir = path.join(appDir, '[locale]');

if (!fs.existsSync(localeDir)) {
    fs.mkdirSync(localeDir);
}

const items = fs.readdirSync(appDir);
for (const item of items) {
    if (item === 'api' || item === '[locale]' || item === 'globals.css' || item === 'icon.png') {
        continue;
    }
    const oldPath = path.join(appDir, item);
    const newPath = path.join(localeDir, item);
    console.log(`Moving ${oldPath} to ${newPath}`);
    fs.renameSync(oldPath, newPath);
}
console.log('Move completed.');
