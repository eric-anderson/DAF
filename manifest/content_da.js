/*
 ** DA Friends - content_da.js
 */

DAF_initialize({
    fullWindow: false,
    gcTable: false,
    gcTableSize: '',
    gcTableFlipped: true,
    gameSync: false,
    gameLang: null,
    gameNews: ''
}, initialize);


/********************************************************************
 ** Eric's GC Table
 */
var gcTable_div = null;

function gcTable_remove(div) {
    if (!gcTable_div) return;
    if (div) {
        var heightBefore = gcTable_div.offsetHeight;
        removeNode(div);
        var heightAfter = gcTable_div.offsetHeight;
        // scrollbar was hidden and we are in full window?
        if (heightBefore > heightAfter && DAF_getValue('fullWindow')) {
            // Force Resize is currently disabled because it causes the game's neighbour list to reset position
            // instead, we keep the space for the scrollbar
            gcTable_div.style.overflowX = 'scroll';
        }
    }
    // handle case where the table is empty
    if (gcTable_div.firstChild == null) {
        DAF_setValue('@gcTableStatus', 'collected');
        if (gcTable_div.style.display != 'none') {
            gcTable_div.style.display = 'none';
            if (DAF_getValue('fullWindow')) forceResize();
        }
    }
}

function setgcTableOptions() {
    if (!gcTable_div) return;
    var value = String(DAF_getValue('gcTableSize'));
    if (value != 'small' && value != 'large') value = 'large';
    if (!gcTable_div.classList.contains('DAF-gc-' + value) && DAF_getValue('fullWindow')) forceResizeLater();
    gcTable_div.classList.toggle('DAF-gc-small', value == 'small');
    gcTable_div.classList.toggle('DAF-gc-large', value == 'large');
    gcTable_div.classList.toggle('DAF-flipped', !!DAF_getValue('gcTableFlipped'));
}

function gcTable(forceRefresh = false) {
    DAF_log("gcTable forceRefresh=" + forceRefresh);

    var show = DAF_getValue('gcTable');
    // Set document.body.DAF_gc to the number of GC to simulate
    var simulate = parseInt(document.body.getAttribute('DAF_gc')) || 0;
    if (simulate > 0 && show) {
        document.body.removeAttribute('DAF_gc');
        forceRefresh = true;
    }

    // If table is present, we just show/hide it
    if (gcTable_div && gcTable_div.firstChild == null && !forceRefresh) {
        // handle case where the table is empty
        gcTable_remove(null);
    } else if (gcTable_div && !forceRefresh) {
        gcTable_div.style.display = show ? 'block' : 'none';
        if (DAF_getValue('fullWindow')) forceResize();
        // If table is not present and we need to show it, we must retrieve the neighbours first
    } else if (show) {
        DAF_setValue('@gcTableStatus', 'default');
        chrome.runtime.sendMessage({
            cmd: 'getNeighbours'
        }, updateGCTable);
    }

    function updateGCTable(result) {
        if (gcTable_div) gcTable_div.innerHTML = '';

        if (result.status != 'ok' || !result.result) {
            console.error('unable to getNeighbours', result);
            DAF_setValue('@gcTableStatus', 'error');
            return;
        }

        var neighbours = result.result,
            gcNeighbours = Object.keys(neighbours).map(key => neighbours[key]);
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
        DAF_log('gcNeighbours', gcNeighbours);

        if (!gcTable_div) {
            DAF_log('making table...');
            var miner = document.getElementById('miner');
            gcTable_div = DAF_removeLater(createElement('div', {
                id: 'DAF-gc',
                style: {
                    display: 'none'
                }
            }, miner.parentNode, miner.nextSibling));
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
            DAF_setValue('@gcTableStatus', 'default');
            if (DAF_getValue('fullWindow')) forceResizeLater();
        }
    }
}

function initialize() {
    var miner = document.getElementById('miner');
    if (!miner) {
        console.error("Site not detected");
        return;
    }

    DAF_log('Injecting content da', window.location.href);

    DAF_setMessageHandler('gameSync', request => {
        if (request.action == 'friend_child_charge') {
            gcTable_remove(document.getElementById('DAF-gc-' + request.data.uid));
        }
    });
    DAF_setMessageHandler('gameDone', request => {
        DAF_log("calling gcTable(true)");
        gcTable(true);
    });

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
    Array.from(document.getElementsByClassName('news')).forEach(el => news = el.innerHTML);
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
    DAF_injectStyle(chrome.extension.getURL('manifest/css/content_da.css'));
    DAF_setPreferenceHandler('gcTable', () => gcTable());
    DAF_setPreferenceHandler('gcTableSize', setgcTableOptions);
    DAF_setPreferenceHandler('gcTableFlipped', setgcTableOptions);


    /********************************************************************
     ** Vins FullWindow
     */
    var originalHeight = miner.height + 'px',
        lastBodyHeight, lastMinerTop;

    function sendMinerPosition() {
        // Send some values to the top window
        var bodyHeight = Math.floor(document.getElementById('footer').getBoundingClientRect().bottom),
            minerTop = Math.floor(miner.getBoundingClientRect().top);
        if (lastBodyHeight !== bodyHeight) DAF_setValue('@bodyHeight', bodyHeight);
        lastBodyHeight = bodyHeight;
        if (lastMinerTop !== minerTop) DAF_setValue('@minerTop', minerTop);
        lastMinerTop = minerTop;
    }
    // Set body height to 100% so we can use height:100% in miner
    document.body.style.height = '100%';
    var onResize = function() {
        // Please note: we must set the width for zoomed out view (for example, at 50%)
        // otherwise the element will be clipped horizontally
        var fullWindow = DAF_getValue('fullWindow'),
            gcDivHeight = gcTable_div ? gcTable_div.offsetHeight : 0;
        if (gcTable_div) {
            gcTable_div.style.overflowX = 'auto';
            gcTable_div.style.width = fullWindow ? window.innerWidth : '100%';
        }
        miner.style.height = fullWindow ? (gcDivHeight > 0 ? 'calc(100% - ' + gcDivHeight + 'px)' : '100%') : originalHeight;
        miner.width = fullWindow ? window.innerWidth : '100%';
        sendMinerPosition();
    };
    window.addEventListener("resize", onResize);
    DAF_removeLater(() => {
        window.removeEventListener('resize', onResize);
        onResize();
    });

    var onFullWindow = DAF_removeLater(function(value) {
        var fullWindow = DAF_getValue('fullWindow');
        DAF_log('FullWindow', fullWindow);
        // display news in a floating box
        iterate(document.getElementsByClassName('news'), el => {
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
        iterate([document.getElementsByClassName('header-menu'), document.getElementById('gems_banner')], fullWindow ? hide : show);
        iterate([document.getElementsByClassName('cp_banner bottom_banner'), document.getElementById('bottom_news'), document.getElementById('footer')], fullWindow ? hide : show);
        document.body.style.overflowY = fullWindow ? 'hidden' : '';
        sendMinerPosition();
        forceResizeLater();
    });
    DAF_setPreferenceHandler('fullWindow', onFullWindow);

    sendMinerPosition();

    // Perform first activation
    ['fullWindow', 'gcTable'].forEach(prefName => {
        if (prefName in __prefsHandlers)
            __prefsHandlers[prefName](DAF_getValue(prefName));
    });
}
/*
 ** END
 *******************************************************************************/