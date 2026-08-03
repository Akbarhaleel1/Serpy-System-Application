// Test script to check for Staff model imports
const fs = require('fs');
const path = require('path');

function checkFileForStaffModel(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const staffImports = [];
    lines.forEach((line, index) => {
      if (line.includes("require('../models/Staff')") || 
          line.includes("require('./models/Staff')") ||
          line.includes('from "../models/Staff"') ||
          line.includes('from "./models/Staff"')) {
        staffImports.push(`Line ${index + 1}: ${line.trim()}`);
      }
    });
    
    return staffImports;
  } catch (error) {
    return [`Error reading file: ${error.message}`];
  }
}

const routesDir = path.join(__dirname, 'src', 'routes');
const modelDir = path.join(__dirname, 'src', 'models');

console.log('Checking for Staff model imports...\n');

// Check routes directory
const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));
console.log('=== ROUTES ===');
routeFiles.forEach(file => {
  const filePath = path.join(routesDir, file);
  const imports = checkFileForStaffModel(filePath);
  if (imports.length > 0) {
    console.log(`\n${file}:`);
    imports.forEach(imp => console.log(`  ${imp}`));
  }
});

// Check models directory
const modelFiles = fs.readdirSync(modelDir).filter(file => file.endsWith('.js'));
console.log('\n=== MODELS ===');
modelFiles.forEach(file => {
  const filePath = path.join(modelDir, file);
  const imports = checkFileForStaffModel(filePath);
  if (imports.length > 0) {
    console.log(`\n${file}:`);
    imports.forEach(imp => console.log(`  ${imp}`));
  }
});

console.log('\n=== SUMMARY ===');
console.log('Staff model import check completed.');
console.log('If no imports are shown above, the Staff model has been successfully removed.');
