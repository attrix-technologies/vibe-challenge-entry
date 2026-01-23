# GitHub Pages Add-In Test Instructions

Follow these steps to test if GitHub Pages hosting actually works for Geotab Add-Ins.

## Step 1: Enable GitHub Pages

1. Go to https://github.com/fhoffa/geotab-vibe-guide
2. Click **Settings** (top right)
3. Click **Pages** in the left sidebar
4. Under "Source":
   - Select **Deploy from a branch**
   - Branch: **main** (or whatever your default branch is)
   - Folder: **/ (root)**
5. Click **Save**
6. **Wait 1-2 minutes** for GitHub to deploy

GitHub will show you a message like:
```
Your site is live at https://fhoffa.github.io/geotab-vibe-guide/
```

## Step 2: Verify the Page Works

1. Open a new browser tab
2. Go to: https://fhoffa.github.io/geotab-vibe-guide/addin-test.html
3. You should see a purple gradient page with "GitHub Pages Add-In Test"
4. If you see it, GitHub Pages is working! ✅
5. If you get a 404, wait another minute and try again

## Step 3: Install Add-In in MyGeotab

1. Copy the entire contents of `addin-test-config.json`:

```json
{
    "name": "GitHubPagesTest",
    "supportEmail": "test@example.com",
    "version": "1.0",
    "items": [{
        "url": "https://fhoffa.github.io/geotab-vibe-guide/addin-test.html",
        "path": "ActivityLink",
        "menuName": {
            "en": "GitHub Test"
        }
    }]
}
```

2. Go to MyGeotab → **Administration → System → System Settings → Add-Ins**
3. Click **"New Add-In"**
4. Switch to **"Configuration"** tab
5. Paste the JSON
6. Click **"Save"**
7. **Refresh your browser page** (important!)

## Step 4: Test the Add-In

1. Look for **"GitHub Test"** in the left navigation menu (after Activity)
2. Click it
3. You should see the purple page load

**Check the debug log at the bottom. You should see:**

✅ Expected (SUCCESS):
```
[time] 📄 Page loaded from GitHub Pages
[time] 🔍 Waiting for MyGeotab to call initialize()...
[time] ✅ initialize() called!
[time] API object: EXISTS
[time] Calling api.getSession()...
[time] ✅ Got session: your.email@example.com
[time] Calling api.call("Get", {typeName: "Device"})...
[time] ✅ Loaded XX vehicles
```

❌ If you see this (FAILURE):
```
[time] 📄 Page loaded from GitHub Pages
[time] 🔍 Waiting for MyGeotab to call initialize()...
(nothing else - initialize never called)
```

## Step 5: Report Results

Tell me:
1. ✅ Did GitHub Pages deploy? (Could you access the page in a regular browser?)
2. ✅ Did the Add-In appear in MyGeotab menu?
3. ✅ Did initialize() get called? (Check the debug log)
4. ✅ Did you see your username and vehicle count?

**Copy the entire debug log and send it to me!**

## Troubleshooting

**404 Error on GitHub Pages URL**
- Wait 2-3 minutes after enabling GitHub Pages
- Make sure the branch is "main" (or your default branch name)
- Verify the file `addin-test.html` is in the root of the repo

**Add-In doesn't appear in menu**
- Did you refresh the browser after saving?
- Check browser console for errors (F12)

**Page loads but debug log is empty**
- Open browser console (F12) and look for errors
- Verify the page is actually loading from GitHub (check URL bar)
