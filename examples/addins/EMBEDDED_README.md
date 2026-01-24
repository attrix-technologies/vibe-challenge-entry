# Embedded Add-In Example

This example shows how to create a Geotab Add-In **without any external hosting** - no GitHub Pages, no HTTPS server required!

## What's Included

**embedded-source.html**
- Readable, development version
- All HTML, CSS, and JavaScript in one file
- Use this to develop and test your add-in

**embedded-config.json**
- Production version ready to paste into MyGeotab
- Code is minified and embedded in the `files` property
- Quotes are properly escaped for JSON
- Copy this entire file content

## How to Use

### Quick Start (2 minutes)

1. Open `embedded-config.json`
2. Copy the entire file contents
3. In MyGeotab, go to: **Administration → System → System Settings → Add-Ins**
4. Click **"New Add-In"**
5. Click the **"Configuration"** tab
6. Paste the JSON
7. Click **"Save"**
8. Refresh MyGeotab (`Ctrl+Shift+R`)
9. Look for **"Embedded Fleet Stats"** in the left menu

**That's it!** No GitHub, no hosting, no waiting.

## What It Does

This add-in demonstrates:
- ✅ Full MyGeotab API access (gets vehicle count)
- ✅ User session information (username, database)
- ✅ All three lifecycle methods (initialize, focus, blur)
- ✅ Error handling
- ✅ Modern styling with CSS

## Structure Explanation

```json
{
  "name": "Add-In name",
  "items": [{
    "url": "embedded-fleet.html",
    "path": "ActivityLink",
    "menuName": {
      "en": "Fleet Stats"
    }
  }],
  "files": {
    "embedded-fleet.html": "<!DOCTYPE html><html><head><style>CSS goes here inline</style></head><body><h1>My Add-In</h1><script>JavaScript goes here inline</script></body></html>"
  }
}
```

**Critical Points:**
- Use `"url": "filename.html"` in items (NOT `"page"`)
- Remove trailing slash from path: `"ActivityLink"` not `"ActivityLink/"`
- **All CSS and JavaScript MUST be inlined** using `<style>` and `<script>` tags
- **Cannot use external file references** like `<script src="app.js">` - causes 404 errors
- Everything (HTML, CSS, JS) must be in a single HTML string in the `files` object

**Why inline everything?**
When you use `<script src='app.js'>`, MyGeotab tries to load it as an external URL, which doesn't exist. The `files` object doesn't create a virtual file system - it only stores the HTML content that gets rendered directly.

## Developing Your Own

### Method 1: Modify embedded-source.html

1. Edit `embedded-source.html` with your changes
2. Test it by opening in browser (won't have API access locally)
3. When ready, convert to JSON:
   - Separate HTML, CSS, JS
   - Minify each part (remove whitespace, newlines)
   - Escape quotes: `"` becomes `\"`
   - Put in the `files` structure

### Method 2: Use AI

Tell your AI assistant:

```
Using the geotab-addins skill, create an embedded Geotab Add-In that shows:
- [describe your features]

Use the embedded format with the files property - no external hosting.
Give me the complete JSON to paste into MyGeotab.
```

The AI will generate the properly formatted embedded JSON for you.

## When to Use Embedded vs External

**Use Embedded When:**
- Quick prototypes and testing
- Simple add-ins that won't change frequently
- Sharing examples with others (just share JSON)
- No access to hosting or GitHub
- Educational demonstrations

**Use External Hosting When:**
- Active development (easier to debug)
- Frequent updates needed
- Large add-ins with many files
- Team collaboration
- Version control important

## Common Issues

**"Issue Loading This Page" or 404 errors for app.js/styles.css**
- This means you're using external file references: `<script src='app.js'>`
- **Fix:** Inline everything using `<script>` and `<style>` tags
- The `files` object doesn't create a virtual file system
- Example:
  ```html
  <!-- ❌ Wrong - causes 404 -->
  <script src='app.js'></script>

  <!-- ✅ Correct - inline -->
  <script>geotab.addin['myapp']=function(){...};</script>
  ```

**"The Add-In must have at least one custom page or button"**
- Your `items` array is empty: `"items": []`
- You MUST have at least one item with `url` property
- Example fix:
  ```json
  "items": [{
    "url": "mypage.html",
    "path": "ActivityLink",
    "menuName": {"en": "My Page"}
  }]
  ```

**Add-In doesn't appear in menu?**
- Use `"url"` not `"page"` in items array
- Remove trailing slash: `"path": "ActivityLink"` not `"ActivityLink/"`
- Make sure you clicked "Save"
- Hard refresh: `Ctrl+Shift+R`
- Check browser console (F12) for errors

**JSON is invalid?**
- Make sure all quotes are properly escaped
- Use a JSON validator: https://jsonlint.com
- Common issue: unescaped `"` characters
- Use single quotes for HTML attributes to avoid escaping: `<div class='card'>`

**API not working?**
- Embedded add-ins have FULL API access
- Same as external add-ins
- Check that you're calling `callback()` in initialize

## Learn More

- See [guides/GEOTAB_ADDINS.md](../../guides/GEOTAB_ADDINS.md) for the full guide
- See [skills/geotab-addins/SKILL.md](../../skills/geotab-addins/SKILL.md) for technical details
- Official docs: https://developers.geotab.com/myGeotab/addIns/developingAddIns/
