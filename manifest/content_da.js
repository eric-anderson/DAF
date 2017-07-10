/*
 ** DA Friends - content_da.js
 */

// This section will take care of repeated injections of the code (useful for development)
// Call the previous remove handler
var dr = document.getElementById('DAF_remove');
if (dr) { dr.click(); }

// elementsToRemove contains DOM nodes to remove or cleanup function to call at removal
var elementsToRemove = [];
var wasRemoved = false;
// Set our remove handler
elementsToRemove.push(createElement('div',
    {
        id: 'DAF_remove',
        style: { display: 'none' }, 
        onclick: function() {
            console.log('Removed from', window.location.href);
            wasRemoved = true;
            for(var el; el = elementsToRemove.pop(); ) {
                try {
                    if (typeof el == 'function') { el(); }
                    else { el.parentNode.removeChild(el); }
                } catch (e) {}
            }
        }
    }, document.body));

/*
 ** Create a DOM element
 */
function createElement(tagName, properties, parent, insertBeforeThis) {
    var e = document.createElement(tagName);
    if(parent) { parent.insertBefore(e, insertBeforeThis); }
    var p = Object.assign({}, properties);
    if(p.style) { Object.assign(e.style, p.style); delete p.style; }
    return Object.assign(e, p);
}

// Before we do anything, we need the current extension preferences from the background
var exPrefs = {
    fullWindow: false
};
chrome.runtime.sendMessage({
    cmd: 'getPrefs'
}, function (response) {
    if (response.status == 'ok' && response.result) {
        Object.keys(response.result).forEach(name => {
            if (exPrefs.hasOwnProperty(name)) exPrefs[name] = response.result[name];
        });
        initialize();
    }
});

/*
 ** Let's do our thing - set-up preference handlers etc.
 */
// prefsHandlers contains functions to be called when a preference is synced
var prefsHandlers = {};
chrome.storage.onChanged.addListener(function (changes, area) {
    if (area != 'sync' || wasRemoved) return;
    for (var key in changes) {
        if (exPrefs.hasOwnProperty(key)) {
            exPrefs[key] = changes[key].newValue;
            console.log(key, changes[key].oldValue, '->', changes[key].newValue);
            if (key in prefsHandlers) prefsHandlers[key](exPrefs[key]);
        }
    }
});

/*
 ** Get a preference value
 */
 function DAF_getValue(name, defaultValue) {
    var value = exPrefs[name];
    return (value === undefined || value === null) ? defaultValue : value;
}

/*
 ** Set a preference value
 */
function DAF_setValue(name, value) {
    if (wasRemoved || name === undefined || name === null) return;
    try {
        console.log("DAF_setValue:", name, value);
        var obj = {};
        obj[name] = exPrefs[name] = value;
        chrome.storage.sync.set(obj);
    } catch (e) {
        console.log("Something dodgy going on here, but what?", e);
    }
}

/*
 ** Apply a function over an array-like of elements (recursively)
 */
function iterate(el, fn) {
    if (el)
        if (typeof el.length == "number") {
            for (var i = el.length - 1; i >= 0; i--) {
                iterate(el[i], fn);
            }
        } else {
            fn(el);
        }
}

function getFullWindow() { return wasRemoved ? false : DAF_getValue('fullWindow'); }
function hideInFullWindow(el) {
    if (el && el.style)
        el.style.display = getFullWindow() ? "none" : "";
}

function initialize() {
    var miner = document.getElementById('miner');
    if (!miner) {
        console.error("Site not detected");
        return;
    }

    console.log('Injecting content da', window.location.href);

    var originalHeight = miner.height;
    var onResize = function () {
        var fullWindow = getFullWindow();
        var gcDivHeight = 0;
        var gcDiv = document.getElementById('godChildrenDiv');
        if (gcDiv) {
            gcDivHeight = gcDiv.offsetHeight;
            gcDiv.style.width = fullWindow ? window.innerWidth : '100%';
        }
        miner.height = fullWindow ? window.innerHeight - gcDivHeight : originalHeight;
        miner.width = fullWindow  ? window.innerWidth : "100%";
    };

    var onFullWindow = function(value) {
        var fullWindow = getFullWindow();
        console.log('FullWindow', fullWindow);
        // display news in a floating box
        iterate(document.getElementsByClassName('news'), function (el) {
            if (el && el.style) {
                var options = {
                    position: "fixed",
                    top: "0px",
                    left: "64px",
                    margin: "0px",
                    padding: "0px"
                };
                for (var name in options) {
                    el.style[name] = fullWindow ? options[name] : '';
                }
            }
        });
        iterate([
            document.getElementsByClassName('header-menu'), document.getElementsByClassName('cp_banner bottom_banner'), 
            document.getElementById('bottom_news'), document.getElementById('footer'), document.getElementById('gems_banner')
        ], hideInFullWindow);
        document.body.style.overflowY = fullWindow ? 'hidden' : '';
        setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 1000);
    };
    
    if (onResize) {
        elementsToRemove.push(onResize);
        window.addEventListener("resize", onResize);
    }
    if (onFullWindow) {
        elementsToRemove.push(onFullWindow);
        prefsHandlers['fullWindow'] = onFullWindow;
    }

    // Perform first activation
    ['fullWindow'].forEach(prefName => {
        if (prefName in prefsHandlers)
            prefsHandlers[prefName](DAF_getValue(prefName, false));
    });
}
 /*
 ** END
 *******************************************************************************/