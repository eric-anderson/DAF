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
    debug: false,
    fullWindow: false,
    gcTable: false,
    gcTableSize: '',
    gcTableFlipped: true,
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
            if (exPrefs.debug) console.log(key, changes[key].oldValue, '->', changes[key].newValue);
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
        if (exPrefs.debug) console.log("DAF_setValue:", name, value);
        switch (name) {
            case 'gcTableStatus':
            case 'bodyHeight':
            case 'minerTop':
                // send pseudo-preferences through background page
                chrome.runtime.sendMessage({
                    cmd: 'sendValue',
                    name: name,
                    value: value
                });
                break;
            default:
                var obj = {};
                obj[name] = exPrefs[name] = value;
                chrome.storage.sync.set(obj);
                break;
        }
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
    if (exPrefs.debug) console.log("chrome.runtime.onMessage", request);
    switch (request.cmd) {
        case 'gameSync':
            if (request.action == 'friend_child_charge') {
                gcTable_remove(document.getElementById('DAF-gc-' + request.data.uid));
            }
            break;
        case 'gameDone':
            if (exPrefs.debug) console.log("calling gcTable(true)");
            gcTable(true);
            break;
        case 'sendValue':
            exPrefs[request.name] = request.value;
            if (request.name in prefsHandlers) prefsHandlers[request.name](request.value);
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

function forceResize() {
    window.dispatchEvent(new Event('resize'));
}

function forceResizeLater() {
    setTimeout(forceResize, 1000);
}

function getFullWindow() {
    return wasRemoved ? false : DAF_getValue('fullWindow');
}

function hide(el) {
    if (el && el.style) el.style.display = 'none';
}

function show(el) {
    if (el && el.style) el.style.display = '';
}

/********************************************************************
 ** Eric's GC Table
 */
var gcTable_div = null;

function gcTable_remove(div) {
    var resize = false;
    if (div) {
        var parent = div.parentNode,
            heightBefore = parent.offsetHeight;
        parent.removeChild(div);
        var heightAfter = parent.offsetHeight;
        // scrollbar was hidden and we are in full window?
        if (heightBefore > heightAfter && getFullWindow()) {
            // Force a resize
            //resize = true;
            // This is currently disabled because it causes the game's neighbour list to reset position
            // instead, we keep the space for the scrollbar
            parent.style.overflowX = 'scroll';
        }
        //if (scrollbarBefore != scrollbarAfter) resize = true;
    }
    // handle case where the table is empty
    if (gcTable_div && gcTable_div.firstChild == null) {
        DAF_setValue('gcTableStatus', 'collected');
        if (gcTable_div.style.display != 'none') {
            gcTable_div.style.display = 'none';
            resize = true;
        }
    }
    if (resize && getFullWindow()) forceResize();
}

function setgcTableOptions() {
    if (!gcTable_div) return;
    var value = String(DAF_getValue('gcTableSize'));
    if (value != 'small' && value != 'large') value = 'large';
    if (!gcTable_div.classList.contains('DAF-gc-' + value) && getFullWindow()) forceResizeLater();
    gcTable_div.classList.toggle('DAF-gc-small', value == 'small');
    gcTable_div.classList.toggle('DAF-gc-large', value == 'large');
    gcTable_div.classList.toggle('DAF-flipped', !!DAF_getValue('gcTableFlipped'));
}

function gcTable(forceRefresh = false) {
    if (wasRemoved) return;

    if (exPrefs.debug) console.log("gcTable forceRefresh=" + forceRefresh);

    var show = DAF_getValue('gcTable', false);
    // Set document.body.DAF_gc to the number of GC to simulate
    var simulate = parseInt(document.body.getAttribute('DAF_gc')) || 0;
    if (simulate > 0 && show) {
        document.body.removeAttribute('DAF_gc');
    }

    // If force refresh and table is present ...
    if (gcTable_div != null && (forceRefresh == true || simulate > 0)) {
        removeGCDiv();
        if (getFullWindow()) forceResize();
    }

    // If table is present, we just show/hide it
    if (gcTable_div && gcTable_div.firstChild == null) {
        // handle case where the table is empty
        gcTable_remove(null);
    } else if (gcTable_div) {
        gcTable_div.style.display = show ? 'block' : 'none';
        if (getFullWindow()) forceResize();
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
        var gcNeighbours = Object.keys(neighbours).map(key => neighbours[key]);
        if (simulate > 0) {
            gcNeighbours = gcNeighbours.slice(0, simulate);
        } else {
            gcNeighbours = gcNeighbours.filter(item => item.spawned != '0');
        }
        gcNeighbours.forEach(item => {
            item.name = item.name || 'Player ' + item.uid;
            // Mr. Bill
            if (item.uid == 0 || item.uid == 1) {
                // index 9999 bigger than any possible 5k max friends
                item.neighbourIndex = 9999;
            }
        });
        gcNeighbours.sort((a, b) => a.neighbourIndex - b.neighbourIndex);
        if (exPrefs.debug) console.log('gcNeighbours', gcNeighbours);

        if (!gcTable_div) {
            if (exPrefs.debug) console.log('making table...');
            var miner = document.getElementById('miner');
            gcTable_div = createElement('div', {
                id: 'DAF-gc',
                style: {
                    display: 'none'
                }
            }, miner.parentNode, miner.nextSibling);
            gcTable_div.addEventListener('click', function(e) {
                var found = null;
                for (var div = e.srcElement; div && div !== gcTable_div; div = div.parentNode) {
                    if (div.id && div.id.startsWith('DAF-gc-')) {
                        found = div;
                        break;
                    }
                }
                if (found && (!DAF_getValue('gameSync') || div.className.indexOf('DAF-gc-simulated') > 0))
                    gcTable_remove(div);
            });
            if (elementsToRemove.indexOf(removeGCDiv) < 0) elementsToRemove.push(removeGCDiv);
        }

        setgcTableOptions();
        gcNeighbours.forEach(item => {
            var div = createElement('div', {
                id: 'DAF-gc-' + item.uid,
                className: 'DAF-gc-player' + (simulate > 0 ? ' DAF-gc-simulated' : '')
            }, gcTable_div);
            var d = createElement('div', {
                className: 'DAF-gc-level',
                innerText: item.level
            }, div);
            if (item.uid == 0 || item.uid == 1) d.style.visibility = 'hidden';
            createElement('img', {
                className: 'DAF-gc-avatar',
                src: item.pic_square
            }, div);
            createElement('div', {
                className: 'DAF-gc-name',
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
                forceResizeLater();
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
    // Inject stylesheet for Google font (if not already found)
    if (document.getElementById('DAF-gc-OpenSansCondensed') == null) {
        createElement('link', {
            id: 'DAF-gc-OpenSansCondensed',
            href: 'https://fonts.googleapis.com/css?family=Open+Sans+Condensed:300',
            rel: 'stylesheet'
        }, document.head);
    }
    elementsToRemove.push(createElement('link', {
        type: 'text/css',
        href: chrome.extension.getURL('manifest/css/content_da.css'),
        rel: 'stylesheet'
    }, document.head));
    prefsHandlers['gcTable'] = function(value) {
        gcTable();
    }
    prefsHandlers['gcTableSize'] = setgcTableOptions;
    prefsHandlers['gcTableFlipped'] = setgcTableOptions;


    /********************************************************************
     ** Vins FullWindow
     */
    var originalHeight = miner.height + 'px';

    var lastBodyHeight, lastMinerTop;

    function sendMinerPosition() {
        // Send some values to the top window (we set it twice so the value is changed and synced)
        // Body height
        var bodyHeight = Math.floor(document.getElementById('footer').getBoundingClientRect().bottom);
        if (lastBodyHeight !== bodyHeight)
            DAF_setValue('bodyHeight', bodyHeight);
        lastBodyHeight = bodyHeight;
        // Miner top position
        var minerTop = Math.floor(miner.getBoundingClientRect().top);
        if (lastMinerTop !== minerTop)
            DAF_setValue('minerTop', minerTop);
        lastMinerTop = minerTop;
    }
    // Set body height to 100% so we can use height:100% in miner
    document.body.style.height = '100%';
    var onResize = function() {
        // Please note: we must set the width for zoomed out view (for example, at 50%)
        // otherwise the element will be clipped horizontally
        var fullWindow = getFullWindow();
        var gcDivHeight = 0;
        var gcDiv = document.getElementById('DAF-gc');
        if (gcDiv) {
            gcDivHeight = gcDiv.offsetHeight;
            gcDiv.style.overflowX = 'auto';
            gcDiv.style.width = fullWindow ? window.innerWidth : '100%';
        }
        miner.style.height = fullWindow ? (gcDivHeight > 0 ? 'calc(100% - ' + gcDivHeight + 'px)' : '100%') : originalHeight;
        miner.width = fullWindow ? window.innerWidth : '100%';
        sendMinerPosition();
    };

    var onFullWindow = function(value) {
        var fullWindow = getFullWindow();
        if (exPrefs.debug) console.log('FullWindow', fullWindow);
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
        var flag = getFullWindow();
        iterate([document.getElementsByClassName('header-menu'), document.getElementById('gems_banner')], flag ? hide : show);
        iterate([document.getElementsByClassName('cp_banner bottom_banner'), document.getElementById('bottom_news'), document.getElementById('footer')], flag ? hide : show);
        document.body.style.overflowY = fullWindow ? 'hidden' : '';
        sendMinerPosition();
        forceResizeLater();
    };

    if (onResize) {
        elementsToRemove.push(onResize);
        window.addEventListener("resize", onResize);
    }
    if (onFullWindow) {
        elementsToRemove.push(onFullWindow);
        prefsHandlers['fullWindow'] = onFullWindow;
    }

    sendMinerPosition();

    // Perform first activation
    ['fullWindow', 'gcTable'].forEach(prefName => {
        if (prefName in prefsHandlers)
            prefsHandlers[prefName](DAF_getValue(prefName, false));
    });
}
/*
 ** END
 *******************************************************************************/