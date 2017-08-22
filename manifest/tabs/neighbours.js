/*
 ** DA Friends - tab_neighbours.js
 */
var guiTabs = (function(self) {
    var gcImg = '<img src="/img/gc-small.png"/>';
    var clImg = '<img src="/img/cl.png"/>';
    var ofImg = '<img class="fb" src="/img/oldFriend.png" width="16" height="16"/>';
    var inTable, tbody, tfoot, total, stats, fbar;
    var tabID;
    var objectURLs = {};
    var showFns = {};

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

        var html = [];

        function addFilter(value, msgId, fn) {
            html.push('<span class="nowrap"><input type="radio" name="nFilter" id="nFilter', value, '" value="', value, '" />');
            html.push('<label for="nFilter', value, '" data-i18n-text="', msgId, '"></label></span>');
            showFns[value] = fn;
        }

        addFilter('7', 'nFilter7', showOverDays(7));
        addFilter('14', 'nFilter14', showOverDays(14));
        addFilter('21', 'nFilter21', showOverDays(21));
        addFilter('28', 'nFilter28', showOverDays(28));
        addFilter('CL', 'listIn', function(n, d) {
            return parseInt(n.c_list) === 1;
        });
        addFilter('NL', 'listOut', function(n, d) {
            return parseInt(n.c_list) !== 1;
        });
        addFilter('0', 'Everyone', function(n, d) {
            return true;
        });

        if ((bgp.daGame.daUser.hasOwnProperty('player')) && bgp.daGame.daUser.player.hasOwnProperty('uid')) {
            if (bgp.daGame.daUser.player.uid == 8700592) { // Eric testing functions
                addFilter('2', 'nFilter2', showOverDays(2));
                addFilter('RE', 'recent', showRecent);
                addFilter('ABE', 'about_to_expire', function(n, d) {
                    var now = Math.round(Date.now() / 1000);
                    if (d.maxGift <= 0) {
                        return false;
                    }
                    var age = now - d.maxGift;
                    if (age < 47.95 * 3600 || age >= 48 * 3600) {
                        return false;
                    }
                    var expires = new Date((d.maxGift + 48 * 3600) * 1000);
                    console.log('ERIC', n.name, n.surname, age, 'exat', expires.toString());
                    return true;
                });
            }
        }

        fbar.innerHTML = html.join('');

        guiText_i18n(inTable);
        var f = document.getElementsByName('nFilter');

        if (!showFns.hasOwnProperty(bgp.exPrefs.nFilter)) {
            console.log('Unknown current filter.  Forcing to everyone.  Current=', bgp.exPrefs.nFilter);
            bgp.exPrefs.nFilter = '0';
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

        sorttable.makeSortable(inTable);
    }

    /*
     ** @Private - Make function to show gifters older than days
     */
    function showOverDays(days) {
        return function(n, d) {
            var now = bgp.daGame.daUser.time;
            if (d.maxGift > 0) {
                return (now - d.maxGift) >= days * 86400;
            }
            // Simple version of present for "days".  More complicated
            // would handle people who appear and disappear in a short
            // interval so that disabling and re-enabling app/facebook account
            // wouldn't work around this.
            var p = d.present[d.present.length - 1];
            return (now - p.first) >= days * 86400;
        }
    }

    /*
     ** @Private - Return recent neighbors
     */
    function showRecent(n, d) {
        var first = d.present[d.present.length - 1].first;
        return (bgp.daGame.daUser.time - first) < 86400;
    }

    /*
     ** @Private - Sync Action
     */
    function onAction(id, action, data) {}

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason, nFilter = bgp.exPrefs.nFilter) {

        if (reason == 'active') {
            return true;
        } else if (reason != 'export') {
            total.innerHTML = '0';
            tbody[0].innerHTML = '';
        }

        // ericHack();
        if (!derivedSane(bgp.daGame.daUser)) {
            console.log('Failed derivedSane');
            if (typeof bgp.daGame.daUser.derived == 'object') {
                replaceDownloadElement('derived.json', bgp.daGame.daUser.derived);
            }
            return true;
        }
        var maxAge = getMaxAge(bgp.daGame.daUser);
        htmlMaxAge(maxAge);
        var deriveOk = deriveAndCheck(bgp.daGame.daUser);
        replaceDownloadElement('derived.json', bgp.daGame.daUser.derived);
        if (!deriveOk) {
            console.log('Failed deriveAndCheck');
            return true;
        }
        var neighbours = Object.keys(bgp.daGame.daUser.neighbours).length;
        var derived = bgp.daGame.daUser.derived;
        var period = 14;
        var sort_th = 2;
        var today = getUnixTime();

        if (parseInt(nFilter) == nFilter && nFilter != 0) {
            sort_th = 4; // sort by last gift recieved for date-based filters
        }

        var counter = 0;
        var html = [];
        var showFn = showFns[nFilter];
        if (!showFn) {
            console.error('Broken internal state, missing nFilter=', nFilter);
            showFn = function() {
                return true;
            }
        }
        var sw = new StopWatch();
        sw.enabled = bgp.exPrefs.debug;
        for (uid in bgp.daGame.daUser.neighbours) {
            var pal = bgp.daGame.daUser.neighbours[uid];
            var fid = pal.fb_id;
            var r_gift = 0;
            var ago, badGift = false;
            var created_ago, gift_ago;
            var created = pal.timeCreated;

            if (derived.neighbours.hasOwnProperty(uid)) {
                created = derived.neighbours[uid].present[0].first;
            }
            created_ago = unixDaysAgo(created, today, period, false);

            if (derived.neighbours.hasOwnProperty(uid)) {
                r_gift = derived.neighbours[uid].maxGift;
            }

            // Ignore Mr. Bill
            if (uid > 1)
                badGift = r_gift < maxAge.firstValid;

            if ((!isNaN(r_gift)) && r_gift != 0) {
                gift_ago = unixDaysAgo(r_gift, today, period, false);
                ago = unixDaysAgo(r_gift, today, period);
            } else {
                gift_ago = r_gift = 0;
                ago = false;
            }

            //console.log(period, created_ago, ago, r_gift, pal);

            var player = pal.name;
            if (!player && !pal.surname) {
                // Leave this logging for now, need to check flags for portal only players!
                if (nFilter == 0) console.log(uid, pal);
                player = 'Player ' + uid;
            } else if (pal.surname)
                player += (' ' + pal.surname);

            // Neighbour Table
            var show = false;
            if (uid > 1) {
                if (!derived.neighbours[uid]) {
                    console.error("Missing derived state for uid=", uid);
                    show = true;
                } else {
                    show = showFn(pal, derived.neighbours[uid]);
                }
            }

            if ((reason != 'export') && show) {
                var fbImg = '<img class="fb" src="/img/isaFriend.png" width="16" height="16"/>';
                var lastVerified = null;
                var fb_id = fid;

                if (pal.hasOwnProperty('realFBid')) {
                    if (pal.realFBid > 0) {
                        lastVerified = unixDate(pal.timeVerified, false, false);
                        lastVerified += ', ' + unixDaysAgo(pal.timeVerified, today, 0);
                        fbImg = '<img class="fb" src="/img/isaFriend.png" width="16" height="16" title="' + lastVerified + '"/>';
                        fb_id = pal.realFBid;
                    }
                }

                html.push('<tr id="pal-', uid, '"', badGift ? ' class="bad-gift"' : '', '>');

                if (uid > 1) {
                    var a = '<a ' + (pal.hasOwnProperty('realFBname') ? ' title="' + pal.realFBname + '"' : '') + ' href="https://www.facebook.com/';

                    html.push('<td>', a, fb_id, '"><img height="50" width="50" lazy-src="', pal.pic_square, '" /></a></td>');
                    html.push('<td sorttable_customkey="', player, '">');
                    if ((lastVerified) && !pal.isFriend)
                        html.push(ofImg);
                    else
                        html.push(lastVerified ? fbImg : '');
                    html.push(a, fid, '">', player, '</a></td>');
                } else {
                    html.push('<td><img height="50" width="50" src="', pal.pic_square, '" /></td>');
                    html.push('<td sorttable_customkey="', player, '">', player, '</td>');
                }

                html.push('<td>', pal.level, '</td>');
                if (pal.lastLevel && pal.lastLevel != pal.level)
                    html.push('<td sorttable_customkey="', (today - pal.timeLevel),
                        '" title="', unixDate(pal.timeLevel), ' (', pal.lastLevel, ')', '">',
                        unixDaysAgo(pal.timeLevel, today, 0), '</td>'
                    );
                else
                    html.push('<td></td>');

                html.push('<td sorttable_customkey="', r_gift, '">', (ago === false ? '' : unixDate(r_gift, !bgp.exPrefs.hideGiftTime, false)), '</td>');
                html.push('<td sorttable_customkey="', r_gift, '">', (ago === false ? '' : ago), '</td>');
                html.push('<td sorttable_customkey="', pal.c_list, '">', (parseInt(pal.c_list) === 1 ? clImg : ''), '</td>');
                html.push('<td sorttable_customkey="', created, '">', unixDate(created, false, false), '</td>');
                html.push('<td>', unixDaysAgo(created, today, 0), '</td>');
                html.push('</tr>');

                counter = counter + 1;
            } else if (show) {
                // TODO - Neighbour Export
            }
        }
        sw.elapsed('HTML generation');

        if (reason != 'export') {
            tbody[0].innerHTML = html.join('');
            sw.elapsed('HTML injection');
            self.collectLazyImages();
            sw.elapsed('Preparing lazy load');
            self.setPref('nFilter', nFilter);

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

            self.linkTabs(inTable);
            sorttable.sortTable(inTable.tHead.rows[0].cells[sort_th]);
            sw.elapsed('Table sort');
        } else {
            // TODO - Neighbour Export
        }
        sw.total('Total time');
        return true;
    }

    function derivedSane(daUser) {
        var derived = daUser.derived;
        if (typeof derived != 'object') {
            return deriveError('inTryReload', 'derived not object');
        }
        if (typeof derived.snapshot != 'object') {
            return deriveError('inTryReload', 'snapshot not object');
        }
        if (typeof derived.giftCount != 'object') {
            return deriveError('inTryReload', 'giftCount not object');
        }
        delete derived.error;
        if (!(derived.snapshot.length > 0)) {
            return deriveError('inTryReload', 'derived snapshot empty');
        }
        if (derived.lastDerived != daUser.time) {
            return deriveError('inTryReload', 'derivation time mismatch', derived.lastDerived, daUser.time);
        }
        return true;
    }

    function getMaxAge(daUser) {
        // 8 hours of safety margin on known-bad values appearing at 48 hours
        const maxGap = (48 - 8) * 60 * 60;
        var derived = daUser.derived;
        var max = derived.lastDerived;
        var prev = max;
        for (var i = derived.snapshot.length - 1; i >= 0; i--) {
            var at = derived.snapshot[i];
            if ((prev - at) <= maxGap) {
                prev = at;
            } else {
                console.log('excessive gap of ', prev - at, '>', maxGap, 'at', at);
                break;
            }
        }
        return {
            valid: max - prev,
            possible: max - derived.snapshot[0],
            firstValid: prev
        };
    }

    function htmlMaxAge(maxAge) {
        var validDays = maxAge.valid / (24 * 3600);
        var possibleDays = maxAge.possible / (24 * 3600);
        if (bgp.exPrefs.debug) {
            console.log('maxAge.valid', maxAge.valid, '=', validDays.toFixed(1), 'days');
            console.log('maxAge.possible', maxAge.possible, '=', possibleDays.toFixed(1), 'days');
        }

        document.getElementById('inGiftHistoryValid').innerHTML = guiString('inGiftHistoryValid', [Math.floor(validDays), Math.floor(possibleDays)]);
    }

    function deriveAndCheck(daUser) {
        var derived = daUser.derived;

        var snapshotRelative = calculateSnapshotRelative(derived);
        for (var i in derived.neighbours) {
            if (!derived.neighbours.hasOwnProperty(i)) {
                continue;
            }
            if (!deriveAndCheckNeighbour(i, derived.neighbours[i], snapshotRelative, derived.giftCount)) {
                return false;
            }
            // console.log('neighbour', i, 'maxGift=', derived.neighbours[i].maxGift);
        }
        return true;
    }

    function deriveError() { // locale_key, extra_args_to_log...
        var args = Array.prototype.slice.call(arguments);
        if (typeof bgp.daGame.daUser.derived == 'object') {
            bgp.daGame.daUser.derived.error = args;
        }

        console.log.apply(console, args);
        var elem = document.getElementById('inErrorMessage');
        if (elem) {
            elem.innerHTML = '<br>Error: ' + guiString(args[0]);
        } else {
            console.error('missing inErrorMessage element');
        }
        return false;
    }

    function calculateSnapshotRelative(derived) {
        var ret = {};
        var snapshot = derived.snapshot;
        for (var i = 0; i < snapshot.length; i++) {
            ret[snapshot[i]] = {};
            if (i > 0) {
                ret[snapshot[i]].prev = snapshot[i - 1];
            }
            if ((i + 1) < snapshot.length) {
                ret[snapshot[i]].next = snapshot[i + 1];
            }
        }
        return snapshot;
    }

    function deriveAndCheckNeighbour(id, neighbour, snapshotRelative, giftCount) {
        var recGift = neighbour.recGift;
        for (var n = 0; n < recGift.length; n++) {
            if (recGift[n].val == 0 && recGift[n].hasOwnProperty('upstreamWrongZero')) {
                // Bug in gameDiggy caused us to count any zero after already seeing a zero as a "wrong zero"
                // Remove this after 2018-03-01 (~6 months) since everyone should have gotten the update by then.
                delete recGift[n].upstreamWrongZero;
            }

            if (recGift[n].val <= recGift[n].first) {
                // timestamp on the gift should be before the timestamp of when we saw it.
            } else {
                return deriveError('inGiftInconsistency', 'gifted_before_seen', id, n);
            }

            if (recGift[n].val == 0 && n > 0) {
                if ((recGift[n - 1].val + 48 * 3600) <= recGift[n].first) {
                    // if an entry is 0, then the delay to when we saw
                    // the zero should be at least 48 hours after the
                    // value of the previous entry.
                } else {
                    // We saw a zero too early.  We are now correcting
                    // for this error in gameDiggy.js (search for
                    // upstreamWrongZero), but people who got broken data before
                    // can't easily use the extension (this seems to be rare).
                    // Therefore we correct the data rather than report an error.
                    // After 2018-03-01 change this back to the error.  At that point
                    // everyone's data should be correct and future corrections should
                    // be handled by gameDiggy.js.
                    recGift[n].first = shouldEnd + 1;
                    recGift[n - 1].correctedWrongZero = 1;
                    // return deriveError('inGiftInconsistency', 'zero_after_48hrs', id, n);
                }
            }

            if (n > 0 && recGift[n].val > 0 && recGift[n - 1].val > 0 && recGift[n].val < recGift[n - 1].last) {
                // we saw the gift at n late, i.e. we saw the previous
                // value after the current gift had already arrived, and both
                // were valid gift dates (not the 0 of non-gifting).
                // the second (n-1) zero check shouldn't be necessary, but there's a bug
                // in upstream data.  See upstreamWrongZero in gameDiggy.js.
                if ((recGift[n - 1].val + 48 * 3600) >= recGift[n].val) {
                    // This seems to only occur if the previous gift's
                    // 48 hour timeout is after the current gift's
                    // arrival time.  Note that we already know that
                    // this gift was recent because our value was
                    // before the timestamp of the last gift, so there
                    // isn't a problem with missing snapshots.
                } else {
                    return deriveError('inGiftInconsistency', 'late_gift_with_skip', id, n,
                        'rG[n].val=', recGift[n].val,
                        'rG[n-1].last=', recGift[n - 1].last,
                        'rG[n-1].val=', recGift[n - 1].val,
                        '+ 48h=', recGift[n - 1].val + 48 * 3600,
                        'rG[n].val', recGift[n].val);
                }
            }
            // Consider adding a check that the val entries are strictly increasing.
        }

        // Can't check unGift until we have a count of the number of
        // gifts received since at 2000 gifts it's no longer true that
        // the gift arrived between the last and current snapshot.
        var unGift = neighbour.unGift;

        if (!neighbour.hasOwnProperty('maxGift')) {
            neighbour.maxGift = 0;
        }
        if (recGift.length > 0) {
            var back = recGift[recGift.length - 1];
            if (back.val == 0 && recGift.length >= 2) {
                // Necessary if someone doesn't have the neighbours tab open for a while.
                back = recGift[recGift.length - 2];
            }
            if (back.val > neighbour.maxGift) {
                neighbour.maxGift = back.val;
            }
        }
        if (unGift.length > 0) {
            var back = unGift[unGift.length - 1];
            var at = back.at;
            while (giftCount.hasOwnProperty(at) && giftCount[at] == 2000) {
                // So long as the gift count is at 2000, we have to walk back the
                // timestamp because we don't have a lower bound on when the gift
                // could have arrived.
                var rel = snapshotRelative[at];
                console.log('background-walk', at, rel);
                if (rel && rel.prev) {
                    at = rel.prev;
                } else {
                    break;
                }
            }
            var rel = snapshotRelative[at];
            if (rel && rel.prev > neighbour.maxGift) {
                neighbour.maxGift = rel.prev;
            }
        }
        delete neighbour.max_gift;
        return true;
    }

    function replaceDownloadElement(name, data) {
        if (typeof data != 'string') {
            data = JSON.stringify(data);
        }
        var data = new Blob([data], {
            type: 'text/plain'
        });
        if (objectURLs.hasOwnProperty(name)) {
            window.URL.revokeObjectURL(objectURLs[name]);
        }
        var url = window.URL.createObjectURL(data);
        objectURLs[name] = url;
        document.getElementById(name).innerHTML = '<a href="' + url + '">' + name + '</a>';
    }

    function ericHack() {
        var daUser = bgp.daGame.daUser;
        var derived = daUser.derived;
        console.log('Derived', derived);
        console.log('AnnaAnna', daUser.neighbours[11703399], derived.neighbours[11703399]);
        console.log('BiceBice', daUser.neighbours[11749738], derived.neighbours[11749738]);
        console.log('CpuCpu', daUser.neighbours[11699127], derived.neighbours[11699127]);

        var i = 0;
        var max = 0;
        for (var id in daUser.neighbours) {
            if (id == 1 || !daUser.neighbours.hasOwnProperty(id)) {
                continue;
            }
            var n = daUser.neighbours[id];
            var d = derived.neighbours[id];
            var foundZero = false;
            for (var j = 1; j < d.recGift.length; j++) {
                if (d.recGift[j].val == 0) {
                    var prev = d.recGift[j - 1];
                    var cur = d.recGift[j];
                    var delta_last_val = prev.last - prev.val;
                    var delta_last_first = prev.last - prev.first;
                    var delta_zerofirst_val = cur.first - prev.val;
                    var delta_nextval_lastzero = -1;
                    if (j + 1 < d.recGift.length) {
                        var next = d.recGift[j + 1];
                        delta_nextval_lastzero = next.val - cur.last;
                    }
                    if (1 && delta_last_val > max) { // prev.last - prev.val should be <= 2 days (172,800), can be at least 1 high
                        console.log(id, 'deltas: prev.last - prev.val', delta_last_val, '; prev.last - prev.first', delta_last_first, '; cur.first - prev.val', delta_zerofirst_val, '; next.val - cur.last', delta_nextval_lastzero);
                        max = delta_last_val;
                        foundZero = true;
                    }
                    if (delta_last_first > delta_last_val) { // longer seeing a value than it should have existed
                        console.error(id, 'broken-deltas: prev.last - prev.val', delta_last_val, '; prev.last - prev.first', delta_last_first, '; cur.first - prev.val', delta_zerofirst_val, '; next.val - cur.last', delta_nextval_lastzero);
                    }
                }
            }
            if (!foundZero) {
                continue;
            }
            // console.log(id, n, d);
            i++;
            if (i > 10) {
                break;
            }
        }
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