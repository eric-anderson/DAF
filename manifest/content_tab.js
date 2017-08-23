/*
 ** DA Friends - content_tab.js
 */

DAF_initialize({
    toolbarStyle: 2,
    toolbarShift: false,
    autoClick: false,
    autoPortal: false,
    fullWindow: false,
    fullWindowHeader: false,
    gcTable: false
}, initialize);

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

var container, autoClick_InsertionQ;

function getDefaultButtonId(id) {
    return 'DAF-btn_' + id;
}

function createButton(id, properties) {
    var p = Object.assign({
            href: '#'
        }, properties),
        onclick = p.onclick,
        type = p.type,
        isToggle = type == 'toggle',
        parent = p.parent,
        flag, a, text, b_prop;
    delete p.parent;
    delete p.type;
    if (isToggle) {
        flag = 'flag' in p ? p.flag : DAF_getValue(id);
        delete p.flag;
        // default onclick handler
        if (!onclick) {
            onclick = function() {
                var value = !DAF_getValue(id);
                DAF_setValue(id, value);
            };
        }
    }
    p.onclick = function(event) {
        event.stopPropagation();
        event.preventDefault();
        if (onclick) {
            onclick.apply(this, arguments);
        }
    };
    if (!('id' in p)) p.id = getDefaultButtonId(id);
    text = guiString('btn_' + id);
    if ('text' in p) {
        text = p.text;
        delete p.text;
    }
    b_prop = {
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
    if (isToggle && parent) {
        p.innerText = text;
        a = createElement('span', p, parent);
    } else {
        a = createElement('a', p, container);
        createElement('b', b_prop, a);
        createElement('span', {
            innerText: text
        }, a);
    }
    if (isToggle && !parent) {
        createElement('span', {
            className: 'DAF-st'
        }, a);
    }
    if (isToggle) {
        toggleSelectClass(a, flag);
        // default preference handler
        DAF_setPreferenceHandler(id, value => toggleSelectClass(a, value));
    }
    return a;
}

function toggleSelectClass(a, flag) {
    if (a) {
        a.classList.toggle('DAF-s0', !flag);
        a.classList.toggle('DAF-s1', !!flag);
    }
}

function initialize() {
    var isFacebook, isPortal;

    // Auto login code was moved in content_portal_login.js and injected in background.js

    if (document.getElementById('skrollr-body')) { // portal.pixelfederation
        isPortal = true;
    } else if (document.getElementById('pagelet_bluebar')) { // main document (Facebook)
        isFacebook = true;
    } else {
        console.error("Site not detected");
        return;
    }

    DAF_log('Injecting content tab', window.location.href);

    /********************************************************************
     ** DAF toolbar
     */
    // Inject stylesheet
    DAF_injectStyle(chrome.extension.getURL('manifest/css/content_tab.css'));

    // Toolbar
    removeNode(document.getElementById('DAF'));
    container = DAF_removeLater(createElement('div', {
        id: 'DAF',
        className: 'DAF-style-2'
    }, document.body));
    // Hide menu, then show it later (after the stylesheet has been loaded)
    container.style.display = 'none';
    setTimeout(() => container.style.display = '', 100);
    DAF_setPreferenceHandler('toolbarStyle', value => {
        value = parseInt(value) || 2;
        if (value < 1 || value > 4) value = 2;
        __exPrefs.toolbarStyle = value;
        for (var i = 1; i <= 4; i++)
            container.classList.toggle('DAF-style-' + i, value == i);
    });

    // About button
    var a = createButton('about', {
        icon: true,
        text: guiString('extName'),
        onclick: function() {
            chrome.runtime.sendMessage({
                cmd: "show"
            });
        }
    });
    Object.assign(a.firstChild.nextSibling.style, {
        fontWeight: 'bold',
        backgroundColor: '#FF0'
    });
    createElement('span', {
        innerText: guiString('extTitle')
    }, a);

    /********************************************************************
     ** Vins FullWindow
     */
    var a = createButton('fullWindow', {
        type: 'toggle',
        key: 'F'
    });
    createButton('fullWindowHeader', {
        type: 'toggle',
        parent: a
    });

    var timeout = 1000,
        header, iframe, originalHeight;

    if (isFacebook) {
        header = document.getElementById('pagelet_bluebar');
        iframe = document.getElementById('iframe_canvas');
    } else if (isPortal) {
        header = document.getElementById('header');
        iframe = document.getElementsByClassName('game-iframe game-iframe--da')[0];
    }

    function positionToolbar() {
        var fullWindow = DAF_getValue('fullWindow'),
            toolbarShift = DAF_getValue('toolbarShift'),
            minerTop = parseFloat(DAF_getValue('@minerTop'));
        container.style.top = (toolbarShift ? 8 + iframe.getBoundingClientRect().top + (fullWindow ? 0 : minerTop) : 4) + 'px';
        container.style.left = (toolbarShift ? 8 : 4) + 'px';
        container.style.position = toolbarShift ? 'absolute' : 'fixed';
    }

    var onResize = function() {
        var fullWindow = DAF_getValue('fullWindow'),
            fullWindowHeader = DAF_getValue('fullWindowHeader'),
            headerHeight = header.getBoundingClientRect().height;
        if (iframe) {
            if (isFacebook) {
                if (originalHeight === undefined && iframe.style.height == '') {
                    forceResizeLater(timeout);
                    timeout = timeout * 2;
                } else {
                    originalHeight = originalHeight || iframe.offsetHeight;
                    iframe.style.height = fullWindow ? (window.innerHeight - (fullWindowHeader ? headerHeight : 0)) + 'px' : (parseFloat(DAF_getValue('@bodyHeight')) || originalHeight) + 'px';
                }
            } else if (isPortal) {
                iframe.style.height = fullWindow ? (window.innerHeight - (fullWindowHeader ? headerHeight : 0)) + 'px' : '';
            }
            positionToolbar();
        }
    };
    window.addEventListener('resize', onResize);
    DAF_removeLater(() => {
        window.removeEventListener('resize', onResize);
        onResize();
    });

    var onFullWindow = DAF_removeLater(() => {
        var fullWindow = DAF_getValue('fullWindow'),
            fullWindowHeader = DAF_getValue('fullWindowHeader');
        DAF_log('FullWindow', fullWindow);
        toggleSelectClass(document.getElementById(getDefaultButtonId('fullWindow')), fullWindow);
        toggleSelectClass(document.getElementById(getDefaultButtonId('fullWindowHeader')), fullWindowHeader);
        document.body.style.overflowY = fullWindow ? 'hidden' : ''; // remove vertical scrollbar
        iterate(header, fullWindow && !fullWindowHeader ? hide : show);
        if (isFacebook) {
            iterate([document.getElementById('pagelet_dock'), document.getElementById('rightCol')], fullWindow ? hide : show);
        } else if (isPortal) {
            iterate(document.getElementById('footer'), fullWindow ? hide : show);
        }
        onResize();
    });
    DAF_setPreferenceHandler('fullWindow', onFullWindow);
    DAF_setPreferenceHandler('fullWindowHeader', onFullWindow);
    DAF_setPreferenceHandler('toolbarShift', onResize);
    DAF_setPreferenceHandler('@minerTop', positionToolbar);

    // Eric's GC Table
    var a = createButton('gcTable', {
        type: 'toggle',
        icon: true
    });
    var gcTableStatus = createElement('span', {
        id: 'DAF-gc-status',
        className: 'DAF-gc-default'
    }, a);
    DAF_setPreferenceHandler('@gcTableStatus', value => {
        console.log("Received status", value);
        if (value != 'error' && value != 'collected') value = 'default';
        ['error', 'collected', 'default'].forEach(name => {
            gcTableStatus.classList.toggle('DAF-gc-' + name, name == value);
        });
    });

    // Vins Facebook Pop-up's Auto Click
    createButton('autoClick', {
        type: 'toggle',
        key: 'A'
    });
    DAF_setPreferenceHandler('autoClick', value => {
        toggleSelectClass(document.getElementById(getDefaultButtonId('autoClick')), value);
        if (value && !autoClick_InsertionQ) {
            DAF_log("insertionQ created");
            autoClick_InsertionQ = insertionQ('button.layerConfirm.uiOverlayButton[name=__CONFIRM__]').every(element => {
                var autoClick = DAF_getValue('autoClick');
                DAF_log("insertionQ", autoClick, element);
                if (autoClick) {
                    var parent = element;
                    while (parent.parentNode.tagName != 'BODY') {
                        parent = parent.parentNode;
                    }
                    parent.style.zIndex = -1;
                    element.click();
                }
            });
            DAF_removeLater(() => {
                DAF_log("insertionQ destroyed");
                if (autoClick_InsertionQ) autoClick_InsertionQ.destroy();
                autoClick_InsertionQ = null;
            });
        }
    });

    // Reload button
    createButton('reloadGame', {
        key: 'R',
        onclick: () => {
            chrome.runtime.sendMessage({
                cmd: "reload"
            });
        }
    });

    // Perform first activation
    ['toolbarStyle', 'fullWindow', 'autoClick', 'gcTable'].forEach(prefName => {
        if (prefName in __prefsHandlers)
            __prefsHandlers[prefName](DAF_getValue(prefName));
    });

    if (onFullWindow) forceResize();
}
/*
 ** END
 *******************************************************************************/