let body = document.getElementsByTagName('body')[0];
let navbar = `
<nav id="menuId" class="dev-nav" style="top: 40px;">
    <div class="dev-nav__header">
        <div class="dev-nav__logo" role="img" aria-label="MyGeotab"></div>
        <button class="dev-nav__toggle" id="menuToggle" aria-expanded="true" aria-label="Toggle Menu">
            <svg class="dev-nav__chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.59 18L19 16.59 14.42 12 19 7.41 17.59 6l-6 6z" fill="currentColor"/>
                <path d="M11 18l1.41-1.41L7.83 12l4.58-4.59L11 6l-6 6z" fill="currentColor"/>
            </svg>
        </button>
    </div>
</nav>`.trim();

body.innerHTML = navbar + body.innerHTML;
