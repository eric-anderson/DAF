/*
 ** DA Friends - content_da.js
 */
console.log('content_da.js', location.href);

if (!window.hasOwnProperty('__DAF_exPrefs')) {
    var __DAF_miner;

    /*
     ** We should have been injected by the background script into the right frame
     */
    if ((__DAF_miner = document.getElementById('miner'))) {

        // Default exPrefs for content script(s)
        window.__DAF_exPrefs = {
            DAfullwindow: "0",
            gameLang: null,
            gameNews: '',
            gcTable: true
        };

        // Before do anything, we need the current extension prefrences from the background
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
                                if (key == 'gcTable')
                                    gcTable();
                            }
                        }
                    }
                }
            });

            /*
             ** Extension message handler
             */
            console.log("onMessage Listener");
            chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
                var status = "ok",
                    results = null;
                console.log("chrome.runtime.onMessage", request);
                switch (request.cmd) {
                    case 'gameSync':
                        if (request.action == 'friend_child_charge') {
                            var el = document.getElementById('gc-' + request.data.uid);
                            if (el)
                                el.parentNode.removeChild(el);
                        }
                        break;
                    case 'gameDone':
                        gcTable();
                        break;
                }
                return true; // MUST return true; here!
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
             ** Sniff the game language
             */
            var i, p = __DAF_miner.getElementsByTagName("param")
            if (p.hasOwnProperty('flashvars')) {
                p = p['flashvars'].value;
                if ((i = p.indexOf('lang=')) != -1) {
                    p = p.substr(i + 5, 2);
                    __DAF_setValue('gameLang', p);
                }
            }

            /********************************************************************
             ** Sniff any news item
             */
            var news = '';
            Array.prototype.forEach.call(document.getElementsByClassName("news"), function (el) {
                news = el.innerHTML;
            });
            __DAF_setValue('gameNews', news);

            /********************************************************************
             ** Vins FullWindow
             */
            var isFullwindow = true,
                btn, refresh, onResize, iframe, originalHeight;
            isFullwindow = __DAF_getValue("DAfullwindow") !== "0";

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

            originalHeight = __DAF_miner.height;
            btn = document.createElement("button");
            Object.assign(btn, {
                innerText: "\u058e",
                title: "Toggle Full Window",
                id: "DAResizeButton"
            });
            Object.assign(btn.style, {
                position: "fixed",
                top: (__DAF_miner.offsetTop + 4) + "px",
                left: "4px",
                opacity: "0.5",
                backgroundColor: "#66f",
                color: "white",
                fontSize: "16pt",
                borderRadius: "6px",
                padding: "0px 2px",
                cursor: "pointer"
            });
            document.body.appendChild(btn);

            onResize = function () {
                btn.style.top = (__DAF_miner.offsetTop + 4) + "px";
                var gcDivHeight = 0;
                var gcDiv = document.getElementById('godChildrenDiv');
                if (gcDiv) {
                    gcDivHeight = gcDiv.offsetHeight;
                    gcDiv.style.width = isFullwindow ? document.body.clientWidth : "100%";
                }
                __DAF_miner.height = isFullwindow ? document.body.clientHeight - gcDivHeight : originalHeight;
                __DAF_miner.width = isFullwindow ? document.body.clientWidth : "100%";
            };

            refresh = function () {
                __DAF_setValue("DAfullwindow", isFullwindow ? "1" : "0");
                // display news in a floating box
                iterate(document.getElementsByClassName("news"), function (el) {
                    if (el && el.style) {
                        var options = {
                            position: "fixed",
                            top: "0px",
                            left: "64px",
                            margin: "0px",
                            padding: "0px"
                        };
                        for (var name in options) {
                            el.style[name] = isFullwindow ? options[name] : "";
                        }
                    }
                });
                iterate([document.getElementsByClassName("header-menu"), document.getElementsByClassName("cp_banner bottom_banner"), getById("bottom_news"), getById("footer"), getById("gems_banner")], hide);
                document.body.style.overflowY = isFullwindow ? "hidden" : "";
                Object.assign(btn.style, isFullwindow ? {
                    backgroundColor: "white",
                    color: "black",
                    borderStyle: "inset"
                } : {
                    backgroundColor: "#66f",
                    color: "white",
                    borderStyle: "outset"
                });
                var data = "fullwindow=" + (isFullwindow ? 1 : 0);
                try {
                    window.parent.postMessage(data, "https://apps.facebook.com");
                } catch (e) {}
                try {
                    window.parent.postMessage(data, "https://portal.pixelfederation.com");
                } catch (e) {}
                onResize();
            };
            btn.externalRefresh = refresh;
            btn.addEventListener("click", function () {
                isFullwindow = !isFullwindow;
                refresh();
            });
            if (isFullwindow) {
                setTimeout(refresh, 5000);
            }

            if (onResize) window.addEventListener("resize", onResize);

            if (refresh && !btn) window.addEventListener("message", function (event) {
                if ((event.origin === "https://portal.pixelfederation.com" || event.origin === "https://diggysadventure.com") && event.data.substr(0, 11) === "fullwindow=") {
                    isFullwindow = event.data.substr(11) === "1";
                    refresh();
                    onResize();
                    setTimeout(forceResize, 2000);
                }
            });

        });

        /********************************************************************
         ** Eric's GC Table
         */
        function gcTable() {

            if (!__DAF_getValue("gcTable")) {
                var gcd = document.getElementById('godChildrenDiv');
                if (gcd) {
                    gcd.outerHTML = "";
                    delete gcd;
                }
                return;
            }

            chrome.runtime.sendMessage({
                cmd: 'getNeighbours'
            }, updateGCTable);

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
                    var gcd = document.getElementById('godChildrenDiv');
                    if (gcd) {
                        gcd.outerHTML = "";
                        delete gcd;
                    }
                    //row.innerHTML = '<td>All god children collected</td>';

                } else {
                    for (var i = 0; i < gcNeighbours.length; i++) {
                        var n = gcNeighbours[i];
                        var cell = makeGodChildrenCell(n.name, n.level, n.pic_square, n.uid)
                        row.appendChild(cell);
                    }
                }

                var resize = document.getElementById('DAResizeButton');
                if (resize && typeof resize.externalRefresh == 'function') {
                    console.log('requesting auto-resize');
                    // Add delay so table can finish rendering before resize.
                    setTimeout(function () {
                        resize.externalRefresh();
                    }, 100);
                }
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
                insertAfter(__DAF_miner, div);
                var table = document.createElement('table');
                table.setAttribute('class', 'godChildrenTable');
                div.appendChild(table);
                var tbody = document.createElement('tbody');
                table.appendChild(tbody);
                var tr = document.createElement('tr');
                tr.setAttribute('id', 'diggyGodChildrenRow');
                tbody.appendChild(tr);
                return tr;
            }
        }

    } else
        console.error("No miner frame?");
}
/*
 ** END
 *******************************************************************************/