/*
 ** DA Friends - content_da.js
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
    var e = document.createElement(tagName);
    if (parent) {
        parent.insertBefore(e, insertBeforeThis);
    }
    var p = Object.assign({}, properties);
    if (p.style) {
        Object.assign(e.style, p.style);
        delete p.style;
    }
    return Object.assign(e, p);
}

// Before we do anything, we need the current extension preferences from the background
var exPrefs = {
    fullWindow: false,
    gcTable: false,
    gameSync: false,
    gameLang: null,
    gameNews: ''
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
 ** Extension message handler
 */
console.log("onMessage Listener");
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    var status = "ok",
        results = null;
    if (wasRemoved) return;
    console.log("chrome.runtime.onMessage", request);
    switch (request.cmd) {
        case 'gameSync':
            if (request.action == 'friend_child_charge') {
                gcTable_remove(document.getElementById('DAF-gc-' + request.data.uid));
            }
            break;
        case 'gameDone':
            gcTable(true);
            break;
    }
    return true; // MUST return true; here!
});


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

function getFullWindow() {
    return wasRemoved ? false : DAF_getValue('fullWindow');
}

function hideInFullWindow(el) {
    if (el && el.style)
        el.style.display = getFullWindow() ? "none" : "";
}

/********************************************************************
 ** Eric's GC Table
 */
var gcTable_div = null;

function gcTable_remove(div) {
    if (div) div.parentNode.removeChild(div);
    // handle case where the table is empty
    if (gcTable_div && gcTable_div.firstChild == null) {
        DAF_setValue('gcTableStatus', 'collected');
        if (gcTable_div.style.display != 'none') {
            gcTable_div.style.display = 'none';
            if (getFullWindow()) window.dispatchEvent(new Event('resize'));
        }
    }
}

function gcTable(forceRefresh = false) {
    if (wasRemoved) return;

    var show = DAF_getValue('gcTable', false);

    // If force refresh and table is present ...
    if (gcTable_div != null && forceRefresh == true) {
        removeGCDiv();
        if (getFullWindow()) window.dispatchEvent(new Event('resize'));
    }

    // If table is present, we just show/hide it
    if (gcTable_div && gcTable_div.firstChild == null) {
        // handle case where the table is empty
        gcTable_remove(null);
    } else if (gcTable_div) {
        gcTable_div.style.display = show ? 'block' : 'none';
        if (getFullWindow()) window.dispatchEvent(new Event('resize'));
        // If table is not present and we need to show it, we must retrieve the neighbours first
    } else if (show) {
        DAF_setValue('gcTableStatus', 'default');
        chrome.runtime.sendMessage({
            cmd: 'getNeighbours'
        }, updateGCTable);
    }

    function removeGCDiv() {
        if (gcTable_div) gcTable_div.parentNode.removeChild(gcTable_div);
        gcTable_div = null;
    }

    function updateGCTable(result) {
        if (gcTable_div) gcTable_div.innerHTML = '';

        if (result.status != 'ok' || !result.result) {
            console.error('unable to getNeighbours', result);
            DAF_setValue('gcTableStatus', 'error');
            return;
        }

        var neighbours = result.result;
        var gcNeighbours = Object.keys(neighbours).map(key => neighbours[key])
            .filter(item => {
                if (item.spawned == '0') return false;
                item.name = item.name || 'Player ' + item.uid;
                // Mr. Bill
                if (item.uid == 0 || item.uid == 1) {
                    // index 9999 bigger than any possible 5k max friends
                    item.neighbourIndex = 9999;
                }
                return true;
            })
            .sort((a, b) => a.neighbourIndex - b.neighbourIndex);
        console.log('gcNeighbours', gcNeighbours);

        if (!gcTable_div) {
            console.log('making table...');
            var miner = document.getElementById('miner');
            gcTable_div = createElement('div', {
                id: 'DAF-gc',
                style: {
                    display: 'none'
                }
            }, miner.parentNode, miner.nextSibling);
            gcTable_div.addEventListener('click', function(e) {
                if (DAF_getValue('gameSync')) return;
                for (var div = e.srcElement; div && div !== gcTable_div; div = div.parentNode) {
                    if (div.id && div.id.startsWith('DAF-gc-')) {
                        gcTable_remove(div);
                        break;
                    }
                }
            });
            if (elementsToRemove.indexOf(removeGCDiv) < 0) elementsToRemove.push(removeGCDiv);
        }

        gcNeighbours.forEach(item => {
            var div = createElement('div', {
                id: 'DAF-gc-' + item.uid
            }, gcTable_div);
            createElement('img', {
                width: 64,
                height: 64,
                src: item.pic_square
            }, div);
            var b = createElement('b', {
                innerText: item.level
            }, div);
            if (item.uid == 0 || item.uid == 1) b.style.visibility = 'hidden';
            createElement('span', {
                innerText: item.name
            }, div);
        });

        if (gcTable_div.firstChild == null) {
            // handle case where the table is empty
            gcTable_remove(null);
        } else {
            gcTable_div.style.display = '';
            DAF_setValue('gcTableStatus', 'default');
            if (getFullWindow()) {
                // Add delay so table can finish rendering before resize.
                console.log('requesting auto-resize');
                setTimeout(function() {
                    window.dispatchEvent(new Event('resize'));
                }, 1000);
            }
        }
    }
}

function initialize() {
    var miner = document.getElementById('miner');
    if (!miner) {
        console.error("Site not detected");
        return;
    }

    console.log('Injecting content da', window.location.href);

    /********************************************************************
     ** Sniff the game language
     */
    var i, p = miner.getElementsByTagName('param')
    if (p.hasOwnProperty('flashvars')) {
        p = p['flashvars'].value;
        if ((i = p.indexOf('lang=')) != -1) {
            p = p.substr(i + 5, 2);
            DAF_setValue('gameLang', p);
        }
    }

    /********************************************************************
     ** Sniff any news item
     */
    var news = '';
    Array.prototype.forEach.call(document.getElementsByClassName('news'), function(el) {
        news = el.innerHTML;
    });
    DAF_setValue('gameNews', news);

    //** Eric's GC Table
    // Inject stylesheet
    var style = createElement('style', {
        type: 'text/css',
        innerHTML: `
#DAF-gc { overflow-x: scroll; overflow-y: hidden; background-color: #000; white-space: nowrap; height: 94px; }
#DAF-gc::-webkit-scrollbar { width: 10px; height: 10px; }
#DAF-gc::-webkit-scrollbar-track { xborder: 1px solid black; background: #336; border-radius: 10px; }
#DAF-gc::-webkit-scrollbar-thumb { border-radius:10px; border: 1px solid black; background-color: #88D; }
#DAF-gc::-webkit-scrollbar-thumb:hover { background-color: #FF0; }
#DAF-gc div { display: inline-block; width: 64px; min-width: 64px; max-width: 64px; height: 80px; padding: 1px 1px; cursor: pointer; }
#DAF-gc b { 
  display: block; width: 28px; position: relative; left: 0; top: -64px; 
  font-size: 12pt !important; font-family: Sans-Serif !important; font-weight: normal !important;
  letter-spacing: -1px; padding: 1px 0px 0px 1px; text-align: left;
  background-color: #148; color: #FFF;
  text-shadow: #000 2px 0px 2px, #000 0px 1px 1px, #000 -2px 0px 2px, #000 0px -1px 1px;
  border-bottom-right-radius: 12px; border-right: 1px solid #000; border-bottom: 1px solid #000;
}
#DAF-gc span {
  display: block; width: 64px; height: 18px; position: relative; top: -20px; padding-top: 1px;
  background-color: #FFF; color: #000;
  font-size: 12pt !important; font-family: Sans-Serif !important;
  letter-spacing: -1px; text-overflow: clip; text-align: center;
}
#DAF-gc.flipped, #DAF-gc.flipped div { transform:rotateX(180deg); }
#DAF-gc.flipped { height: 91px; padding-top: 3px; }
` }, document.head);
    elementsToRemove.push(style);
    prefsHandlers['gcTable'] = function(value) {
        gcTable();
    }

    /********************************************************************
     ** Vins FullWindow
     */
    var originalHeight = miner.height;
    var onResize = function() {
        var fullWindow = getFullWindow();
        var gcDivHeight = 0;
        var gcDiv = document.getElementById('DAF-gc');
        if (gcDiv) {
            gcDivHeight = gcDiv.offsetHeight;
            gcDiv.style.width = fullWindow ? window.innerWidth : '100%';
        }
        miner.height = fullWindow ? window.innerHeight - gcDivHeight : originalHeight;
        miner.width = fullWindow ? window.innerWidth : "100%";
    };

    var onFullWindow = function(value) {
        var fullWindow = getFullWindow();
        console.log('FullWindow', fullWindow);
        // display news in a floating box
        iterate(document.getElementsByClassName('news'), function(el) {
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
        setTimeout(function() {
            window.dispatchEvent(new Event('resize'));
        }, 1000);
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
    ['fullWindow', 'gcTable'].forEach(prefName => {
        if (prefName in prefsHandlers)
            prefsHandlers[prefName](DAF_getValue(prefName, false));
    });
}
/*
 ** END
 *******************************************************************************/