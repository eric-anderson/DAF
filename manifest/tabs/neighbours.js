/*
 ** DA Friends - tab_neighbours.js
 */
var guiTabs = (function(self) {
    var gcImg = '<img src="/img/gc-small.png"/>';
    var clImg = '<img src="/img/cl.png"/>';
    var ofImg = '<img class="fb" src="/img/oldFriend.png" width="16" height="16"/>';
    var inTable, tbody, thead, tfoot, total, stats, fbar, theadSaved;
    var tabID, limited = (localStorage.installType != 'development');

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

        var html = [];
        if (!limited) {
            html.push('<input type="radio" name="nFilter" value="7"  /><span data-i18n-text="nFilter7"></span>');
            html.push('<input type="radio" name="nFilter" value="14" /><span data-i18n-text="nFilter14"></span>');
            html.push('<input type="radio" name="nFilter" value="21" /><span data-i18n-text="nFilter21"></span>');
            html.push('<input type="radio" name="nFilter" value="28" /><span data-i18n-text="nFilter28"></span>');
            html.push('<input type="radio" name="nFilter" value="NG" /><span data-i18n-text="noGifts"></span>');
        }
        html.push('<input type="radio" name="nFilter" value="CL" /><span data-i18n-text="listIn"></span>');
        html.push('<input type="radio" name="nFilter" value="NL" /><span data-i18n-text="listOut"></span>');
        html.push('<input type="radio" name="nFilter" value="0" /><span data-i18n-text="Everyone"></span>');
        fbar.innerHTML = html.join('');

        guiText_i18n(inTable);
        theadSaved = thead[0].innerHTML;
        var f = document.getElementsByName('nFilter');

        if (limited) {
            if (bgp.exPrefs.nFilter != 'CL' && bgp.exPrefs.nFilter != 'NL' && bgp.exPrefs.nFilter != '0')
                bgp.exPrefs.nFilter = '0';
        }else {
            // As we have removed the GC filter (for now)
            // We will force any saved nFilter that points
            // to the GC filter to the NG filter
            if (bgp.exPrefs.nFilter == 'GC')
                bgp.exPrefs.nFilter = 'NG';
        }

        for (var i = 0; i < f.length; i++) {
            if (f[i].getAttribute('value') == bgp.exPrefs.nFilter) {
                f[i].setAttribute('checked', 'checked');
            } else
                f[i].removeAttribute('checked');

            f[i].addEventListener('click', function(e) {
                var filter = e.target.getAttribute('value');
                if (bgp.exPrefs.nFilter != filter) {
                    bgp.exPrefs.nFilter = filter;
                    self.refresh(tabID);
                }
            });
        }
    }

    /*
     ** @Private - Sync Action
     */
    function onAction(id, action, data) {
        //console.log(id, "onAction", action, data);
        if (action == 'friend_child_charge') {
            // Lazy! - TODO: use row ID (pal-$uid$) and update in realtime
            // However, maybe better to get rid of the GC's on the neighbours
            // tab all together given we have the children Tab AND Eric's
            // gcTable game overlay
            //
            self.refresh(id);
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

        if ((!limited) && nFilter != "GC" && nFilter != "CL" && nFilter != "NL" && nFilter != "NG") {
            period = parseInt(nFilter);
            if (isNaN(period))
                period = 14;
            nFilter = period;
            sort_th = 3;
        } else {
            period = 0;
        }

        var counter = 0;
        var html = [];

        for (uid in bgp.daGame.daUser.neighbours) {
            var pal = bgp.daGame.daUser.neighbours[uid];
            var fid = pal.fb_id;
            var r_gift = parseInt(pal.rec_gift);
            var ago, badGift = false;

            // Failsafe, check if the r_gift is still valid
            // if not we use the last good one and flag to the
            // user.
            if (pal.hasOwnProperty('lastGift')) {
                if ((!limited) && r_gift < pal.lastGift) {
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

                html.push('<tr id="pal-', uid, '"', badGift ? ' class="bad-gift"' : '', '>');

                if (uid > 1) {
                    var a = '<a ' + (pal.hasOwnProperty('realFBname') ? ' title="' + pal.realFBname + '"' : '') + ' href="https://www.facebook.com/';

                    html.push('<td>', a, fb_id, '"><img src="', pal.pic_square, '" /></a></td>');
                    html.push('<td sorttable_customkey="', player, '">');
                    if ((lastVerified) && !pal.isFriend)
                        html.push(ofImg);
                    else
                        html.push(lastVerified ? fbImg : '');
                    html.push(a, fid, '">', player, '</a></td>');
                } else {
                    html.push('<td><img src="', pal.pic_square, '" /></td>');
                    html.push('<td sorttable_customkey="', player, '">', player, '</td>');
                }

                html.push('<td>', pal.level, '</td>');

                if (limited) {
                    html.push('<td>', '</td>');
                    html.push('<td>', '</td>');
                } else {
                    html.push('<td sorttable_customkey="', r_gift, '">', unixDate(r_gift, !bgp.exPrefs.hideGiftTime, false), '</td>');
                    html.push('<td sorttable_customkey="', r_gift, '">', (ago === false ? '' : ago), '</td>');
                }

                html.push('<td sorttable_customkey="', pal.c_list, '">', (parseInt(pal.c_list) === 1 ? clImg : ''), '</td>');
                html.push('<td sorttable_customkey="', pal.spawned, '">', (parseInt(pal.spawned) === 1 ? gcImg : ''), '</td>');

                var created = pal.timeCreated;
                html.push('<td sorttable_customkey="', created, '">', unixDate(created, false, false), '</td>');
                html.push('<td>', unixDaysAgo(created, today, 0), '</td>');
                html.push('</tr>');

                counter = counter + 1;
            } else if (show) {
                // TODO - Neighbour Export
            }
        }

        if (reason != 'export') {
            tbody[0].innerHTML = html.join('');
            self.setPref('nFilter', nFilter);

            if (nFilter == "GC") {
                var realNeighbours = neighbours - 1;
                stats.innerHTML = guiString("inStatCount", [numberWithCommas(neighbours)]) +
                    " - " +
                    self.childrenStats(realNeighbours);
                total.innerHTML = numberWithCommas(counter) +
                    " / " +
                    numberWithCommas(self.childrenMax(realNeighbours) + 1);
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
        onAction: onAction,
        onUpdate: onUpdate
    };

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/