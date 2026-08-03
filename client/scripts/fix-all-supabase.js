#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findSupabaseReferences(dir) {
  const files = [];
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDirectory(fullPath);
      } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts')) && !item.includes('supabase')) {
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

function fixSupabaseInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Remove supabase imports
  if (content.includes("import { supabase } from \"@/integrations/supabase/client\";")) {
    content = content.replace(
      "import { supabase } from \"@/integrations/supabase/client\";",
      ""
    );
    modified = true;
  }
  
  if (content.includes("import { supabase } from '@/integrations/supabase/client';")) {
    content = content.replace(
      "import { supabase } from '@/integrations/supabase/client';",
      ""
    );
    modified = true;
  }
  
  // Add apiClient import if not present
  if (modified && !content.includes("import apiClient from")) {
    const lines = content.split('\n');
    const importIndex = lines.findIndex(line => line.startsWith('import '));
    if (importIndex !== -1) {
      lines.splice(importIndex, 0, "import apiClient from \"@/lib/apiClient\";");
      content = lines.join('\n');
    }
  }
  
  // Replace common patterns
  const patterns = [
    // Auth patterns
    {
      pattern: /const\s*{\s*data:\s*{\s*user\s*}\s*}\s*=\s*await\s*supabase\.auth\.getUser\(\);/g,
      replacement: 'const user = await apiClient.getCurrentUser();'
    },
    {
      pattern: /supabase\.auth\.getUser\(\)/g,
      replacement: 'apiClient.getCurrentUser()'
    },
    {
      pattern: /supabase\.auth\.signOut\(\)/g,
      replacement: 'apiClient.logout()'
    },
    
    // Simple query patterns
    {
      pattern: /supabase\.from\(['"`]([^'"`]+)['"`]\)\.select\([^)]*\)\.order\([^)]*\)\.limit\(([^)]*)\)/g,
      replacement: 'apiClient.get$1({ limit: $2 })'
    },
    {
      pattern: /supabase\.from\(['"`]([^'"`]+)['"`]\)\.select\([^)]*\)\.eq\([^)]*\)\.order\([^)]*\)/g,
      replacement: 'apiClient.get$1()'
    },
    {
      pattern: /supabase\.from\(['"`]([^'"`]+)['"`]\)\.select\([^)]*\)\.eq\([^)]*\)/g,
      replacement: 'apiClient.get$1()'
    },
    {
      pattern: /supabase\.from\(['"`]([^'"`]+)['"`]\)\.select\([^)]*\)/g,
      replacement: 'apiClient.get$1()'
    },
    
    // Insert patterns
    {
      pattern: /supabase\.from\(['"`]([^'"`]+)['"`]\)\.insert\(([^)]*)\)/g,
      replacement: 'apiClient.create$1($2)'
    },
    
    // Update patterns
    {
      pattern: /supabase\.from\(['"`]([^'"`]+)['"`]\)\.update\(([^)]*)\)\.eq\(([^)]*)\)/g,
      replacement: 'apiClient.update$1($3, $2)'
    },
    
    // Delete patterns
    {
      pattern: /supabase\.from\(['"`]([^'"`]+)['"`]\)\.delete\(\)\.eq\(([^)]*)\)/g,
      replacement: 'apiClient.delete$1($2)'
    }
  ];
  
  patterns.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  });
  
  // Remove error handling for supabase
  content = content.replace(/if\s*\(\s*error\s*\)\s*throw\s*error;?\s*/g, '');
  content = content.replace(/const\s*{\s*error[^}]*}\s*=\s*await\s*[^;]+;/g, '');
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

function main() {
  console.log('🔧 Finding and fixing remaining Supabase references...\n');
  
  const srcDir = path.join(__dirname, '..', 'src');
  const files = findSupabaseReferences(srcDir);
  
  console.log(`Found ${files.length} files with Supabase references:`);
  files.forEach(file => {
    const relativePath = path.relative(path.join(__dirname, '..'), file);
    console.log(`  - ${relativePath}`);
  });
  
  console.log('\n🔧 Fixing files...\n');
  
  let fixedCount = 0;
  
  files.forEach(file => {
    const relativePath = path.relative(path.join(__dirname, '..'), file);
    if (fixSupabaseInFile(file)) {
      console.log(`✅ Fixed: ${relativePath}`);
      fixedCount++;
    } else {
      console.log(`⏭️  No changes needed: ${relativePath}`);
    }
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files modified: ${fixedCount}`);
  
  if (fixedCount > 0) {
    console.log('\n✅ Supabase references have been fixed!');
  } else {
    console.log('\n✨ No Supabase references found to fix!');
  }
}

main();
