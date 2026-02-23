require('./navbar'); // Inject nav HTML into the page

// Use event delegation on document so the handler survives
// body.innerHTML replacements by other .dev modules
// (e.g. advancedGroupFilter.js rebuilds body.innerHTML after this runs).
let expanded = true;

document.addEventListener('click', (e) => {
    const toggle = e.target.closest('#menuToggle');
    if (!toggle) return;

    expanded = !expanded;
    const nav = document.getElementById('menuId');
    if (nav) {
        nav.classList.toggle('menuCollapsed', !expanded);
    }
    toggle.setAttribute('aria-expanded', String(expanded));

    const contentPane = document.querySelector('.centerPane');
    if (contentPane) {
        contentPane.style.left = expanded ? '250px' : '52px';
    }
});
