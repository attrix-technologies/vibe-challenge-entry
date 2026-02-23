let body = document.getElementsByTagName('body')[0];
import icon from '../images/Font_Awesome_5_solid_chevron-left.svg';
import xIcon from '../images/close-round.svg';
import '../styles/styleGuide.css'
let loginExample = `

    <link rel="stylesheet" href="https://my.geotab.com/geotab/checkmate/main.css?skin=my_geotab">

<style>
    body {
        height: initial;
        width: initial;
    }

    body.nightMode {
        background: #515964;
    }

    body>div {
        margin: 1em;
    }

    button:focus {
        outline: none;
    }

    /* Content pane — fills space below header and right of nav */
    .centerPane {
        position: absolute;
        right: 0;
        bottom: 0;
        overflow: auto;
        box-sizing: border-box;
    }

    .dev-dialog {
        border: 1px solid rgba(0, 0, 0, 0.3);
        border-radius: 6px;
        box-shadow: 0 3px 7px rgba(0, 0, 0, 0.3);
    }

    .dev-dialog::backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.8);
    }

    .dev-header {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        padding: 0 12px;
        height: 40px;
        background-color: #f8f9fa;
        border-bottom: 1px solid #e0e0e0;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1500;
        box-sizing: border-box;
    }

    .geotabIcons_chevron {
        mask-image: url(${icon});
        mask-repeat: no-repeat;
        -webkit-mask-image: url(${icon});
        -webkit-mask-repeat: no-repeat;
        background-color: #25477b;
    }

    #group-toggle-button {
        appearance: none;
        background: none;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        cursor: pointer;
        padding: 0;
        color: #555;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 32px;
        height: 32px;
        transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
        margin: 0.5em 0;
    }

    #group-toggle-button:hover {
        background-color: #f0f0f0;
        border-color: #bbb;
    }

    #group-toggle-button svg {
        width: 16px;
        height: 16px;
        mask-image: url(${icon});
        mask-repeat: no-repeat;
        mask-size: contain;
        mask-position: center;
        -webkit-mask-image: url(${icon});
        -webkit-mask-repeat: no-repeat;
        -webkit-mask-size: contain;
        -webkit-mask-position: center;
        background-color: #555;
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        transform: rotate(-90deg);
    }

    #group-toggle-button.open svg {
        transform: rotate(90deg);
    }

    .group-wrapper {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        flex: 1;
        padding-left: 40px;
    }

    #group-selector {
        display: flex;
        position: relative;
        margin: 0.5em 0;
    }

    #group-input {
        border: none;
        text-decoration: none;
    }

    #group-input:focus {
        outline-style: none;
    }

    #group-input::placeholder {
        font-weight: bold;
        text-decoration: none;
    }

    #active-group {
        padding: 5px 10px;
        margin: 0.5em 0.5em 0.5em 0;
        font-weight: bold;
        color: #666;
    }

    .select-buttons {
        list-style-type: none;
        padding: 0;
    }

    .select-buttons li {
        margin: 3px 10px 0px 10px;
    }

    #group-dropdown {
        display: none;
        position: fixed;
        top: 40px;
        left: 40px;
        width: 300px;
        z-index: 99999;
        min-height: auto;
        max-height: 400px;
        overflow-y: auto;
        background-color: #ffffff !important;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        padding: 12px;
    }

    #filter-dropdown {
        background-color: transparent !important;
    }

    #group-dropdown ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    #group-dropdown li {
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 4px;
        transition: background-color 0.15s ease;
        line-height: 1.5;
        font-size: 14px;
        background-color: #ffffff !important;
    }

    #group-dropdown li:hover {
        background-color: #f3f4f6 !important;
    }

    #group-dropdown .organization-filter-popup__item {
        display: block;
        padding: 10px 12px;
        text-decoration: none;
        color: #374151;
        border-radius: 4px;
        transition: background-color 0.15s ease;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
        font-size: 14px;
        cursor: pointer;
    }

    #group-dropdown .organization-filter-popup__item:hover {
        background-color: #f3f4f6;
    }

    #group-dropdown .organization-filter-advanced-link {
        border-top: 1px solid #e5e7eb;
        margin-top: 8px;
        padding-top: 12px;
        font-weight: 500;
        color: #2563eb;
    }

    #group-dropdown .organization-filter-advanced-link:hover {
        background-color: #eff6ff;
    }

    #group-dropdown .groupFilterListElement,
    #group-dropdown .groupFilterFolderElement {
        padding: 6px 8px;
        margin: 2px 0;
    }

    #group-dropdown .groupFilterListElement label,
    #group-dropdown .groupFilterFolderElement label {
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        background-color: #ffffff !important;
    }

    #group-dropdown input[type="checkbox"] {
        margin-right: 8px;
        cursor: pointer;
        background-color: #ffffff !important;
    }

    #group-dropdown label {
        background-color: #ffffff !important;
    }

    #group-dropdown ul ul {
        margin-left: 20px;
        border-left: 1px solid #e5e7eb;
        padding-left: 8px;
    }

    /* Override Geotab button styles within dropdown */
    #group-dropdown .geotabButton,
    #group-dropdown .navButton {
        background-color: transparent !important;
    }

    #group-dropdown .geotabButton:hover,
    #group-dropdown .navButton:hover {
        background-color: #f3f4f6 !important;
    }

    #group-remove-all {
        padding: 5px 10px;
        display: none;
        border: none;
        width: 20px;
        height: 20px;
        cursor: pointer;
        margin: 0.5em 0.5em 0.5em 0;
    }

    #group-remove-all:focus {
        outline: none;
    }

    #group-remove-all svg {
        mask-image: url(${xIcon});
        mask-repeat: no-repeat;
        -webkit-mask-image: url(${xIcon});
        -webkit-mask-repeat: no-repeat;
        background-color: #666;
    }

    .dev-button {
        padding: 5px 12px;
        display: inline-block;
        background: #6c757d;
        border: none;
        color: #fff;
        cursor: pointer;
        font-weight: 500;
        font-size: 13px;
        border-radius: 4px;
        text-decoration: none;
        line-height: 1.5;
        transition: background-color 0.15s ease;
    }

    .dev-button:hover {
        background-color: #5a6268;
    }

    .dev-button:active {
        background-color: #495057;
    }

    .dev-form {
        flex-direction: column;
        flex-wrap: wrap;
        justify-content: flex-end;
        display: flex;
    }

    .dev-form label {
        display: none;
    }

    .dev-form input,
    .dev-form select {
        border-radius: 0.5em;
        padding: 0.5em;
    }

    .dev-form .line {
        display: block;
        margin: 0.5em 0;
    }

    </style>
    <header class="dev-header">

        <div id="group-wrapper" class="group-wrapper">
            <div id="group-selector" class="geotabFormEditField noTranslate">
                <input type="text" id="group-input" placeholder="Search for Groups">
            </div>
            <button id="group-toggle-button" class="dev-button group-toggle-button">
                <svg class="svgIcon geotabIcons_chevron" style="height: 15px; width: 15px;"></svg>
            </button>
            <div id="active-group">
                Active Groups: All
                </div>
            <button id="group-remove-all">
                <svg class="svgIcon" style="height: 15px; width: 15px"></svg>
            </button>
            <div id="group-dropdown" class="geotabPrimaryFill">
                <button id="open-filter-button" class="geo-form organization-filter-popup__item organization-filter-advanced-link">
                    <span class="organization-filter-advanced-link__label">Advanced group filter</span>
                </button>
                <div id="filter-dropdown" class="geotabPrimaryFill"></div>
            </div>
        </div>
        <div id="languages-target"></div>

        <a id="toggleBtn" class="dev-button">Blur add-in</a>
        <a id="logoutBtn" class="dev-button">Logout</a>
    </header>

    <dialog id="loginDialog" class="dev-dialog">
        <form class="dev-form">
            <div class="line">
                <label for="email">Email</label>
                <input type="text" id="email" placeholder="Email">
            </div>
            <div class="line">
                <label for="password">Password</label>
                <input type="password" id="password" placeholder="Password">
            </div>
            <div class="line">
                <label for="server">Server</label>
                <input type="text" id="server" placeholder="Server URL (my.geotab.com)">
            </div>
            <div class="line">
                <label for="database">Database</label>
                <input type="text" id="database" placeholder="Database">
            </div>
            <div class="line error" id="loginError" style="display: none; color: red">
                Invalid User or Password
            </div>
            <div class="line">
                <a href="" id="loginBtn" class="dev-button">Login</a>
            </div>
        </form>
    </dialog>
    <dialog id="deviceDialog" class="dev-dialog">
        <form class="dev-form">
            <div class="line">
                <label for="devices">Device</label>
                <select id="devices"></select>
            </div>
            <div class="line">
                <a href="" id="okBtn" class="dev-button">OK</a>
            </div>
        </form>
    </dialog>
`;
body.innerHTML = loginExample + body.innerHTML;
