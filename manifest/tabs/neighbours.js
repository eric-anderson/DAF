/*
 ** DA Friends - tab_neighbours.js
 */
var guiTabs = (function (self) {
    var gcImg = '<img src="/img/gc-small.png"/>';
    var clImg = '<img src="/img/cl.png"/>';
    var ofImg = '<img class="fb" src="/img/oldFriend.png" width="16" height="16"/>';
    var inTable, tbody, thead, tfoot, total, stats, fbar, theadSaved;
    var tabID;

    /*
     ** @Private - Initialise the tab
     */
    function onInit(id) {
        tabID = id;
        fbar = document.getElementById("inFBar");
        stats = document.getElementById("inStats");
        total = document.getElementById("inTotal");
        inTable = document.getElementById("inTable");
        tbody = inTable.getElementsByTagName("tbody");
        thead = inTable.getElementsByTagName("thead");
        guiText_i18n(inTable);
        theadSaved = thead[0].innerHTML;
        var f = document.getElementsByName('nFilter');

        for (var i = 0; i < f.length; i++) {
            if (f[i].getAttribute('value') == bgp.exPrefs.nFilter) {
                f[i].setAttribute('checked', 'checked');
            } else
                f[i].removeAttribute('checked');

            f[i].addEventListener('click', function (e) {
                var filter = e.target.getAttribute('value');
                if (bgp.exPrefs.nFilter != filter) {
                    bgp.exPrefs.nFilter = filter;
                    self.refresh(tabID);
                }
            });
        }
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason, nFilter = bgp.exPrefs.nFilter) {
        var neighbours = Object.keys(bgp.daGame.daUser.neighbours).length;
        var period = 14;
        var sort_th = 2;
        var today = new Date();
        today = today.getTime() / 1000;

        if (reason == 'active') {
            return true;
        } else if (reason != 'export') {
            total.innerHTML = '0';
            tbody[0].innerHTML = '<tr></tr><tr></tr>';
            thead[0].innerHTML = theadSaved;
            sorttable.makeSortable(inTable);
        }

        if (nFilter != "GC" && nFilter != "CL" && nFilter != "NL" && nFilter != "NG") {
            period = parseInt(nFilter);
            if (isNaN(period))
                period = 14;
            nFilter = period;
            sort_th = 3;
        } else {
            period = 0;
        }

        var counter = 0;
        for (uid in bgp.daGame.daUser.neighbours) {
            var pal = bgp.daGame.daUser.neighbours[uid];
            var fid = pal.fb_id;
            var r_gift = parseInt(pal.rec_gift);
            var ago, badGift = false;

            // Failsafe, check if the r_gift is still valid
            // if not we use the last good one and flag to the
            // user.
            if (pal.hasOwnProperty('lastGift')) {
                if (r_gift < pal.lastGift) {
                    r_gift = pal.lastGift;
                    badGift = true;
                }
            }

            if ((!isNaN(r_gift)) && r_gift != 0) {
                ago = unixDaysAgo(r_gift, today, period);
            } else {
                r_gift = 0;
                ago = false;
            }

            var player = pal.name;
            if (!player && !pal.surname) {
                // Leave this logging for now, need to check flags for portal only players!
                if (nFilter == 0) console.log(uid, pal);
                player = 'Player ' + uid;
            } else if (pal.surname)
                player += (' ' + pal.surname);

            // Neighbour Table
            var show = false;
            if (nFilter == "CL") {
                show = parseInt(pal.c_list) === 1 ? true : false;
            } else if (nFilter == "NL") {
                show = parseInt(pal.c_list) !== 1 ? true : false;
            } else if (nFilter == "GC") {
                show = parseInt(pal.spawned) === 1 ? true : false;
            } else if (nFilter == "NG") {
                show = (r_gift == 0 && uid > 1) ? true : false;
            } else if (period > 0) {
                if (ago !== false)
                    show = true;
            } else
                show = true;

            if ((reason != 'export') && show) {
                var fbImg = '<img class="fb" src="/img/isaFriend.png" width="16" height="16"/>';
                var lastVerified = null;
                var fb_id = fid;

                if (pal.hasOwnProperty('realFBid')) {
                    if (pal.realFBid > 0) {
                        lastVerified = unixDate(pal.timeVerified, false, false);
                        lastVerified += ', ' + unixDaysAgo(pal.timeVerified, today, 0);
                        fbImg = '<img class="fb" src="img/isaFriend.png" width="16" height="16" title="' + lastVerified + '"/>';
                        fb_id = pal.realFBid;
                    }
                }

                var row = inTable.insertRow(2);
                var cell1 = row.insertCell(0);
                var cell2 = row.insertCell(1);
                var cell3 = row.insertCell(2);
                var cell4 = row.insertCell(3);
                var cell5 = row.insertCell(4);
                var cell6 = row.insertCell(5);
                var cell7 = row.insertCell(6);
                var cell8 = row.insertCell(7);
                var cell9 = row.insertCell(8);

                row.setAttribute('data-player-uid', uid);
                if (badGift)
                    row.classList.add('bad-gift');

                if (uid > 1) {
                    var a = '<a ';

                    if (pal.hasOwnProperty('realFBname'))
                        a = a + ' title="' + pal.realFBname + '"';
                    a = a + ' href="https://www.facebook.com/';

                    cell1.innerHTML = a + fb_id + '"><img src="' + pal.pic_square + '" />' + '</a>';

                    if ((lastVerified) && !pal.isFriend) {
                        cell2.innerHTML = ofImg + a + fid + '">' + player + '</a>';
                    } else
                        cell2.innerHTML = ((lastVerified) ? fbImg : '') + a + fid + '">' + player + '</a>';
                } else {
                    cell1.innerHTML = '<img src="' + pal.pic_square + '" />';
                    cell2.innerHTML = player;
                }

                cell2.setAttribute("sorttable_customkey", player);
                cell3.innerHTML = pal.level;
                cell4.setAttribute("sorttable_customkey", r_gift);
                cell4.innerHTML = unixDate(r_gift, !bgp.exPrefs.hideGiftTime, false);
                cell5.setAttribute("sorttable_customkey", r_gift);
                cell5.innerHTML = ago === false ? '' : ago;

                if (parseInt(pal.c_list) === 1)
                    cell6.innerHTML = clImg;
                cell6.setAttribute("sorttable_customkey", pal.c_list);

                if (parseInt(pal.spawned) === 1)
                    cell7.innerHTML = gcImg;
                cell7.setAttribute("sorttable_customkey", pal.spawned);

                var created = pal.timeCreated;
                cell8.setAttribute("sorttable_customkey", created);
                cell8.innerHTML = unixDate(created, false, false);
                cell9.innerHTML = unixDaysAgo(created, today, 0);

                counter = counter + 1;
            } else if (show) {
                // TODO - Neighbour Export
            }
        }

        if (reason != 'export') {
            self.setPref('nFilter', nFilter);

            if (nFilter == "GC") {
                total.innerHTML = numberWithCommas(counter) + " / " + numberWithCommas((Math.floor(Math.sqrt(neighbours - 1) + 3) + 1));
                stats.innerHTML = guiString("inStatCount", [numberWithCommas(neighbours)]);
            } else {
                if (nFilter != 0) {
                    total.innerHTML = counter + " / " + numberWithCommas(neighbours);
                    stats.innerHTML = guiString("inStatFound", [
                        numberWithCommas(counter),
                        numberWithCommas(neighbours)
                    ]);
                } else {
                    total.innerHTML = counter;
                    stats.innerHTML = guiString("inStatCount", [numberWithCommas(neighbours)]);
                }

                if ((nFilter == "NG") && bgp.daGame.daUser.newNeighbours)
                    stats.innerHTML = stats.innerHTML + ' (' +
                    guiString("inStatNew", [numberWithCommas(bgp.daGame.daUser.newNeighbours)]) +
                    ')';
            }

            self.linkTabs(inTable);
            var el = inTable.getElementsByTagName("th")[sort_th];
            sorttable.innerSortFunction.apply(el, []);
        } else {
            // TODO - Neighbour Export
        }
        return true;
    }

    /*
     ** Define this tab's details
     */
    self.tabs.Neighbours = {
        title: 'Neighbours',
        image: 'neighbours.png',
        order: 1,
        html: true,
        onInit: onInit,
        onUpdate: onUpdate
    };

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/