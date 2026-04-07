// scripts/validate-manifest.js
// Simple manifest validation script
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'manifest.json');

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Required fields
  const requiredFields = ['name', 'id', 'api', 'main', 'ui', 'editorType', 'documentAccess', 'permissions'];
  
  for (const field of requiredFields) {
    if (!manifest[field]) {
      console.error(`❌ Missing required field: ${field}`);
      process.exit(1);
    }
  }
  
  // Validate specific fields
  if (!manifest.name || typeof manifest.name !== 'string') {
    console.error('❌ Invalid or missing name field');
    process.exit(1);
  }
  
  if (!manifest.id || typeof manifest.id !== 'string') {
    console.error('❌ Invalid or missing id field');
    process.exit(1);
  }
  
  if (!manifest.api || typeof manifest.api !== 'string') {
    console.error('❌ Invalid or missing api field');
    process.exit(1);
  }
  
  console.log('✅ Manifest validation passed');
  process.exit(0);
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('❌ Manifest file not found');
  } else if (error instanceof SyntaxError) {
    console.error('❌ Invalid JSON in manifest file');
  } else {
    console.error('❌ Error validating manifest:', error.message);
  }
  process.exit(1);
}