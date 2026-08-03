#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

// Find all TypeScript/JavaScript files
function findFiles(dir, extension) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat && stat.isDirectory()) {
      // Skip node_modules and dist directories
      if (!['node_modules', 'dist', '.git'].includes(file)) {
        results = results.concat(findFiles(fullPath, extension));
      }
    } else if (file.endsWith(extension)) {
      results.push(fullPath);
    }
  });
  
  return results;
}

// Replace Supabase imports
function replaceSupabaseImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace import statements
    const importPatterns = [
      // Direct import
      {
        from: "import { supabase } from \"@/integrations/supabase/client\";",
        to: "import apiClient from \"@/lib/apiClient\";"
      },
      // Named import
      {
        from: "import { supabase } from '@/integrations/supabase/client';",
        to: "import apiClient from '@/lib/apiClient';"
      },
      // Default import
      {
        from: "import supabase from \"@/integrations/supabase/client\";",
        to: "import apiClient from \"@/lib/apiClient\";"
      },
      {
        from: "import supabase from '@/integrations/supabase/client';",
        to: "import apiClient from '@/lib/apiClient';"
      }
    ];
    
    importPatterns.forEach(pattern => {
      if (content.includes(pattern.from)) {
        content = content.replace(pattern.from, pattern.to);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated imports in: ${path.relative(projectRoot, filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Replace Supabase calls with console warnings (for gradual migration)
function replaceSupabaseCalls(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace common Supabase patterns
    const callPatterns = [
      // supabase.from('table').select('*')
      {
        from: /supabase\.from\(['"`]([^'"`]+)['"`]\)\.select\(['"`]([^'"`]*?)['"`]\)/g,
        to: (match, table, columns) => {
          return `console.warn('⚠️ Migration needed: supabase.from('${table}').select()'); apiClient.get${capitalizeFirst(table)}()`;
        }
      },
      
      // supabase.from('table').insert(data)
      {
        from: /supabase\.from\(['"`]([^'"`]+)['"`]\)\.insert\(([^)]+)\)/g,
        to: (match, table, data) => {
          return `console.warn('⚠️ Migration needed: supabase.from('${table}').insert()'); apiClient.create${capitalizeFirst(table)}(${data})`;
        }
      },
      
      // supabase.auth.getUser()
      {
        from: /supabase\.auth\.getUser\(\)/g,
        to: "console.warn('⚠️ Migration needed: supabase.auth.getUser()'); apiClient.getCurrentUser()"
      }
    ];
    
    callPatterns.forEach(pattern => {
      const newContent = content.replace(pattern.from, pattern.to);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`🔄 Updated function calls in: ${path.relative(projectRoot, filePath)}`);
    }
    
    return modified;
  } catch (error) {
    console.error(`❌ Error updating calls in ${filePath}:`, error.message);
    return false;
  }
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Main execution
console.log('🚀 Starting Supabase import replacement...\n');

const files = [...findFiles(srcDir, '.ts'), ...findFiles(srcDir, '.tsx')];
let processedFiles = 0;
let updatedFiles = 0;

files.forEach(file => {
  processedFiles++;
  
  // Skip test files and already processed files
  if (file.includes('.test.') || file.includes('.spec.') || file.includes('apiClient.ts')) {
    return;
  }
  
  let fileUpdated = replaceSupabaseImports(file);
  
  // Only try to replace function calls if imports were updated
  if (fileUpdated) {
    replaceSupabaseCalls(file);
    updatedFiles++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`  - Files processed: ${processedFiles}`);
console.log(`  - Files updated: ${updatedFiles}`);
console.log(`  - Files skipped: ${processedFiles - updatedFiles}`);

console.log('\n✨ Import replacement complete!');
console.log('\n⚠️  Note: You may need to manually fix some function calls.');
console.log('   Check the browser console for migration warnings.');
