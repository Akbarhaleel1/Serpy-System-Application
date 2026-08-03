# Invoice Email Setup Guide

## Overview
The "Send Invoice" feature now allows you to email invoices directly to customers with:
- ✅ Professional HTML formatted email
- ✅ Invoice PDF attachment
- ✅ Invoice details (number, date, due date, amount)
- ✅ Custom message support
- ✅ Company information in footer

---

## Email Configuration Steps

### Step 1: Set Up Gmail App Password

**Why?** Google requires an App Password instead of your actual Gmail password for security.

**Steps:**
1. Go to: https://myaccount.google.com/apppasswords
2. You'll be prompted to select an app and device
   - **Select app:** Mail
   - **Select device:** Windows Computer (or your device type)
3. Google will generate a 16-character password
4. Copy this password (save it somewhere)

### Step 2: Update .env File

Open `D:\erp\backend\.env` and update:

```env
# Email Configuration
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
```

**Important:**
- `EMAIL_USER` = Your Gmail address (e.g., john@gmail.com)
- `EMAIL_PASS` = The 16-character App Password (you can remove spaces)
- Do NOT use your actual Gmail password

**Example:**
```env
EMAIL_USER=printarts@gmail.com
EMAIL_PASS=abcdefghijklmnop
```

### Step 3: Restart Backend Server

```powershell
npm run dev
```

---

## Testing Email Sending

### Method 1: Via Application
1. Open your application
2. Go to Invoices page
3. Click "View" on any invoice
4. Click "Send Email" button
5. Enter recipient email
6. Enter optional message
7. Click "Send Email"

### Method 2: Using Console Logs

Check backend console for:
```
📧 Starting email send process
📧 Email credentials check: { hasEmailUser: true, hasEmailPass: true }
📧 Creating email transporter...
📧 Generating PDF for email...
📧 Preparing to send invoice email...
📧 Sending email to: customer@example.com
✅ Email sent successfully!
📧 Message ID: <...>
```

---

## Email Features

### What Gets Sent

✅ **Professional HTML Email**
- Company header with invoice number
- Customer greeting
- Invoice details table (invoice number, dates)
- Total amount highlighted
- Custom message (if provided)
- Company contact information
- Footer with legal notice

✅ **PDF Attachment**
- Invoice PDF file
- Named as: `Invoice_INV-2025-001.pdf`

✅ **Custom Message**
- User can add a personalized message
- Will appear in the email body

---

## Troubleshooting

### Issue: "Email credentials not configured"

**Solution:**
Make sure `.env` file has:
```env
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=your_app_password
```

### Issue: "Invalid login credentials"

**Solution:**
1. Verify EMAIL_USER is correct Gmail address
2. Verify EMAIL_PASS is the App Password (not Gmail password)
3. Make sure 2-Step Verification is enabled on Google Account
4. Try creating a new App Password

### Issue: "SMTP Connection refused"

**Solution:**
1. Check internet connection
2. Verify Gmail SMTP settings are allowed in Google Account
3. Check if any firewall is blocking port 587

### Issue: Email not arriving

**Solution:**
1. Check backend console logs for success message
2. Check spam/junk folder
3. Verify recipient email address is correct
4. Check if sending account has correct Gmail password

---

## Console Output Reference

### Successful Email Send
```
📧 Starting email send process
📧 Email credentials check: { hasEmailUser: true, hasEmailPass: true }
📧 Creating email transporter...
📧 Generating PDF for email...
✅ PDF generated with PDFKit, size: 45832 bytes
📧 Preparing to send invoice email...
📧 Sending email to: customer@example.com
✅ Email sent successfully!
📧 Message ID: <CAExampleMessageID>
```

### Error Example
```
📧 Starting email send process
❌ Email error: Email credentials not configured. Please set EMAIL_USER and EMAIL_PASS in .env file
```

---

## Security Notes

- ✅ Never share your App Password
- ✅ App Password is specific to your Gmail account only
- ✅ You can delete and regenerate App Passwords anytime
- ✅ Email functionality requires internet connection
- ✅ Always use HTTPS in production

---

## Invoice Email Content

The email includes:
- Invoice number and company name
- Customer greeting
- Invoice details (dates, amounts)
- Invoice PDF attachment
- Optional custom message
- Company contact information
- Professional footer

---

## Next Steps

1. Set up Gmail App Password
2. Update `.env` file with credentials
3. Restart backend server
4. Test by sending an invoice email
5. Verify email arrives in customer inbox

---

## Support

If you encounter issues:
1. Check backend console logs for detailed error messages
2. Verify `.env` configuration
3. Ensure Gmail account has proper permissions
4. Check spam folder for emails
5. Restart backend server after making changes

---

## Gmail App Password Instructions (Detailed)

1. Go to https://myaccount.google.com/security
2. Click "2-Step Verification" (enable if not already enabled)
3. Go to https://myaccount.google.com/apppasswords
4. Select "Mail" and "Windows Computer"
5. Google generates a 16-digit password
6. Use this password in EMAIL_PASS

You're all set! 🎉
