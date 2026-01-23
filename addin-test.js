// Geotab Add-In - API Test
// Must use geotab.addin.[addinname] pattern

console.log('addin-test.js v10.0 loading...');

// CRITICAL: Name must match the Add-In name in the config
// Config name: "API Test" -> becomes "apitest" (lowercase, no spaces)
geotab.addin.apitest = function() {
    let output = '';

    function log(msg) {
        output += msg + '\n';
        console.log(msg);
        try {
            document.getElementById('output').textContent = output;
        } catch(e) {
            // Ignore
        }
    }

    log('v10.0 - geotab.addin.apitest loading...');

    return {
        initialize: function(api, state, callback) {
            log('🎉🎉🎉 initialize() CALLED!!!');
            log('API: ' + (api ? 'EXISTS' : 'NULL'));

            if (api) {
                log('API type: ' + typeof api);

                api.getSession(function(cred) {
                    log('✅ SUCCESS! User: ' + cred.userName);
                    log('✅ Database: ' + cred.database);
                }, function(err) {
                    log('❌ Session error: ' + err);
                });

                api.call('Get', {
                    typeName: 'Device'
                }, function(devices) {
                    log('✅ Loaded ' + devices.length + ' vehicles!');
                }, function(err) {
                    log('❌ Device error: ' + err);
                });
            }

            callback();
        },

        focus: function(api, state) {
            log('FOCUS called, API: ' + (api ? 'YES' : 'NO'));
        },

        blur: function(api, state) {
            log('BLUR called');
        }
    };
}();

console.log('geotab.addin.apitest registered!');
