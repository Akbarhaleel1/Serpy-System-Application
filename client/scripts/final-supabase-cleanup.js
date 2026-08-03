#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findFilesWithSupabase(dir) {
  const files = [];
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDirectory(fullPath);
      } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('supabase')) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scanDirectory(dir);
  return files;
}

function removeSupabaseReferences(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Remove any remaining supabase references
  const patterns = [
    // Remove supabase variable references
    /supabase\./g,
    // Remove supabase in comments
    /\/\/.*supabase.*$/gm,
    /\/\*.*supabase.*\*\//g,
    // Remove supabase in console.log
    /console\.log\([^)]*supabase[^)]*\)/g,
    // Remove supabase in strings
    /['"`][^'"`]*supabase[^'"`]*['"`]/g
  ];
  
  patterns.forEach(pattern => {
    if (pattern.test(content)) {
      content = content.replace(pattern, '');
      modified = true;
    }
  });
  
  // Clean up empty lines
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

function main() {
  console.log('🧹 Final cleanup of Supabase references...\n');
  
  const srcDir = path.join(__dirname, '..', 'src');
  const files = findFilesWithSupabase(srcDir);
  
  console.log(`Found ${files.length} files with Supabase references:`);
  files.forEach(file => {
    const relativePath = path.relative(path.join(__dirname, '..'), file);
    console.log(`  - ${relativePath}`);
  });
  
  console.log('\n🧹 Cleaning up files...\n');
  
  let cleanedCount = 0;
  
  files.forEach(file => {
    const relativePath = path.relative(path.join(__dirname, '..'), file);
    if (removeSupabaseReferences(file)) {
      console.log(`✅ Cleaned: ${relativePath}`);
      cleanedCount++;
    } else {
      console.log(`⏭️  No changes needed: ${relativePath}`);
    }
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files cleaned: ${cleanedCount}`);
  
  if (cleanedCount > 0) {
    console.log('\n✅ Supabase references have been cleaned up!');
  } else {
    console.log('\n✨ No Supabase references found to clean!');
  }
}

main();
