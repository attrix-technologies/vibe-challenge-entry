# Geotab Vibe Coding: Hero to Hero 2.0

## My Vibe-Coding Journey

Impressed by your demo and inspired to use skills, claude.md and other resources to improve our typical add-in development workflow, I decided to use this contest as a means to stop our day-to-day routine of reusing the same generator-addin script to boilerplate new add-ins (with its problems and limitations), and instead use the full potential of AI to create a new add-in from scratch. For us, this always means external add-ins (no embedded source) - this always means multi-lingual, and since last year this also means leveraging React + Zenith. When we create a new add-in with the generator, there are 10-12 steps that we repeat every time to get it to our standards. Here, my first focus was to give Claude the context and tools to get to the same (or better) result faster, and through simple prompting. No knowing what the ultimate add-in entry was going to be in the contest, I knew it would be a submission of both the final add-in and the tools to streamline this process. The generator-addin, while somewhat outdated and burdened with the same old problems, still has solid advantages for local developement and testing, so I knew my process with Claude would also need similar capabilities to reduce overhead on the feedback loop.
So, as a first step, I ran `yo addin` inside examples/addins/ and created a new add-in called runner_demo. It would serve as a base for Claude's next steps. I added a few instructions in CLAUDE.md and in the ADDINS skills, then I started testing:

> Create a new add-in that shows me a summary of existing (enabled) rules with a sparkline next to its name that shows the number of exceptions trend over the last 4 weeks. Show me what it looks like in the runner when you're done. 

The result was surpringly good after just this simple step. It added a new add-in called rules_overview to the examples/addins/ folder, with all the required files and a working example. It was working as expected, but I wanted to work out some years-old kinks of the runner before I got further. I started by having Claude fix the runner's left menu.

> I found the boilerplate layout of the npm run dev runner environment to be quite broken in terms of UI (it was created when Geotab looked very different and under outdated assumptions). I would like to update the UI of the left nav menu and maybe the top bar, too. Right now the arrow toggle button is broken and the mygeotab icon is very small. I am talking about boilerplate in examples/addins/runner_demo/src/.dev. I don't need the full menu with menu entries (locally they will not be able to navigate anyway), but I would like the user to be able to toggle wide/folded menu so they can see their addin under the right widths and how it reacts to these changes. Here is the current mygeotab menu's outerhtml, but let me know what else you would need to fix it. First fix it in runner_demo, then once I validate, you can replicate under the rules_overview copy we made.

The left menu looked better, but for some reason it had decided to remove the group filter in the top header. I wanted it back:

> First of all, the group filter is important functionality for testing, I didn't ask to remove it. The outerHtml I copied was just from the left nav, the group filter is in the top header. Please restore the functionality. The UI/CSS of it was broken (and I was going to ask you to work on it next), but the functionality of it was fine. Second of all, now the left menu nav toggle works well, but the add-in context doesn't render nicely in either state (open or closed) - the add-in content is hidden behind the left nav and the top header. In MyGeotab, the add-in       content covers only the available content under the top header and right of the (open or closed) left nav menu. Please adjust making changes only to the .dev folder and without touching the CSS in the add-in's source jsx or css files, because it's a local runner UI problem and not a production add-in problem. 

> This works for the most part. The group filter selection updates the group filter component, but it doesn't actually change the state.getGroupFilter() value (it seems). Previously, I think it would just call focus() again from my add-in's lifecycle methods, and within it, the state.getGroupFilter() had updated value. Maybe the getGroupFilter() method works now (I couldn't test), but I don't think it triggers focus so really nothing happens when I change the groups.

> I am running runner_demo and it still does nothing when I apply the group filter changes in the add-in.

> I think the problem is elsewhere, it does call focus again, but it doesn't trigger a new call to getDevices (which uses the current groupfilter). I think it's something to change with react's useState usage here.

All good with the group filter and the menu now (better than before even). On to automating language development and testing. Everything should always be multi-lingal:

> You'll see in the top bar of the add-in runner that there is a language dropdown. This used to be practical to test our translations in older add-ins, but now with Zenith and the new translation files with state.translate, it doesn't work (it relied on localStorage properties that don't exist in production, whereas we usually depend on user.language. In Zenith, the components should be wrapped in a LanguageProvider that should be set from the user.language property. Make sure to add this to both Zenith examples as best practice, but also: 1. Update  the ADDINS skill to mention this for external add-ins, maybe update the Zenith docs if they don't already mention this, and update Claude.md to make sure you know to include this in all future external add-ins. What's important to me is that it can also work with the runner's language bar - so in production, use the current user's language, but in the local runner for   testing, proritize using the selected language. Make sure changing the language applies the changes dynamically. Zenith lang ref: https://developers.geotab.com/zenith-storybook/?path=/docs/application-language-and-date-format--docs

> Nicely done, now apply needed/missing translations to both external add-in examples. Make sure fr.json is populated with all required keys and values.

Framework in place, but needs translations for our initial 2 add-in examples.

> Now I have a good basis for a vanilla React/Zenith translated add-in that works in the runner, but I'd like you to fix the UI for the group filter. This is what it looks like when I'm picking groups, not very readable. Not very "Zenith"-y. [image1] In contrast, when I select to use the Advanced Group Filter, that has a nice Zenith experience: [image2] Please just make it more readable, increase z-index, add padding, background-color, etc. 

> Just fix the broken chevron icons and we're good.

All good now. From my initial assessment, now I'm able to create a new add-in with a simple prompt, and the add-in will have the structure I want, using React + Zenith, working in English and French (we can add more locales later), and with local testing tools that will allow me to verify as we iterate. Onto the actual Challenge entry...

## Authors

This repo was initially forked from [https://github.com/fhoffa/geotab-vibe-guide](https://github.com/fhoffa/geotab-vibe-guide) created by [Felipe Hoffa](https://www.linkedin.com/in/hoffa/). 
The changes to implement add-in runner functionality and produce a final entry for the Vibe Coding Challenge are by [LP Papillon](https://www.linkedin.com/in/lppapillon/).
