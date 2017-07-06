/*
 ** DA Friends - content_tab.js
 */
if (!window.hasOwnProperty('__DAF_exPrefs')) {
    var __DAF_miner;

    /*
     ** We should have been injected by the background script into the right frame
     */
    if (!(__DAF_miner = document.getElementById('miner'))) {

        // Default exPrefs for content script(s)
        window.__DAF_exPrefs = {
            autoClick: true,
            autoPortal: false,
        };

        // Before we do anything, we need the current extension prefrences from the background
        chrome.runtime.sendMessage({
            cmd: 'getPrefs'
        }, function (response) {
            if (response.status == 'ok' && response.result)
                window.__DAF_exPrefs = Object.assign(window.__DAF_exPrefs, response.result);

            /*
             ** Let's do our thing - set-up preference handlers etc.
             */
            chrome.storage.onChanged.addListener(function (changes, area) {
                if (area == 'sync') {
                    for (var key in changes) {
                        if (window.__DAF_exPrefs.hasOwnProperty(key)) {
                            if (window.__DAF_exPrefs[key] != changes[key].newValue) {
                                window.__DAF_exPrefs[key] = changes[key].newValue;
                                console.log(key, changes[key].oldValue, '->', changes[key].newValue);
                            }
                        }
                    }
                }
            });

            /*
             ** Get a preference value
             */
            __DAF_getValue = function (name, defaultValue) {
                var value = window.__DAF_exPrefs[name];

                if (value === undefined || value === null) {
                    return defaultValue;
                }

                return value;
            }

            /*
             ** Set a prefrence value
             */
            __DAF_setValue = function (name, value) {
                try {
                    if ((window.hasOwnProperty('__DAF_exPrefs')) && name !== undefined && name !== null) {
                        console.log("__DAF_setValue:", name, value);
                        window.__DAF_exPrefs[name] = value;
                        chrome.storage.sync.set(window.__DAF_exPrefs);
                    }
                } catch (e) {
                    console.log("Something dodgy going on here, but what?", e);
                }
            }

            /********************************************************************
             ** Vins Facebook Pop-up's Auto Click
             */
            insertionQ('button.layerConfirm.uiOverlayButton[name=__CONFIRM__]').every(function (element) {
                console.log("insertionQ", __DAF_getValue('autoClick', false), element);
                if (__DAF_getValue('autoClick', false)) {
                    element.style.backgroundColor = "yellow";
                    var parent = element;
                    while (parent.parentNode.tagName != "BODY") {
                        parent = parent.parentNode;
                    }
                    parent.style.zIndex = -1;
                    element.click();
                }
            });

            /********************************************************************
             ** Vins Portal auto Facebook login
             */
            var loginButton = document.getElementById("login-click");

            if (loginButton) {
                var auto = __DAF_getValue("autoPortal", true),
                    handler = 0,
                    count = 0,
                    once = 1;

                function clearHandler() {
                    if (handler !== 0)
                        clearInterval(handler);
                    handler = 0;
                }

                function tryLogin() {
                    var a = Array.from(document.getElementsByClassName("btn--facebook"))
                        .filter(item => item.href = "https://login.pixelfederation.com/oauth/connect/facebook")[0];
                    if (a || count++ >= 10) {
                        clearHandler();
                        a.click();
                    }
                }

                console.log("Portal Login", auto, once, loginButton);

                if (auto && once) {
                    once--;
                    loginButton.click();
                    handler = setInterval(tryLogin, 500);
                }
            }

            /********************************************************************
             ** Vins FullWindow
             */
            var isFullwindow = __DAF_getValue("DAfullwindow") !== "0";
            var originalHeight;

            function forceResize() {
                window.dispatchEvent(new Event('resize'));
            }

            function getById(id) {
                return document.getElementById(id);
            }

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

            function hide(el) {
                if (el && el.style) {
                    el.style.display = isFullwindow ? "none" : "";
                }
            }

            if (getById("skrollr-body")) { // portal.pixelfederation
                onResize = function () {
                    var t = document.getElementsByClassName("game-iframe game-iframe--da")[0];
                    if (t) t.style.height = isFullwindow ? window.innerHeight + "px" : "";
                };
                refresh = function () {
                    document.body.style.overflowY = isFullwindow ? "hidden" : ""; // remove vertical scrollbar
                    iterate([getById("header"), getById("footer")], hide);
                };
            } else if (getById("pagelet_bluebar")) { // main document (Facebook)
                onResize = function () {
                    var iframe = getById("iframe_canvas");
                    if (originalHeight === undefined) originalHeight = iframe && iframe.style.height;
                    if (iframe) iframe.style.height = isFullwindow ? window.innerHeight + "px" : originalHeight;
                };
                refresh = function (event) {
                    document.body.style.overflowY = isFullwindow ? "hidden" : ""; // remove vertical scrollbar
                    iterate([getById("rightCol"), getById("pagelet_bluebar"), getById("pagelet_dock")], hide);
                };
            }
            if (onResize) window.addEventListener("resize", onResize);
            if (refresh) window.addEventListener("message", function (event) {
                if ((event.origin === "https://portal.pixelfederation.com" || event.origin === "https://diggysadventure.com") && event.data.substr(0, 11) === "fullwindow=") {
                    isFullwindow = event.data.substr(11) === "1";
                    refresh();
                    onResize();
                    setTimeout(forceResize, 2000);
                }
            });

        });
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
}
/*
 ** END
 *******************************************************************************/