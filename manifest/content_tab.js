/*
 ** DA Friends - content_tab.js
 */

// This section will take care of repeated injections of the code (useful for development)
// Call the previous remove handler
var dr = document.getElementById('DAF_remove');
if (dr) {
    dr.click();
}

// elementsToRemove contains DOM nodes to remove or cleanup function to call at removal
var elementsToRemove = [];
var wasRemoved = false;
// Set our remove handler
elementsToRemove.push(createElement('div', {
    id: 'DAF_remove',
    style: {
        display: 'none'
    },
    onclick: function() {
        console.log('Removed from', window.location.href);
        wasRemoved = true;
        for (var el; el = elementsToRemove.pop();) {
            try {
                if (typeof el == 'function') {
                    el();
                } else {
                    el.parentNode.removeChild(el);
                }
            } catch (e) {}
        }
    }
}, document.body));

/*
 ** Create a DOM element
 */
function createElement(tagName, properties, parent, insertBeforeThis) {
    var element = assignElement(document.createElement(tagName), properties);
    if (parent) {
        parent.insertBefore(element, insertBeforeThis);
    }
    return element;
}

function assignElement(element, properties) {
    var p = Object.assign({}, properties);
    if (p.style) {
        Object.assign(element.style, p.style);
        delete p.style;
    }
    return Object.assign(element, p);
}

// Before we do anything, we need the current extension preferences from the background
var exPrefs = {
    toolbarStyle: 2,
    autoClick: false,
    autoPortal: false,
    fullWindow: false,
    // not a real preference, used to send GC table status from game window (content_da) to parent window (content_tab)
    gcTableStatus: '',
    gcTable: false
};
chrome.runtime.sendMessage({
    cmd: 'getPrefs'
}, function(response) {
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
chrome.storage.onChanged.addListener(function(changes, area) {
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
 ** START - InsertionQuery (https://github.com/naugtur/insertionQuery)
 */
var insertionQ = (function() {
    var sequence = 100,
        isAnimationSupported = false,
        animationstring = 'animationName',
        keyframeprefix = '',
        domPrefixes = 'Webkit Moz O ms Khtml'.split(' '),
        pfx = '',
        elm = document.createElement('div'),
        options = {
            strictlyNew: true,
            timeout: 20
        };

    if (elm.style.animationName) {
        isAnimationSupported = true;
    }

    if (isAnimationSupported === false) {
        for (var i = 0; i < domPrefixes.length; i++) {
            if (elm.style[domPrefixes[i] + 'AnimationName'] !== undefined) {
                pfx = domPrefixes[i];
                animationstring = pfx + 'AnimationName';
                keyframeprefix = '-' + pfx.toLowerCase() + '-';
                isAnimationSupported = true;
                break;
            }
        }
    }

    function listen(selector, callback) {
        var styleAnimation, animationName = 'insQ_' + (sequence++);

        var eventHandler = function(event) {
            if (event.animationName === animationName || event[animationstring] === animationName) {
                if (!isTagged(event.target)) {
                    callback(event.target);
                }
            }
        };

        styleAnimation = document.createElement('style');
        styleAnimation.innerHTML = '@' + keyframeprefix + 'keyframes ' + animationName + ' {  from {  outline: 1px solid transparent  } to {  outline: 0px solid transparent }  }' +
            "\n" + selector + ' { animation-duration: 0.001s; animation-name: ' + animationName + '; ' +
            keyframeprefix + 'animation-duration: 0.001s; ' + keyframeprefix + 'animation-name: ' + animationName + '; ' +
            ' } ';

        document.head.appendChild(styleAnimation);

        var bindAnimationLater = setTimeout(function() {
            document.addEventListener('animationstart', eventHandler, false);
            document.addEventListener('MSAnimationStart', eventHandler, false);
            document.addEventListener('webkitAnimationStart', eventHandler, false);
            //event support is not consistent with DOM prefixes
        }, options.timeout); //starts listening later to skip elements found on startup. this might need tweaking

        return {
            destroy: function() {
                clearTimeout(bindAnimationLater);
                if (styleAnimation) {
                    document.head.removeChild(styleAnimation);
                    styleAnimation = null;
                }
                document.removeEventListener('animationstart', eventHandler);
                document.removeEventListener('MSAnimationStart', eventHandler);
                document.removeEventListener('webkitAnimationStart', eventHandler);
            }
        };
    }

    function tag(el) {
        el.QinsQ = true; //bug in V8 causes memory leaks when weird characters are used as field names. I don't want to risk leaking DOM trees so the key is not '-+-' anymore
    }

    function isTagged(el) {
        return (options.strictlyNew && (el.QinsQ === true));
    }

    function topmostUntaggedParent(el) {
        if (isTagged(el.parentNode) || el.nodeName === 'BODY') {
            return el;
        } else {
            return topmostUntaggedParent(el.parentNode);
        }
    }

    function tagAll(e) {
        tag(e);
        e = e.firstChild;
        for (; e; e = e.nextSibling) {
            if (e !== undefined && e.nodeType === 1) {
                tagAll(e);
            }
        }
    }

    //aggregates multiple insertion events into a common parent
    function catchInsertions(selector, callback) {
        var insertions = [];
        //throttle summary
        var sumUp = (function() {
            var to;
            return function() {
                clearTimeout(to);
                to = setTimeout(function() {
                    insertions.forEach(tagAll);
                    callback(insertions);
                    insertions = [];
                }, 10);
            };
        })();

        return listen(selector, function(el) {
            if (isTagged(el)) {
                return;
            }
            tag(el);
            var myparent = topmostUntaggedParent(el);
            if (insertions.indexOf(myparent) < 0) {
                insertions.push(myparent);
            }
            sumUp();
        });
    }

    //insQ function
    var exports = function(selector) {
        if (isAnimationSupported && selector.match(/[^{}]/)) {

            if (options.strictlyNew) {
                tagAll(document.body); //prevents from catching things on show
            }
            return {
                every: function(callback) {
                    return listen(selector, callback);
                },
                summary: function(callback) {
                    return catchInsertions(selector, callback);
                }
            };
        } else {
            return false;
        }
    };

    //allows overriding defaults
    exports.config = function(opt) {
        for (var o in opt) {
            if (opt.hasOwnProperty(o)) {
                options[o] = opt[o];
            }
        }
    };

    return exports;
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = insertionQ;
}
// END - InsertionQuery (https://github.com/naugtur/insertionQuery)

/*
 ** Apply a function over an array-like of elements (recursively)
 */
function iterate(el, fn) {
    if (el)
        if (typeof el.length == 'number') {
            for (var i = el.length - 1; i >= 0; i--) {
                iterate(el[i], fn);
            }
        } else {
            fn(el);
        }
}

var container, autoClick_InsertionQ;

function getDefaultButtonId(id) {
    return 'DAF-btn_' + id;
}

function createButton(id, properties) {
    var p = Object.assign({
            href: '#'
        }, properties),
        onclick = p.onclick;
    p.onclick = function(event) {
        event.stopPropagation();
        event.preventDefault();
        if (onclick) {
            onclick.apply(this, arguments);
        }
    };
    if (!('id' in p)) p.id = getDefaultButtonId(id);
    var text = chrome.i18n.getMessage('btn_' + id);
    if ('text' in p) {
        text = p.text;
        delete p.text;
    }
    var b_prop = {
        innerText: text.substr(0, 1).toUpperCase()
    };
    if ('key' in p) {
        b_prop.innerText = p.key;
        delete p.key;
    }
    if ('icon' in p) {
        b_prop.innerText = '\xa0';
        b_prop.className = 'DAF-icon';
        b_prop.style = {
            backgroundImage: 'url(' + chrome.extension.getURL(typeof p.icon == 'string' ? p.icon : 'img/ico_' + id + '.png') + ')'
        };
        delete p.icon;
    }
    var a = createElement('a', p, container);
    createElement('b', b_prop, a);
    createElement('span', {
        innerText: text
    }, a);
    return a;
}

function createToggle(prefName, properties) {
    var p = Object.assign({}, properties);
    if (!('flag' in p)) p.flag = DAF_getValue(prefName);
    // default onclick handler
    if (!('onclick' in p)) {
        p.onclick = function() {
            var value = !DAF_getValue(prefName);
            DAF_setValue(prefName, value);
        };
    }
    p.className = 'DAF-s' + (p.flag ? '1' : '0');
    delete p.flag;
    var a = createButton(prefName, p);
    createElement('span', {
        className: 'DAF-st'
    }, a);
    // default preference handler
    prefsHandlers[prefName] = function(value) {
        a.className = 'DAF-s' + (value ? '1' : '0');
    };
    return a;
}

function getFullWindow() {
    return wasRemoved ? false : DAF_getValue('fullWindow');
}

function getAutoClick() {
    return wasRemoved ? false : DAF_getValue('autoClick');
}

/********************************************************************
 ** Vins Facebook Pop-up's Auto Click
 */
function prefsHandler_autoClick(value) {
    var btn = document.getElementById(getDefaultButtonId('autoClick'));
    if (btn) btn.className = 'DAF-s' + (value ? '1' : '0');
    if (value && !autoClick_InsertionQ) {
        console.log("insertionQ created");
        autoClick_InsertionQ = insertionQ('button.layerConfirm.uiOverlayButton[name=__CONFIRM__]').every(function(element) {
            var autoClick = getAutoClick();
            console.log("insertionQ", autoClick, element);
            if (autoClick) {
                var parent = element;
                while (parent.parentNode.tagName != 'BODY') {
                    parent = parent.parentNode;
                }
                parent.style.zIndex = -1;
                element.click();
            }
        });
        elementsToRemove.push(function() {
            console.log("insertionQ destroyed");
            if (autoClick_InsertionQ) autoClick_InsertionQ.destroy();
            autoClick_InsertionQ = null;
        });
    }
}

function hideInFullWindow(el) {
    if (el && el.style)
        el.style.display = getFullWindow() ? 'none' : '';
}

function initialize() {
    var isFacebook = false,
        isPortal = false;

    // Vins Portal auto login code was moved in content_portal_login.js and injected in background.js

    if (document.getElementById('skrollr-body')) { // portal.pixelfederation
        isPortal = true;
    } else if (document.getElementById('pagelet_bluebar')) { // main document (Facebook)
        isFacebook = true;
    } else {
        console.error("Site not detected");
        return;
    }

    console.log('Injecting content tab', window.location.href);

    /********************************************************************
     ** DAF toolbar
     */
    // Inject stylesheet
    var style = createElement('link', {
        type: 'text/css',
        rel: 'stylesheet',
        href: chrome.extension.getURL('manifest/css/content_tab.css')
    }, document.head);
    elementsToRemove.push(style);

    // Toolbar
    container = document.getElementById('DAF');
    if (container) container.parentNode.removeChild(container);
    container = createElement('div', {
        id: 'DAF',
        className: 'DAF-collapsed'
    }, document.body);
    elementsToRemove.push(container);
    prefsHandlers['toolbarStyle'] = function(value) {
        value = parseInt(value) || 2;
        if (value < 1 || value > 4) value = 2;
        exPrefs.toolbarStyle = value;
        container.style.display = value == 4 ? 'none' : '';
        container.className = ['', '', 'DAF-collapsed', 'DAF-collapsed-first', ''][value];
    };

    // About button
    var a = createButton('about', {
        icon: true,
        text: chrome.i18n.getMessage('extName'),
        onclick: function() {
            chrome.runtime.sendMessage({
                cmd: "show"
            });
        }
    });
    assignElement(a.firstChild.nextSibling, {
        style: {
            fontWeight: 'bold',
            backgroundColor: '#FF0'
        }
    });
    createElement('span', {
        innerText: chrome.i18n.getMessage('extTitle')
    }, a);

    /********************************************************************
     ** Vins FullWindow
     */
    var originalHeight, onResize, onFullWindow;
    createToggle('fullWindow', {
        key: 'F'
    });
    if (isFacebook) {
        onResize = function(fullWindow) {
            var iframe = document.getElementById('iframe_canvas');
            if (originalHeight === undefined) originalHeight = iframe && iframe.style.height;
            if (iframe) iframe.style.height = fullWindow ? window.innerHeight + 'px' : originalHeight;
        };
        onFullWindow = function(fullWindow) {
            document.body.style.overflowY = fullWindow ? 'hidden' : ''; // remove vertical scrollbar
            iterate([document.getElementById('rightCol'), document.getElementById('pagelet_bluebar'), document.getElementById('pagelet_dock')], hideInFullWindow);
        };
    } else if (isPortal) {
        onResize = function(fullWindow) {
            var iframe = document.getElementsByClassName('game-iframe game-iframe--da')[0];
            if (iframe) iframe.style.height = fullWindow ? window.innerHeight + 'px' : '';
        };
        onFullWindow = function(fullWindow) {
            document.body.style.overflowY = fullWindow ? 'hidden' : ''; // remove vertical scrollbar
            iterate([document.getElementById('header'), document.getElementById('footer')], hideInFullWindow);
        };
    }
    var fnResize = function() {
        var fullWindow = getFullWindow();
        onResize(fullWindow);
    }
    elementsToRemove.push(function() {
        window.removeEventListener('resize', fnResize);
        fnResize();
    });
    window.addEventListener('resize', fnResize);
    var fnFullWindow = function(value) {
        var fullWindow = getFullWindow();
        console.log('FullWindow', fullWindow);
        var btn = document.getElementById(getDefaultButtonId('fullWindow'));
        if (btn) btn.className = 'DAF-s' + (fullWindow ? '1' : '0');
        onFullWindow(fullWindow);
        onResize(fullWindow);
    };
    elementsToRemove.push(fnFullWindow);
    prefsHandlers['fullWindow'] = fnFullWindow;

    // Eric's GC Table
    var a = createToggle('gcTable', {
        icon: true
    });
    var gcTableStatus = createElement('span', {
        style: {
            display: 'none'
        }
    }, a);
    var gcTableStatuses = {
        'error': {
            style: {
                display: '',
                backgroundColor: '#F00',
                color: '#FFF'
            },
            innerText: chrome.i18n.getMessage('gcTable_error')
        },
        'collected': {
            style: {
                display: '',
                backgroundColor: '#0FF',
                color: '#000'
            },
            innerText: chrome.i18n.getMessage('gcTable_collected')
        },
        'default': {
            style: {
                display: 'none'
            },
            innerText: ''
        }
    };
    prefsHandlers['gcTableStatus'] = function(value) {
        console.log("Received status", value);
        assignElement(gcTableStatus, gcTableStatuses[value in gcTableStatuses ? value : 'default']);
    };

    // Vins Facebook Pop-up's Auto Click
    createToggle('autoClick', {
        key: 'A'
    });
    prefsHandlers['autoClick'] = prefsHandler_autoClick;

    // Reload button
    createButton('reloadGame', {
        key: 'R',
        onclick: function() {
            chrome.runtime.sendMessage({
                cmd: "reload"
            });
        }
    });

    // Perform first activation
    ['toolbarStyle', 'fullWindow', 'autoClick', 'gcTable'].forEach(prefName => {
        if (prefName in prefsHandlers)
            prefsHandlers[prefName](DAF_getValue(prefName, false));
    });

    if (onFullWindow) window.dispatchEvent(new Event('resize'));
}
/*
 ** END
 *******************************************************************************/