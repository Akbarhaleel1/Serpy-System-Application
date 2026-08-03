#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files to fix (excluding documentation and scripts)
const filesToFix = [
  'src/components/accounts/ChequeTracker.tsx',
  'src/components/accounts/ChequeIssueDialog.tsx',
  'src/components/accounts/MakePaymentDialog.tsx',
  'src/components/accounts/OpeningBalanceDialog.tsx',
  'src/components/accounts/QuickReceivePaymentDialog.tsx',
  'src/components/accounts/AccountsReports.tsx',
  'src/components/calendar/CalendarView.tsx',
  'src/components/calendar/CreateEventDialog.tsx',
  'src/components/calendar/ReminderPanel.tsx',
  'src/components/customers/CustomerLedger.tsx',
  'src/components/customers/EditCustomerDialog.tsx',
  'src/components/employees/DesignChargesDialog.tsx',
  'src/components/flow/CustomerFlowTracker.tsx',
  'src/components/inventory/CreateItemDialog.tsx',
  'src/components/inventory/InventoryAnalytics.tsx',
  'src/components/inventory/InventoryCard.tsx',
  'src/components/inventory/PurchaseOrderDialog.tsx',
  'src/components/inventory/StockAlertsWidget.tsx',
  'src/components/inventory/StockMovementDialog.tsx',
  'src/components/inventory/UnitConverterDialog.tsx',
  'src/components/inventory/UnitConverterWidget.tsx',
  'src/components/jobs/CreateJobDialog.tsx',
  'src/components/jobs/JobInvoiceDialog.tsx',
  'src/components/jobs/JobPaymentDialog.tsx',
  'src/components/jobs/UpdateStatusDialog.tsx',
  'src/components/quotations/CreateQuotationDialog.tsx',
  'src/components/reports/RevenueReports.tsx',
  'src/components/staff/AssignTaskDialog.tsx',
  'src/components/staff/CreateStaffDialog.tsx',
  'src/components/staff/CreateTaskDialog.tsx',
  'src/components/users/InviteUserDialog.tsx',
  'src/components/vendors/CreateVendorDialog.tsx',
  'src/components/vendors/VendorBillDialog.tsx',
  'src/components/vendors/VendorLedgerDialog.tsx',
  'src/components/vendors/VendorPaymentDialog.tsx',
  'src/components/walkIn/CounterBillingDialog.tsx',
  'src/components/walkIn/JobQueueBoard.tsx',
  'src/components/walkIn/WalkInJobDialog.tsx',
  'src/components/whatsapp/WhatsAppIntegration.tsx',
  'src/components/whatsapp/WhatsAppSettingsDialog.tsx',
  'src/pages/ActivityLog.tsx',
  'src/pages/CalendarPage.tsx',
  'src/pages/DesignerTimer.tsx',
  'src/pages/Discounts.tsx',
  'src/pages/Portal.tsx',
  'src/pages/ProfileSettings.tsx',
  'src/pages/Proofing.tsx',
  'src/pages/UserManagement.tsx',
  'src/pages/WhatsApp.tsx',
  'src/utils/inventoryUtils.ts'
];

function fixSupabaseReferences(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Replace import statements
  if (content.includes("import { supabase } from \"@/integrations/supabase/client\";")) {
    content = content.replace(
      "import { supabase } from \"@/integrations/supabase/client\";",
      "import apiClient from \"@/lib/apiClient\";"
    );
    modified = true;
  }

  if (content.includes("import { supabase } from '@/integrations/supabase/client';")) {
    content = content.replace(
      "import { supabase } from '@/integrations/supabase/client';",
      "import apiClient from '@/lib/apiClient';"
    );
    modified = true;
  }

  // Replace common Supabase patterns with API client calls
  const replacements = [
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

    // Common query patterns
    {
      pattern: /supabase\.from\(['"`]([^'"`]+)['"`]\)\.select\(([^)]*)\)\.order\(([^)]*)\)\.limit\(([^)]*)\)/g,
      replacement: 'apiClient.get$1({ limit: $4 })'
    },
    {
      pattern: /supabase\.from\(['"`]([^'"`]+)['"`]\)\.select\(([^)]*)\)\.eq\(([^)]*)\)\.order\(([^)]*)\)/g,
      replacement: 'apiClient.get$1({ $3 })'
    },
    {
      pattern: /supabase\.from\(['"`]([^'"`]+)['"`]\)\.select\(([^)]*)\)\.eq\(([^)]*)\)/g,
      replacement: 'apiClient.get$1({ $3 })'
    },
    {
      pattern: /supabase\.from\(['"`]([^'"`]+)['"`]\)\.select\(([^)]*)\)/g,
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

  replacements.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  });

  // Add console.log for debugging
  if (modified && !content.includes('console.log(')) {
    // Add a console.log after the first function declaration
    content = content.replace(
      /(const\s+\w+\s*=\s*async\s*\([^)]*\)\s*=>\s*{)/,
      '$1\n    console.log(\'🔧 API call from\', \'' + filePath + '\');'
    );
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing remaining Supabase references...\n');
  
  let fixedCount = 0;
  let totalCount = filesToFix.length;

  filesToFix.forEach(filePath => {
    if (fixSupabaseReferences(filePath)) {
      fixedCount++;
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Total files processed: ${totalCount}`);
  console.log(`   Files modified: ${fixedCount}`);
  console.log(`   Files unchanged: ${totalCount - fixedCount}`);

  if (fixedCount > 0) {
    console.log('\n✅ Supabase references have been fixed!');
    console.log('   Please review the changes and test the application.');
  } else {
    console.log('\n✨ No Supabase references found to fix!');
  }
}

main();
