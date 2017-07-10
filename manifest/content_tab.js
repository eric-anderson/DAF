/*
 ** DA Friends - content_tab.js
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
    autoClick: false,
    autoPortal: false,
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
 ** START - InsertionQuery (https://github.com/naugtur/insertionQuery)
 */
var insertionQ = (function () {
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

        var eventHandler = function (event) {
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

        var bindAnimationLater = setTimeout(function () {
            document.addEventListener('animationstart', eventHandler, false);
            document.addEventListener('MSAnimationStart', eventHandler, false);
            document.addEventListener('webkitAnimationStart', eventHandler, false);
            //event support is not consistent with DOM prefixes
        }, options.timeout); //starts listening later to skip elements found on startup. this might need tweaking

        return {
            destroy: function () {
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
        var sumUp = (function () {
            var to;
            return function () {
                clearTimeout(to);
                to = setTimeout(function () {
                    insertions.forEach(tagAll);
                    callback(insertions);
                    insertions = [];
                }, 10);
            };
        })();

        return listen(selector, function (el) {
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
    var exports = function (selector) {
        if (isAnimationSupported && selector.match(/[^{}]/)) {

            if (options.strictlyNew) {
                tagAll(document.body); //prevents from catching things on show
            }
            return {
                every: function (callback) {
                    return listen(selector, callback);
                },
                summary: function (callback) {
                    return catchInsertions(selector, callback);
                }
            };
        } else {
            return false;
        }
    };

    //allows overriding defaults
    exports.config = function (opt) {
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

/*
 ** escape html and template functions
 */
var escapeHtml = (function() {
    var re = /[&<>'"]/g;
    var o = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    };
    return function(value) { return value.replace(re, c => o[c]); }
})();
function getTagFunction(fn) {
    return function(pieces) {
        var result = pieces[0];
        var substitutions = [].slice.call(arguments, 1);
        for (var i = 0; i < substitutions.length; ++i) {
            result += fn(substitutions[i]) + pieces[i + 1];
        }
        return result;
    }
}
var html = getTagFunction(escapeHtml);
var json = getTagFunction(JSON.stringify);

var container, autoClick_InsertionQ;
function getDefaultButtonId(messageInfix) {
    return 'DAF-btn_' + messageInfix;
}
function createButton(messageInfix, properties) {
    var p = Object.assign({ href: '#' }, properties), onclick = p.onclick;
    p.onclick = function(event) {
        event.stopPropagation();
        event.preventDefault();
        if(onclick) { onclick.apply(this, arguments); }
    };
    if (!('id' in p)) p.id = getDefaultButtonId(messageInfix);
    var a = createElement('a', p, container);
    createElement('b', { innerText: chrome.i18n.getMessage('btn_' + messageInfix + '_key') }, a);
    createElement('span', { innerText: chrome.i18n.getMessage('btn_' + messageInfix + '_text') }, a);
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
    createElement('span', { className: 'DAF-st' }, a);
    // default preference handler
    prefsHandlers[prefName] = function(value) {
        a.className = 'DAF-s' + (value ? '1' : '0');
    };
    return a;
}

function getFullWindow() { return wasRemoved ? false : DAF_getValue('fullWindow'); }
function getAutoClick() { return wasRemoved ? false : DAF_getValue('autoClick'); }

function prefsHandler_autoClick(value) {
    var btn = document.getElementById(getDefaultButtonId('autoClick'));
    if (btn) btn.className = 'DAF-s' + (value ? '1' : '0');
    if (value && !autoClick_InsertionQ) {
        console.log("insertionQ created");
        autoClick_InsertionQ = insertionQ('button.layerConfirm.uiOverlayButton[name=__CONFIRM__]').every(function (element) {
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
    var isFacebook = false, isPortal = false;

    if (document.getElementById('skrollr-body')) { // portal.pixelfederation
        isPortal = true;
    } else if (document.getElementById('pagelet_bluebar')) { // main document (Facebook)
        isFacebook = true;
    } else {
        console.error("Site not detected");
        return;
    }

    console.log('Injecting content tab', window.location.href);

    // Inject stylesheet
    var style = createElement('style', { type: 'text/css', innerText: json`
#DAF, #DAF * { box-sizing:border-box; font-size:12pt !important; font-family:Sans-Serif !important; }
#DAF, #DAF b, #DAF span { display:inline-block; border:1px solid #000; border-radius:1em; background-color:#BDF; color:#046; }
#DAF { border-radius:calc(1em + 2px) }
#DAF {
	position:fixed;z-index:2000; left:4px; top:4px; width:calc(1em + 12px);
	background-color:rgba(224,255,255,0.7);
	padding:2px 2px 0px 2px;
}
#DAF a { display:inline-block; text-decoration:none; white-space:nowrap; margin-bottom:2px; border-radius:1em; padding-right:2px; }
#DAF b { min-width:calc(1em + 6px); text-align:center; margin-right:3px; }
#DAF hr { border:0; border-top:1px solid #000; margin:0px -2px 2px -2px; }
#DAF span { display:none; border:0; margin-left:2px; padding:2px 4px 1px 4px; line-height:1em; }
#DAF a:hover span { display:inline-block; }
#DAF a.DAF-s1 b, #DAF a.DAF-s1 span.DAF-st { background-color:#0F0; color:#060; }
#DAF a.DAF-s1 span.DAF-st:before { content:${chrome.i18n.getMessage('btn_toggle_on')}; }
#DAF a.DAF-s0 b, #DAF a.DAF-s0 span.DAF-st { background-color:#999; color:#DDD; }
#DAF a.DAF-s0 span.DAF-st:before { content:${chrome.i18n.getMessage('btn_toggle_off')}; }
#DAF a:hover { background-color:rgba(0,0,0,0.7); color:#000; }
#DAF a:hover b { background-color:#FF0; color:#00F; }
` }, document.head);
    elementsToRemove.push(style);

    // Toolbar
    container = document.getElementById('DAF');
    if (container) container.parentNode.removeChild(container);
    container = createElement('div', { id: 'DAF' }, document.body);
    elementsToRemove.push(container);
    
    var originalHeight, onResize, onFullWindow;

    if (isFacebook) {
        createToggle('fullWindow');
        onResize = function (fullWindow) {
            var iframe = document.getElementById('iframe_canvas');
			if(originalHeight === undefined) originalHeight = iframe && iframe.style.height;
			if(iframe) iframe.style.height = fullWindow ? window.innerHeight + 'px' : originalHeight;
        };
        onFullWindow = function(fullWindow) {
            document.body.style.overflowY = fullWindow ? 'hidden' : ''; // remove vertical scrollbar
            iterate([document.getElementById('rightCol'), document.getElementById('pagelet_bluebar'), document.getElementById('pagelet_dock')], hideInFullWindow);
        };

        createToggle('autoClick');
        prefsHandlers['autoClick'] = prefsHandler_autoClick;
    } else if(isPortal) {
        createToggle('fullWindow');
        onResize = function (fullWindow) {
            var iframe = document.getElementsByClassName('game-iframe game-iframe--da')[0];
            if (iframe) iframe.style.height = fullWindow ? window.innerHeight + 'px' : '';
        };
        onFullWindow = function (fullWindow) {
            document.body.style.overflowY = fullWindow ? 'hidden' : ''; // remove vertical scrollbar
            iterate([document.getElementById('header'), document.getElementById('footer')], hideInFullWindow);
        };
    }

    if (isFacebook || isPortal) {
        var a = createElement('a', { href: '#', onclick: function(event) {
            event.stopPropagation();
            event.preventDefault();
        } }, container);
        createElement('b', { innerText: '?' }, a);
        createElement('span', { style: { fontWeight: 'bold', backgroundColor: '#FF0' }, innerText: chrome.i18n.getMessage('extName') }, a);
        createElement('span', { innerText: chrome.i18n.getMessage('extTitle') }, a);
    }

    // https://www.facebook.com/dialog/apprequests?app_id=470178856367913&data=game%3DDA&display=popup&e2e=%7B%7D&frictionless=true&locale=en_US&message=Uno%20dei%20vostri%20amici%20vi%20ha%20mandato%20un%20regalo.%20Prendetelo%20adesso!&next=https%3A%2F%2Fstaticxx.facebook.com%2Fconnect%2Fxd_arbiter%2Fr%2FXBwzv5Yrm_1.js%3Fversion%3D42%23cb%3Df3e224f08c821%26domain%3Dportal.pixelfederation.com%26origin%3Dhttps%253A%252F%252Fportal.pixelfederation.com%252Ff268adb3b8125b4%26relation%3Dopener%26frame%3Df2edd754f81ddec%26result%3D%2522xxRESULTTOKENxx%2522&sdk=joey&title=Diggy%27s%20Adventure&to=%5B%22100000498797299%22%5D

    if (onResize && onFullWindow) {
        var fnResize = function() {
            var fullWindow = getFullWindow();
            onResize(fullWindow);
        }
        elementsToRemove.push(function() {
            window.removeEventListener('resize', fnResize);
            fnResize();
        });
        window.addEventListener('resize', fnResize);
    }
    if (onFullWindow) {
        var fnFullWindow = function (value) {
            var fullWindow = getFullWindow();
            console.log('FullWindow', fullWindow);
            var btn = document.getElementById(getDefaultButtonId('fullWindow'));
            if (btn) btn.className = 'DAF-s' + (fullWindow ? '1' : '0');
            onFullWindow(fullWindow);
            onResize(fullWindow);
        };
        elementsToRemove.push(fnFullWindow);
        prefsHandlers['fullWindow'] = fnFullWindow;
    }
    
    // Perform first activation
    ['fullWindow', 'autoClick'].forEach(prefName => {
        if (prefName in prefsHandlers)
            prefsHandlers[prefName](DAF_getValue(prefName, false));
    });

    if (onFullWindow) window.dispatchEvent(new Event('resize'));
}
/*
 ** END
 *******************************************************************************/