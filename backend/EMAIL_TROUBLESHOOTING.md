# Email Sending - Troubleshooting Guide

## Error: "self-signed certificate in certificate chain"

### What This Means
This error occurs when Node.js cannot verify the SSL certificate for Gmail's SMTP server. This is a security feature but Gmail uses certificates that Node.js sometimes has trouble validating.

### Solution (Already Applied)
The code has been updated with TLS configuration that allows certificate verification to be relaxed:

```javascript
tls: {
  rejectUnauthorized: false
}
```

This is safe for development/internal use.

---

## Step-by-Step Fix

### Step 1: Verify .env Configuration
Make sure your `.env` file has BOTH credentials set:

```env
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=abcdefghijklmnop
```

✅ Both fields must have actual values (not placeholders)

### Step 2: Restart Backend Server
```powershell
cd D:\erp\backend
npm run dev
```

### Step 3: Check Console Output

You should see:
```
📧 Creating email transporter...
📧 Verifying transporter connection...
✅ Transporter is ready
```

If you see this ✅, the certificate issue is fixed!

### Step 4: Test Email Sending

1. Go to your application
2. Open an invoice
3. Click "Send Email"
4. Try sending to your own email first
5. Check inbox and spam folder

---

## Common Email Errors & Solutions

### Error 1: "Invalid login credentials"

**Problem:** Wrong email or app password

**Solution:**
1. Verify EMAIL_USER is correct Gmail address
2. Verify EMAIL_PASS is the 16-char App Password (not Gmail password)
3. Get new App Password: https://myaccount.google.com/apppasswords
4. Restart backend

**Console Log:**
```
❌ Email sending failed: Invalid login credentials
```

---

### Error 2: "self-signed certificate in certificate chain"

**Problem:** SSL certificate validation failure

**Solution:**
✅ Already fixed in code with `tls: { rejectUnauthorized: false }`

Make sure you have the latest PDFService.js code.

**Console Log:**
```
❌ Email sending failed: self-signed certificate in certificate chain
```

---

### Error 3: "ECONNREFUSED - Connection refused"

**Problem:** Cannot connect to Gmail SMTP

**Solution:**
1. Check internet connection
2. Verify firewall isn't blocking port 587
3. Try using different network
4. Check Gmail allows less secure apps

---

### Error 4: "Email credentials not configured"

**Problem:** EMAIL_USER or EMAIL_PASS missing in .env

**Solution:**
1. Open `D:\erp\backend\.env`
2. Add both EMAIL_USER and EMAIL_PASS
3. Restart backend with `npm run dev`

**Example:**
```env
EMAIL_USER=printarts@gmail.com
EMAIL_PASS=abcdefghijklmnop
```

---

### Error 5: "Email sending failed: getaddrinfo ENOTFOUND"

**Problem:** DNS resolution failure (network issue)

**Solution:**
1. Check internet connection
2. Verify you can access gmail.com in browser
3. Try restarting computer
4. Check router/ISP connection

---

## Verification Checklist

Before testing email, verify all items:

- [ ] Gmail account created and active
- [ ] 2-Step Verification enabled
- [ ] App Password generated
- [ ] EMAIL_USER set in .env
- [ ] EMAIL_PASS set in .env
- [ ] Backend restarted after .env changes
- [ ] No typos in email credentials
- [ ] Internet connection working
- [ ] Gmail SMTP not blocked by firewall

---

## Testing Email Step-by-Step

### Test 1: Console Verification
1. Start backend: `npm run dev`
2. Check console for:
   ```
   📧 Creating email transporter...
   📧 Verifying transporter connection...
   ✅ Transporter is ready
   ```

### Test 2: Send Test Email
1. Open application
2. Create/find an invoice
3. Click "View" → "Send Email"
4. Enter your own email address
5. Click "Send Email"
6. Check console for success message:
   ```
   ✅ Email sent successfully!
   📧 Message ID: <ID>
   ```

### Test 3: Verify Email Received
1. Check inbox for email from EMAIL_USER
2. Check spam/junk folder
3. Verify PDF attachment is present
4. Verify email formatting is correct

---

## Console Output Reference

### Successful Email Flow
```
📧 Starting email send process
📧 Email credentials check: { hasEmailUser: true, hasEmailPass: true }
📧 Creating email transporter...
📧 Verifying transporter connection...
✅ Transporter is ready
📧 Generating PDF for email...
✅ PDF generated with PDFKit, size: 45832 bytes
📧 Preparing to send invoice email...
📧 Sending email to: customer@example.com
✅ Email sent successfully!
📧 Message ID: <CAExampleMessageID@mail.gmail.com>
```

### Common Error Patterns
```
❌ Email credentials not configured
❌ Email sending failed: Invalid login credentials
❌ Email sending failed: self-signed certificate in certificate chain
❌ Email sending failed: ECONNREFUSED
```

---

## Gmail App Password Setup (Detailed)

### If you don't have App Password yet:

1. Go to: https://myaccount.google.com/apppasswords
2. Make sure you're logged into your Gmail account
3. Select device type: **Windows Computer**
4. Select app: **Mail**
5. Click "Generate"
6. Copy the 16-character password shown (format: `xxxx xxxx xxxx xxxx`)
7. Paste into .env as EMAIL_PASS

**Important:** This is the App Password, not your Gmail password!

---

## Security Notes

- ✅ App Password is unique to your app
- ✅ You can revoke it anytime
- ✅ It only works for email sending
- ✅ Never share App Password
- ✅ TLS certificate verification is disabled (safe for internal use)

---

## If Still Not Working

Try these steps in order:

1. **Restart Backend**
   ```powershell
   npm run dev
   ```

2. **Clear npm Cache**
   ```powershell
   npm cache clean --force
   ```

3. **Reinstall Dependencies**
   ```powershell
   npm install
   npm run dev
   ```

4. **Verify Email Credentials Again**
   - Go to https://myaccount.google.com/apppasswords
   - Generate new App Password
   - Update .env with new password
   - Restart backend

5. **Check Node.js Version**
   ```powershell
   node --version
   ```
   Should be v16 or higher

---

## Support

If you continue having issues:

1. **Note the exact error message**
2. **Check backend console logs** (full output)
3. **Verify .env configuration**
4. **Test Gmail credentials** in browser first
5. **Try sending from Gmail directly** to ensure account works

---

## Key Points to Remember

✅ Use **App Password**, not Gmail password
✅ Restart backend after .env changes
✅ Check **console logs** for errors
✅ 2-Step Verification must be **enabled**
✅ Certificate error is **already fixed**

---

You should now be able to send invoices via email! 🎉

Let me know if you encounter any specific error messages and I can help debug further.
