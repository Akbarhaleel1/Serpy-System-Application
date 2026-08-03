#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔧 Installing Chromium for Puppeteer...\n');

try {
  console.log('📦 Running: npx puppeteer browsers install chrome');
  execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
  console.log('\n✅ Chromium installation completed successfully!');
  console.log('✅ PDF generation should now work.');
} catch (error) {
  console.error('\n❌ Installation failed:', error.message);
  console.log('\n📝 Manual Installation Instructions:');
  console.log('1. Open Command Prompt or PowerShell');
  console.log('2. Navigate to: cd D:\\erp\\backend');
  console.log('3. Run: npx puppeteer browsers install chrome');
  console.log('\n💡 Alternative: Install Chrome/Chromium manually:');
  console.log('   - Download from: https://www.google.com/chrome/');
  console.log('   - Or use Chocolatey: choco install chromium');
  process.exit(1);
}
