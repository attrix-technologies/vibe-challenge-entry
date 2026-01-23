// Minimal test mimicking Heat Map structure
"use strict";

// Register under BOTH possible names based on filename
var addinImplementation = function() {
    console.log('minimal-test Add-In loading...');

    return {
        initialize: function(api, state, callback) {
            console.log('🎉🎉🎉 initialize() called!');

            document.body.innerHTML = '<h1>SUCCESS!</h1><pre id="output"></pre>';
            var output = document.getElementById('output');

            output.textContent = 'Initialize called!\n';

            if (api) {
                api.getSession(function(cred) {
                    output.textContent += 'User: ' + cred.userName + '\n';
                    output.textContent += 'Database: ' + cred.database + '\n';
                });

                api.call('Get', { typeName: 'Device' }, function(devices) {
                    output.textContent += 'Vehicles: ' + devices.length + '\n';
                });
            }

            callback();
        },

        focus: function(api, state) {
            console.log('focus() called');
        }
    };
};

// Register under multiple possible names
geotab.addin.minimaltest = addinImplementation();
geotab.addin['minimal-test'] = addinImplementation();

console.log('Registered as: minimaltest and minimal-test');
