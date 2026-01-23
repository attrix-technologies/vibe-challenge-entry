# Geotab Add-In Troubleshooting Guide

Having issues with your Add-In? This guide will help you fix common problems.

## "Issue Loading This Page" Error

**This is the most common error.** Here's how to fix it:

### 1. Check Your Configuration

**Problem**: The URL in your config points to a page that doesn't exist or isn't accessible.

**Example of BROKEN config**:
```json
{
    "url": "https://yourusername.github.io/my-fleet-addin/"
}
```
This won't work because `yourusername` is a placeholder!

**Solutions**:

**Option A: Use a working embedded Add-In** (easiest)
```bash
# Copy this entire JSON and paste it into MyGeotab
cat examples/addins/hello-world-embedded.json
```

**Option B: Use a real external URL**
```json
{
    "url": "https://www.example.com"  // This will work!
}
```

### 2. Embedded Add-Ins: Check Your JSON Structure

**Problem**: Embedded Add-Ins must use `"page"` instead of `"url"`

**WRONG**:
```json
{
    "items": [{
        "url": "customPage.html",  // ❌ Don't use "url" for embedded
        "path": "ActivityLink"
    }]
}
```

**CORRECT**:
```json
{
    "items": [{
        "page": "customPage",  // ✅ Use "page" name (no .html extension)
        "path": "ActivityLink"
    }],
    "files": {
        "customPage.html": "<html>...</html>"
    }
}
```

### 3. Check Browser Console for Errors

1. Open MyGeotab
2. Press `F12` (or `Ctrl+Shift+J` on Windows, `Cmd+Option+J` on Mac)
3. Click the **Console** tab
4. Click on your Add-In menu item
5. Look for red error messages

**Common console errors**:

**Error**: `Uncaught ReferenceError: initialize is not defined`
- **Cause**: Your HTML/JS doesn't define the `initialize()` function
- **Fix**: Add the lifecycle methods (see hello-world example)

**Error**: `ERR_NAME_NOT_RESOLVED` or `404 Not Found`
- **Cause**: The URL doesn't exist or can't be reached
- **Fix**: Verify the URL works in a regular browser tab first

**Error**: `Mixed Content` or `HTTPS required`
- **Cause**: You're using `http://` instead of `https://`
- **Fix**: All URLs must use HTTPS

**Error**: `Failed to load resource: net::ERR_BLOCKED_BY_CLIENT`
- **Cause**: Ad blocker or firewall is blocking the URL
- **Fix**: Temporarily disable ad blockers, or use embedded Add-In

## Step-by-Step: Test with Hello World

Let's verify Add-Ins work on your account:

### Test 1: External URL (Simplest)

```json
{
    "name": "External URL Test",
    "supportEmail": "test@example.com",
    "version": "1.0",
    "items": [{
        "path": "ActivityLink",
        "menuName": {
            "en": "Example Site"
        },
        "url": "https://www.example.com"
    }],
    "files": {}
}
```

**What should happen**: You'll see "Example Site" in the menu, clicking it shows example.com

**If this fails**: Your MyGeotab might have restrictions. Contact your admin.

### Test 2: Embedded HTML (Most Reliable)

Copy the entire contents of `examples/addins/hello-world-embedded.json` and paste it into MyGeotab.

**What should happen**: You'll see "Hello World" in the menu showing your username and database.

**If this fails**: Check browser console for JavaScript errors.

## Common Configuration Mistakes

### Mistake 1: Forgot to Refresh

**After installing an Add-In, you MUST refresh the browser page!**

1. Click Save in the Add-In config
2. **Refresh the page** (F5 or Ctrl+R)
3. Check the menu

### Mistake 2: Wrong Path

```json
{
    "path": "ActivityLink/"  // ✅ With slash = submenu
}
```
vs
```json
{
    "path": "ActivityLink"   // ✅ No slash = top level
}
```

Both are valid, but they appear in different places!

### Mistake 3: Missing Callback in initialize()

**WRONG**:
```javascript
function initialize(api, state, callback) {
    console.log("Started");
    // ❌ Forgot to call callback()!
}
```

**CORRECT**:
```javascript
function initialize(api, state, callback) {
    console.log("Started");
    callback();  // ✅ MUST call this!
}
```

### Mistake 4: Special Characters in JSON

When embedding HTML, certain characters must be escaped or minified:

**WRONG** (breaks JSON):
```json
{
    "files": {
        "page.html": "<html><body>It's working!</body></html>"
                                   ^^^ This apostrophe breaks JSON
    }
}
```

**CORRECT**:
```json
{
    "files": {
        "page.html": "<html><body>It is working!</body></html>"
    }
}
```

Or escape it:
```json
{
    "files": {
        "page.html": "<html><body>It\\'s working!</body></html>"
    }
}
```

## GitHub Pages Specific Issues

### Issue: 404 Error from GitHub Pages

**Cause**: GitHub Pages isn't enabled or hasn't finished deploying

**Fix**:
1. Go to your repo → Settings → Pages
2. Verify "Source" is set to "main" branch
3. Wait 2-3 minutes for deployment
4. Test the URL in a regular browser tab first
5. Once it loads in a regular tab, it will work in the Add-In

### Issue: Changes Not Appearing

**Cause**: GitHub Pages caching or browser caching

**Fix**:
1. Wait 2-3 minutes after pushing changes
2. Hard refresh MyGeotab (Ctrl+Shift+R or Cmd+Shift+R)
3. Clear browser cache if needed

## Debugging Checklist

When your Add-In doesn't work, go through this checklist:

- [ ] Did you save the Add-In configuration?
- [ ] Did you refresh the browser page after saving?
- [ ] Does the URL work in a regular browser tab?
- [ ] If using GitHub Pages, did you wait 2-3 minutes for deployment?
- [ ] Is the URL using HTTPS (not HTTP)?
- [ ] Did you check the browser console for errors (F12)?
- [ ] If embedded, do you have `initialize()`, `focus()`, and `blur()` functions?
- [ ] Does `initialize()` call the `callback()` function?
- [ ] Is your JSON valid? (Use https://jsonlint.com to check)

## Still Not Working?

### Try the Hello World Embedded Example

This is **guaranteed** to work if your account supports Add-Ins:

1. Copy the contents of `examples/addins/hello-world-embedded.json`
2. Go to MyGeotab → Administration → System → System Settings → Add-Ins
3. Click "New Add-In"
4. Switch to "Configuration" tab
5. Paste the JSON
6. Click "Save"
7. **Refresh the page**
8. Look for "Hello World" in the left menu

If this works, your Add-In infrastructure is fine. The issue is with your custom code or URL.

If this doesn't work, your account may have restrictions on Add-Ins. Contact your Geotab administrator.

## Getting Help

When asking for help, provide:

1. **The JSON config you're using** (remove any sensitive info)
2. **Browser console errors** (screenshot or copy-paste)
3. **What you expected vs. what happened**
4. **Which browser** (Chrome, Firefox, Edge, Safari)

### Ask Claude for Help

```text
My Geotab Add-In is showing "Issue Loading This Page" error.

Here's my configuration:
[paste your JSON]

Here's the browser console output:
[paste console errors]

What's wrong and how do I fix it?
```

## Quick Fixes Summary

| Problem | Quick Fix |
|---------|-----------|
| "Issue Loading This Page" | Use hello-world-embedded.json instead of external URL |
| Menu item doesn't appear | Refresh browser page after saving |
| Add-In loads but shows errors | Check browser console (F12) for JavaScript errors |
| GitHub Pages 404 | Wait 2-3 minutes, verify URL in regular browser tab |
| Changes not appearing | Hard refresh (Ctrl+Shift+R), clear cache |
| JSON validation errors | Check for unescaped quotes, use jsonlint.com |

---

**Most issues are either:**
1. Wrong URL (use embedded instead)
2. Forgot to refresh after saving
3. Missing `callback()` in `initialize()`

Start with the Hello World example and build from there!
