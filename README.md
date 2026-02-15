# Geotab Vibe Coding: Hero to Hero 2.0

## My Vibe-Coding Journey

> Create a new add-in that shows me a summary of existing (enabled) rules with a sparkline next to its name that shows the number of exceptions trend over the last 4 weeks. Show me what it looks like in the runner when you're done. 

> I found the boilerplate layout of the npm run dev runner environment to be quite broken in terms of UI (it was created when Geotab looked very different and under outdated assumptions). I would like to update the UI of the left nav menu and maybe the top bar, too. Right now the arrow toggle button is broken and the mygeotab icon is very small. I am talking about boilerplate in examples/addins/runner_demo/src/.dev. I don't need the full menu with menu entries (locally they will not be able to navigate anyway), but I would like the user to be able to toggle wide/folded menu so they can see their addin under the right widths and how it reacts to these changes. Here is the current mygeotab menu's outerhtml, but let me know what else you would need to fix it. First fix it in runner_demo, then once I validate, you can replicate under the rules_overview copy we made.

> First of all, the group filter is important functionality for testing, I didn't ask to remove it. The outerHtml I copied was just from the left nav, the group filter is in the top header. Please restore the functionality. The UI/CSS of it was broken (and I was going to ask you to work on it next), but the functionality of it was fine. Second of all, now the left menu nav toggle works well, but the add-in context doesn't render nicely in either state (open or closed) - the add-in content is hidden behind the left nav and the top header. In MyGeotab, the add-in       content covers only the available content under the top header and right of the (open or closed) left nav menu. Please adjust making changes only to the .dev folder and without touching the CSS in the add-in's source jsx or css files, because it's a local runner UI problem and not a production add-in problem. 

> This works for the most part. The group filter selection updates the group filter component, but it doesn't actually change the state.getGroupFilter() value (it seems). Previously, I think it would just call focus() again from my add-in's lifecycle methods, and within it, the state.getGroupFilter() had updated value. Maybe the getGroupFilter() method works now (I couldn't test), but I don't think it triggers focus so really nothing happens when I change the groups.

> I am running runner_demo and it still does nothing when I apply the group filter changes in the add-in.

> I think the problem is elsewhere, it does call focus again, but it doesn't trigger a new call to getDevices (which uses the current groupfilter). I think it's something to change with react's useState usage here.

## Authors

This repo was initially forked from [https://github.com/fhoffa/geotab-vibe-guide](https://github.com/fhoffa/geotab-vibe-guide) created by [Felipe Hoffa](https://www.linkedin.com/in/hoffa/). 
The changes to implement add-in runner functionality and produce a final entry for the Vibe Coding Challenge are by [LP Papillon](https://www.linkedin.com/in/lppapillon/).
