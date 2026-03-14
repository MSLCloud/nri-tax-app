const fs = require('fs');
const path = require('path');

console.log('Creating NRI Tax App Structure...\n');

const folders = [
  'frontend/public',
  'frontend/src/components',
  'frontend/src/pages',
  'frontend/src/styles',
  'backend/src/routes',
  'backend/src/controllers',
  'backend/src/utils',
  'backend/src/config',
  'docs'
];

folders.forEach(folder => {
  const folderPath = path.join(__dirname, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log('Created: ' + folder);
  }
});

console.log('\nAll folders created successfully!');