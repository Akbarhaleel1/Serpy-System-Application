#!/usr/bin/env node

/**
 * Supabase Cleanup Script
 * This script helps clean up Supabase dependencies after migration is complete
 */

const fs = require('fs');
const path = require('path');

// Files and directories to remove after migration
const SUPABASE_FILES_TO_REMOVE = [
  'src/integrations/supabase/',
  'supabase/',
  'src/integrations/supabase/types.ts',
  'src/integrations/supabase/client.ts'
];

// Supabase dependencies to remove from package.json
const SUPABASE_PACKAGES = [
  '@supabase/supabase-js'
];

const packageJsonPath = path.join(__dirname, '../package.json');
const packageLockPath = path.join(__dirname, '../package-lock.json');

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
  };
  
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function removeDirectory(dirPath) {
  if (checkFileExists(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    log(`✅ Removed directory: ${dirPath}`, 'success');
    return true;
  }
  return false;
}

function removeFile(filePath) {
  if (checkFileExists(filePath)) {
    fs.unlinkSync(filePath);
    log(`✅ Removed file: ${filePath}`, 'success');
    return true;
  }
  return false;
}

function updatePackageJson() {
  if (!checkFileExists(packageJsonPath)) {
    log('❌ package.json not found', 'error');
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    let hasChanges = false;

    // Remove Supabase dependencies
    SUPABASE_PACKAGES.forEach(pkg => {
      if (packageJson.dependencies && packageJson.dependencies[pkg]) {
        delete packageJson.dependencies[pkg];
        log(`✅ Removed dependency: ${pkg}`, 'success');
        hasChanges = true;
      }
      if (packageJson.devDependencies && packageJson.devDependencies[pkg]) {
        delete packageJson.devDependencies[pkg];
        log(`✅ Removed dev dependency: ${pkg}`, 'success');
        hasChanges = true;
      }
    });

    if (hasChanges) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      log('✅ Updated package.json', 'success');
      return true;
    } else {
      log('ℹ️  No Supabase dependencies found in package.json', 'info');
      return false;
    }
  } catch (error) {
    log(`❌ Error updating package.json: ${error.message}`, 'error');
    return false;
  }
}

function scanForSupabaseReferences() {
  log('🔍 Scanning for Supabase references...', 'info');
  
  const srcDir = path.join(__dirname, '../src');
  const references = [];

  function scanDirectory(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      const filePath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        scanDirectory(filePath);
      } else if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.tsx'))) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const relativePath = path.relative(process.cwd(), filePath);
          
          // Check for Supabase imports and usage
          if (content.includes('@supabase') || 
              content.includes('supabase') || 
              content.includes('Supabase')) {
            references.push({
              file: relativePath,
              lines: content.split('\n').map((line, index) => {
                if (line.includes('supabase') || line.includes('Supabase') || line.includes('@supabase')) {
                  return { lineNumber: index + 1, content: line.trim() };
                }
                return null;
              }).filter(Boolean)
            });
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    });
  }

  if (checkFileExists(srcDir)) {
    scanDirectory(srcDir);
  }

  return references;
}

function main() {
  log('🧹 Supabase Cleanup Script', 'info');
  log('===============================', 'info');
  log('');
  
  // Safety check
  log('⚠️  This script will remove Supabase-related files and dependencies.', 'warning');
  log('⚠️  Make sure your migration is complete before proceeding.', 'warning');
  log('');
  
  // Ask for confirmation
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('Are you sure you want to proceed? (yes/no): ', (answer) => {
    if (answer.toLowerCase() !== 'yes') {
      log('❌ Cleanup cancelled.', 'error');
      readline.close();
      return;
    }

    readline.close();
    performCleanup();
  });
}

function performCleanup() {
  log('');
  log('🚀 Starting cleanup...', 'info');
  log('');

  // 1. Remove files and directories
  log('📁 Removing Supabase files and directories...', 'info');
  SUPABASE_FILES_TO_REMOVE.forEach(item => {
    const fullPath = path.join(__dirname, '..', item);
    
    if (item.endsWith('/')) {
      removeDirectory(fullPath);
    } else {
      removeFile(fullPath);
    }
  });

  // 2. Update package.json
  log('');
  log('📦 Updating package.json...', 'info');
  const packageUpdated = updatePackageJson();

  // 3. Scan for remaining references
  log('');
  const references = scanForSupabaseReferences();
  
  if (references.length > 0) {
    log(`⚠️  Found ${references.length} files with remaining Supabase references:`, 'warning');
    references.forEach(ref => {
      log(`   📄 ${ref.file}:`, 'warning');
      ref.lines.forEach(line => {
        log(`     Line ${line.lineNumber}: ${line.content}`, 'warning');
      });
    });
    log('');
    log('🔧 Please review and update these files manually.', 'warning');
  } else {
    log('✅ No Supabase references found in source code.', 'success');
  }

  // 4. Final instructions
  log('');
  log('📋 Next steps:', 'info');
  log('   1. Run: npm install (to update dependencies)', 'info');
  log('   2. Remove Supabase-related environment variables from your .env files', 'info');
  log('   3. Update your deployment configuration to not use Supabase services', 'info');
  log('   4. Test your application thoroughly', 'info');
  
  if (packageUpdated) {
    log('');
    log('🔄 Run the following command to update dependencies:', 'info');
    log('   npm install', 'success');
  }

  log('');
  log('🎉 Cleanup process completed!', 'success');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  removeDirectory,
  removeFile,
  updatePackageJson,
  scanForSupabaseReferences
};
