class ToggleHandler{
    /**
     * Toggles the development addin
     * allows user to see any processes that take place when the addin is blurred/focused
     */
    constructor(){
        this.focus = true;
        let displayToggle = document.getElementById('toggleBtn');
        let centerPane = document.querySelector('#lastWeekInFleet')
        displayToggle.addEventListener('click', () => {
            var name = Object.keys(geotab.addin)[0];
            var addin = name && geotab.addin[name];
            if(this.focus){
                displayToggle.innerHTML = 'Focus add-in';
                centerPane.className = " centerPane"
                if (addin && addin.blur) addin.blur();
            } else {
                displayToggle.innerHTML = 'Blur add-in';
                centerPane.className += " hidden"
                if (addin && addin.focus) addin.focus(global.api, global.state);
            }
            this.focus = !this.focus;
        });
    }

}

new ToggleHandler();
