/*
 ** DA Friends - content_common.js
 */

/*
 ** Create a DOM element
 */
function createElement(tagName, properties, parent, insertBeforeThis) {
    var element = document.createElement(tagName);
    if (parent) parent.insertBefore(element, insertBeforeThis);
    var p = Object.assign({}, properties);
    if (p.style) Object.assign(element.style, p.style);
    delete p.style;
    return Object.assign(element, p);
}

function removeNode(node) {
    if (node) node.parentNode.removeChild(node);
}

function setDisplayNone(el) {
    if (el && el.style) el.style.display = 'none';
}

function setDisplayDefault(el) {
    if (el && el.style) el.style.display = '';
}

function forceResize() {
    window.dispatchEvent(new Event('resize'));
}

function forceResizeLater(timeout = 1000) {
    setTimeout(forceResize, timeout);
}

/*
 ** Get a GUI string
 */
function guiString(message, subs = null) {
    return chrome.i18n.getMessage(message, subs);
}

/*
 ** Apply a function over an array-like of elements (recursively)
 */
function iterate(el, fn) {
    if (!el) return;
    if (typeof el.length != 'number') return fn(el);
    for (var i = 0, len = el.length; i < len; i++) {
        iterate(el[i], fn);
    }
}

var DAF = (function() {
    var isActive = false,
        // elementsToRemove contains DOM nodes to remove or cleanup function to call at removal
        elementsToRemove = [],
        exPrefs = {},
        // prefsHandlers contains functions to be called when a preference is synced
        prefsHandlers = {},
        // msgHandlers contains functions to be called when a message is received
        msgHandlers = {},
        DAF = {};
    return Object.assign(DAF, {
        removeLater: function(el) {
            elementsToRemove.push(el);
            return el;
        },
        injectStyle: function(url) {
            return DAF.removeLater(createElement('link', {
                type: 'text/css',
                rel: 'stylesheet',
                href: url
            }, document.head));
        },
        setPreferenceHandler: function(name, callback) {
            prefsHandlers[name] = callback;
        },
        setMessageHandler: function(name, callback) {
            msgHandlers[name] = callback;
        },
        /*
         ** Display a console message if debug is enabled
         */
        log: function() {
            if (exPrefs.debug) console.log.apply(this, arguments);
        },
        /*
         ** Get a preference value
         */
        getValue: function(name) {
            return isActive ? exPrefs[name] : false;
        },
        callPrefHandler: function(name) {
            if (isActive && name in prefsHandlers) prefsHandlers[name](exPrefs[name]);
        },
        setValue: function(name, value) {
            if (!isActive || name === undefined || name === null) return;
            try {
                DAF.log("DAF.setValue:", name, value);
                exPrefs[name] = value;
                if (name.charAt(0) == '@') {
                    // send pseudo-preferences through background page
                    chrome.runtime.sendMessage({
                        cmd: 'sendValue',
                        name: name,
                        value: value
                    });
                } else {
                    var obj = {};
                    obj[name] = value;
                    chrome.storage.sync.set(obj);
                }
            } catch (e) {
                console.log("Something dodgy going on here, but what?", e);
            }
        },
        initialize: function(prefs, callback) {
            exPrefs = Object.assign({
                debug: false
            }, prefs);

            // This section will take care of repeated injections of the code (useful for development)
            // Call the previous remove handler
            var dr = document.getElementById('DAF_remove');
            if (dr) {
                try {
                    dr.click();
                } catch (e) {}
                try {
                    removeNode(dr);
                } catch (e) {}
                dr = null;
            }

            // Set our remove handler
            DAF.removeLater(createElement('div', {
                id: 'DAF_remove',
                style: {
                    display: 'none'
                },
                onclick: function() {
                    console.log('Removed from', window.location.href);
                    isActive = false;
                    prefsHandlers = {};
                    for (var el; el = elementsToRemove.pop();) {
                        try {
                            if (typeof el == 'function') el();
                            else el.parentNode.removeChild(el);
                        } catch (e) {}
                    }
                }
            }, document.body));
            isActive = true;

            function setPref(name, value) {
                exPrefs[name] = value;
                DAF.callPrefHandler(name);
            }

            chrome.runtime.sendMessage({
                cmd: 'getPrefs'
            }, function(response) {
                if (response.status == 'ok' && response.result) {
                    Object.keys(response.result).forEach(name => {
                        if (exPrefs.hasOwnProperty(name)) exPrefs[name] = response.result[name];
                    });

                    // track preference changes
                    chrome.storage.onChanged.addListener(function(changes, area) {
                        if (area != 'sync' || !isActive) return;
                        for (var name in changes)
                            if (exPrefs.hasOwnProperty(name)) {
                                DAF.log(name, changes[name].oldValue, '->', changes[name].newValue);
                                setPref(name, changes[name].newValue);
                            }
                    });
                    DAF.setMessageHandler('sendValue', request => setPref(request.name, request.value));
                    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
                        if (!isActive) return;
                        DAF.log("chrome.runtime.onMessage", request);
                        if (request.cmd in msgHandlers) msgHandlers[request.cmd](request);
                    });

                    callback();
                }
            });
        }
    });
})();
/*
 ** END
 *******************************************************************************/