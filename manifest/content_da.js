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
    fullWindow: false,
    gcTable: false,
    gameLang: null,
    gameNews: ''
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
 ** Extension message handler
 */
console.log("onMessage Listener");
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    var status = "ok",
        results = null;
    if (wasRemoved) return;
    console.log("chrome.runtime.onMessage", request);
    switch (request.cmd) {
        case 'gameSync':
            if (request.action == 'friend_child_charge') {
                var el = document.getElementById('gc-' + request.data.uid);
                if (el)
                    el.parentNode.removeChild(el);
                el = document.getElementById('godChildrenTable');
                if ((el) && el.rows.length == 0) {
                    el = el.parentNode;
                    el.parentNode.removeChild(el);
                }
            }
            break;
        case 'gameDone':
            gcTable();
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

function getFullWindow() { return wasRemoved ? false : DAF_getValue('fullWindow'); }
function hideInFullWindow(el) {
    if (el && el.style)
        el.style.display = getFullWindow() ? "none" : "";
}

/********************************************************************
 ** Eric's GC Table
 */
function gcTable() {
    return; // disabled for now
    var miner = document.getElementById('miner');

    if (!miner || !DAF_getValue("gcTable")) {
        removeGCDiv();
        return;
    }

    chrome.runtime.sendMessage({
        cmd: 'getNeighbours'
    }, updateGCTable);
    
    function removeGCDiv() {
        var gcd = document.getElementById('godChildrenDiv');
        if (gcd) {
            gcd.parentNode.removeChild(gcd);
        }
    }

    function updateGCTable(result) {
        if (result.status != 'ok' || !result.result) {
            console.error('unable to getNeighbours', result);
            return;
        }

        var neighbours = result.result;
        var row = document.getElementById('diggyGodChildrenRow');
        if (!row) {
            console.log('making table...');
            row = createGCTable();
        }
        var gcNeighbours = [];

        for (var i in neighbours) {
            if (!neighbours.hasOwnProperty(i)) continue;
            var n = neighbours[i];
            if (n.spawned == "0") continue;
            if (i == 0 || i == 1) { // Mr. Bill; index 9999 bigger than any possible 5k max friends
                gcNeighbours.push({
                    uid: n.uid,
                    name: n.name,
                    level: '',
                    pic_square: n.pic_square,
                    neighbourIndex: 9999
                });
            } else {
                gcNeighbours.push({
                    uid: n.uid,
                    name: getName(n),
                    level: parseInt(n.level),
                    pic_square: n.pic_square,
                    neighbourIndex: n.neighbourIndex
                });
            }
        }

        // Level isn't sufficient to order neighbours and I couldn't figure out
        // what else they were using to sort (e.g. it's not uid or name)
        gcNeighbours.sort(function (a, b) {
            return a.neighbourIndex - b.neighbourIndex;
        });

        console.log('gcNeighbours', gcNeighbours);
        row.innerHTML = '';
        if (gcNeighbours.length == 0) {
            removeGCDiv();
            //row.innerHTML = '<td>All god children collected</td>';

        } else {
            for (var i = 0; i < gcNeighbours.length; i++) {
                var n = gcNeighbours[i];
                var cell = makeGodChildrenCell(n.name, n.level, n.pic_square, n.uid)
                row.appendChild(cell);
            }
        }

        // Add delay so table can finish rendering before resize.
        console.log('requesting auto-resize');
        setTimeout(function() { window.dispatchEvent(new Event('resize')); }, 1000);
    }

    function getName(f) {
        if (f.name == '') {
            return 'Player ' + f.uid;
        }
        return f.name;
    }

    function makeGodChildrenCell(name, level, pic, uid) {
        var cell = document.createElement('td');
        cell.setAttribute('class', 'friend');
        cell.id = 'gc-' + uid;

        var img = document.createElement('img');
        img.setAttribute('width', 64);
        img.setAttribute('src', pic);
        cell.appendChild(img);
        if (level != '') {
            cell.appendChild(makeGodChildrenSpan('levelbg', ''));
            cell.appendChild(makeGodChildrenSpan('level', level));
        }
        cell.appendChild(makeGodChildrenSpan('name', name));

        cell.onclick = function () {
            if (!DAF_getValue('gameSync'))
                cell.parentNode.removeChild(cell);
        };
        return cell;
    }

    function makeGodChildrenSpan(sClass, text) {
        var span = document.createElement('span');
        span.setAttribute('class', sClass);
        span.innerHTML = text;
        return span;
    }

    function insertAfter(afterNode, newElem) {
        afterNode.parentNode.insertBefore(newElem, afterNode.nextSibling);
    }

    function createGCTable() {
        var div = document.createElement('div');
        div.setAttribute('class', 'godChildrenDiv');
        div.setAttribute('id', 'godChildrenDiv');
        insertAfter(miner, div);
        var table = document.createElement('table');
        table.setAttribute('class', 'godChildrenTable');
        div.appendChild(table);
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        var tr = document.createElement('tr');
        tr.setAttribute('id', 'diggyGodChildrenRow');
        tbody.appendChild(tr);
        if (elementsToRemove.indexOf(removeGCDiv) < 0) elementsToRemove.push(removeGCDiv);
        return tr;
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
    Array.prototype.forEach.call(document.getElementsByClassName('news'), function (el) {
        news = el.innerHTML;
    });
    DAF_setValue('gameNews', news);

    gcTable();

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