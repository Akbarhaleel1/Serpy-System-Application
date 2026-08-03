# Puppeteer PDF Generation Setup

## Problem
```
Failed to generate PDF: Could not find Chrome (ver. 121.0.6167.85)
```

This error occurs because Puppeteer cannot find Chrome/Chromium browser on your system.

---

## Solution 1: Automatic Installation (Recommended)

### Step 1: Run the Installation Script
```powershell
# Open PowerShell in D:\erp\backend directory and run:
node install-chromium.js
```

Or manually run:
```powershell
cd D:\erp\backend
npx puppeteer browsers install chrome
```

**Expected Output:**
```
✅ Downloading Chrome...
✅ Chromium installed successfully
✅ PDF generation should now work
```

### Step 2: Verify Installation
The Chromium cache is stored in:
```
C:\Users\<YourUsername>\.cache\puppeteer
```

---

## Solution 2: Use System Chrome Installation

If you already have Google Chrome installed on your system:

### Step 1: Find Chrome Installation Path
Common locations:
- **Windows 64-bit**: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- **Windows 32-bit**: `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`

### Step 2: Set Environment Variable
Create a `.env` file in `D:\erp\backend` and add:
```env
CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

Or set it via PowerShell:
```powershell
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

### Step 3: Restart Your Backend Server
```powershell
npm run dev
```

---

## Solution 3: Use Chocolatey (Windows Package Manager)

If you have Chocolatey installed:

```powershell
choco install chromium
```

---

## Verification Checklist

After installation, verify:

✅ Puppeteer cache exists: `C:\Users\<YourUsername>\.cache\puppeteer`
✅ Backend server is running: `npm run dev`
✅ Try PDF download again from the application

---

## If Download Still Fails

Check the backend console logs for:
```
✅ HTML content generated
✅ Content set on page
✅ PDF generated, size: [bytes]
✅ PDF sent to client
```

If you see different errors, check:
1. Browser console (F12) for network errors
2. Backend server logs for detailed error messages
3. File permissions in cache directory

---

## Quick Test

Test the PDF endpoint directly:
```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_TOKEN_HERE"
}

Invoke-WebRequest -Uri "http://localhost:4001/api/invoices/YOUR_INVOICE_ID/pdf" `
                  -Headers $headers `
                  -OutFile "test_invoice.pdf"
```

---

## Environment Variables

Add to your `.env` file:
```env
# PDF Generation
CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
PUPPETEER_CACHE_DIR=C:\Users\<YourUsername>\.cache\puppeteer
NODE_ENV=development
```

---

## Support

If you continue to have issues:
1. Check Node.js version: `node --version` (should be v16+)
2. Check npm version: `npm --version`
3. Clear npm cache: `npm cache clean --force`
4. Reinstall dependencies: `npm install`
5. Try installation again: `npx puppeteer browsers install chrome`
