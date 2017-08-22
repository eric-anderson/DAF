/*
 ** DA Friends - content_common.js
 */

/*
 ** Create a DOM element
 */
function createElement(tagName, properties, parent, insertBeforeThis) {
    var element = document.createElement(tagName)
    if (parent) parent.insertBefore(element, insertBeforeThis);
    var p = Object.assign({}, properties);
    if (p.style) Object.assign(element.style, p.style);
    delete p.style;
    return Object.assign(element, p);
}

function removeNode(node) {
    if (node) node.parentNode.removeChild(node);
}

function hide(el) {
    if (el && el.style) el.style.display = 'none';
}

function show(el) {
    if (el && el.style) el.style.display = '';
}

function forceResize() {
    window.dispatchEvent(new Event('resize'));
}

function forceResizeLater(timeout = 1000) {
    setTimeout(forceResize, timeout);
}

function guiString(id) {}

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

// __elementsToRemove contains DOM nodes to remove or cleanup function to call at removal
var __elementsToRemove = [],
    __isActive = false,
    __exPrefs = {},
    // __prefsHandlers contains functions to be called when a preference is synced
    __prefsHandlers = {},
    // __msgHandlers contains functions to be called when a message is received
    __msgHandlers = {};


function DAF_setPreferenceHandler(name, callback) {
    __prefsHandlers[name] = callback;
}

function DAF_setMessageHandler(name, callback) {
    __msgHandlers[name] = callback;
}

/*
 ** Display a console message if debug is enabled
 */
function DAF_log(args) {
    if (__exPrefs.debug) console.log.apply(this, arguments);
}

/*
 ** Get a preference value
 */
function DAF_getValue(name) {
    return __isActive ? __exPrefs[name] : false;
}

function DAF_setValue(name, value) {
    if (!__isActive || name === undefined || name === null) return;
    try {
        DAF_log("DAF_setValue:", name, value);
        __exPrefs[name] = value;
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
}

function DAF_initialize(prefs, callback) {
    __exPrefs = Object.assign({
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
    DAF_removeLater(createElement('div', {
        id: 'DAF_remove',
        style: {
            display: 'none'
        },
        onclick: function() {
            console.log('Removed from', window.location.href);
            __isActive = false;
            __prefsHandlers = {};
            for (var el; el = __elementsToRemove.pop();) {
                try {
                    if (typeof el == 'function') el();
                    else el.parentNode.removeChild(el);
                } catch (e) {}
            }
        }
    }, document.body));
    __isActive = true;

    function setPref(name, value) {
        __exPrefs[name] = value;
        if (name in __prefsHandlers) __prefsHandlers[name](value);
    }

    chrome.runtime.sendMessage({
        cmd: 'getPrefs'
    }, function(response) {
        if (response.status == 'ok' && response.result) {
            Object.keys(response.result).forEach(name => {
                if (__exPrefs.hasOwnProperty(name)) __exPrefs[name] = response.result[name];
            });

            // track preference changes
            chrome.storage.onChanged.addListener(function(changes, area) {
                if (area != 'sync' || !__isActive) return;
                for (var name in changes)
                    if (__exPrefs.hasOwnProperty(name)) {
                        DAF_log(name, changes[name].oldValue, '->', changes[name].newValue);
                        setPref(name, changes[name].newValue);
                    }
            });
            DAF_setMessageHandler('sendValue', request => setPref(request.name, request.value));
            chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
                if (!__isActive) return;
                DAF_log("chrome.runtime.onMessage", request);
                if (request.cmd in __msgHandlers) __msgHandlers[request.cmd](request);
            });

            callback();
        }
    });
}

function DAF_removeLater(el) {
    __elementsToRemove.push(el);
    return el;
}

function DAF_injectStyle(url) {
    return DAF_removeLater(createElement('link', {
        type: 'text/css',
        rel: 'stylesheet',
        href: url
    }, document.head));
}

/*
 ** END
 *******************************************************************************/