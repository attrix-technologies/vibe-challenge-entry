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
    "page": "embedded-fleet",
    "path": "ActivityLink/",
    "menuName": {
      "en": "Fleet Stats"
    }
  }],
  "files": {
    "embedded-fleet.html": "HTML content as a string",
    "js": {
      "app.js": "JavaScript as a string",
      "helpers.js": "More JS files if needed"
    },
    "css": {
      "styles.css": "CSS as a string"
    }
  }
}
```

**Key Points:**
- `items[].page`: References the HTML file name without the `.html` extension
- The HTML file in `files` must match: `{page}.html`
- Example: `"page": "embedded-fleet"` → `"embedded-fleet.html"` in files
- `path`: Where the add-in appears in MyGeotab menu (usually "ActivityLink/")
- `menuName`: The text shown in the menu

The HTML file references JS/CSS files by name:
```html
<link rel='stylesheet' href='styles.css'>
<script src='app.js'></script>
```

MyGeotab automatically resolves these from the `files` object.

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

**"The Add-In must have at least one custom page or button"**
- This means your `items` array is empty: `"items": []`
- You MUST have at least one item that references your HTML file
- Example fix:
  ```json
  "items": [{
    "page": "mypage",
    "path": "ActivityLink/",
    "menuName": {"en": "My Page"}
  }]
  ```
- The `page` value must match the HTML filename without `.html`

**Add-In doesn't appear?**
- Make sure you clicked "Save"
- Hard refresh: `Ctrl+Shift+R`
- Check browser console (F12) for errors

**JSON is invalid?**
- Make sure all quotes are properly escaped
- Use a JSON validator: https://jsonlint.com
- Common issue: unescaped `"` characters

**API not working?**
- Embedded add-ins have FULL API access
- Same as external add-ins
- Check that you're calling `callback()` in initialize

## Learn More

- See [guides/GEOTAB_ADDINS.md](../../guides/GEOTAB_ADDINS.md) for the full guide
- See [skills/geotab-addins/SKILL.md](../../skills/geotab-addins/SKILL.md) for technical details
- Official docs: https://developers.geotab.com/myGeotab/addIns/developingAddIns/
