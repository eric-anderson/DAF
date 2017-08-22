/*
 ** DA Friends - friendship.js
 */
var guiTabs = (function(self) {
    var tabID, ifTable, theadSaved, matchingUid;
    var firstTimeManualHelp = true,
        numFriends = 0,
        numDisabled = 0,
        numNeighbours = 0,
        numMatched = 0,
        numMatchedImage = 0,
        numMatchedManually = 0,
        numIgnored = 0,
        numAnalyzed = 0,
        numToAnalyze = 0;

    /*
     ** Define this tab's details
     */
    var thisTab = {
        title: 'Friendship',
        image: 'friends.png',
        order: 4,
        html: true,
        onInit: onInit,
        onUpdate: onUpdate,
        onAction: onAction
    };
    self.tabs.Friendship = thisTab;

    /*
     ** @Private - Initialise the tab
     */
    function onInit(id, cel) {
        // Do any one time initialisation stuff in here
        tabID = id;

        document.getElementById('ifCollect').addEventListener('click', showCollectDialog);

        ifTable = document.getElementById('ifTable');
        guiText_i18n(ifTable);
        theadSaved = ifTable.tHead.innerHTML;
        ifTable.tBodies[0].addEventListener('click', tableClick);

        document.getElementById('fMatchPlayer').addEventListener('click', cancelMatch);

        var select = document.getElementById('fFilter');
        var filters = 'ADMGHIFUN'.split('');
        filters.forEach(char => {
            var option = document.createElement('option');
            option.value = char;
            select.appendChild(option);
        });
        var filter = bgp.exPrefs.fFilter;
        if (filters.indexOf(filter) < 0) filter = filters[0];
        select.value = filter;
        select.addEventListener('change', function(e) {
            var filter = document.getElementById('fFilter').value;
            bgp.exPrefs.fFilter = filter;
            filterTable();
        });
    }

    /*
     ** @Private - Sync Action
     */
    function onAction(id, action, data) {
        //console.log(id, "onAction", action, data);
        if (action == 'friends-analyze') {
            matchStoreAndUpdate();
        }
    }

    function filterTable() {
        var filter = bgp.exPrefs.fFilter;
        var select = document.getElementById('fFilter');
        select.value = filter;
        self.wait.show();
        setTimeout(() => {
            ifTable.tBodies[0].setAttribute('filter', filter);
            setTimeout(() => {
                self.wait.hide();
                // Dispatch the scroll event to load lazy images brought into view by the filter
                window.dispatchEvent(new Event("scroll"));
            }, 0);
        }, 50);

    }

    function storeFriends(flagStoreNeighbours) {
        bgp.daGame.setFriends();
        // store neighbours
        if (flagStoreNeighbours) bgp.daGame.cacheSync();
    }

    function showCollectDialog() {
        function msg(id) {
            return Dialog.escapeHtmlBr(guiString(id));
        }

        function button(id) {
            var msgId = 'fCollect' + id.charAt(0).toUpperCase() + id.substr(1);
            return '<tr><td><button value="' + id + '">' + msg(msgId) + '</button></td><td>' + msg(msgId + 'Info') + '</td></tr>';
        }
        var friends = Object.values(bgp.daGame.getFriends());
        numFriends = friends.length;
        var buttons = [button('standard'), button('alternate'), numFriends > 0 ? button('match') : ''];
        self.dialog.show({
            title: guiString('fCollect'),
            html: msg('fCollectPreamble') + '<table style="margin-top:16px">' + buttons.join('') + '</table>',
            style: ['standard', 'alternate', 'match', Dialog.CANCEL]
        }, function(method) {
            var text, fn;
            if (method == 'standard' || method == 'alternate' || method == 'match') {
                var msgId = 'fCollect' + method.charAt(0).toUpperCase() + method.substr(1) + 'Info';
                self.dialog.show({
                    title: guiString('fCollect'),
                    text: guiString(msgId) + '\n\n' + guiString('ConfirmWarning'),
                    style: [Dialog.CRITICAL, Dialog.CONFIRM, Dialog.CANCEL]
                }, function(confirmation) {
                    if (confirmation != Dialog.CONFIRM) return;
                    if (method == 'standard') collectFriends(false);
                    else if (method == 'alternate') collectFriends(true);
                    else if (method == 'match') matchStoreAndUpdate();
                });
            }
        });
    }


    function collectFriends(flagAlternate) {
        var width = 1000,
            height = 500;
        chrome.windows.create({
            width: width,
            height: height,
            left: Math.floor((screen.availWidth - width) / 2),
            top: Math.floor((screen.availHeight - height) / 2),
            type: 'popup',
            url: 'https://www.facebook.com/profile.php?sk=friends'
        }, function(w) {
            var tabId = w.tabs[0].id;
            chromeMultiInject(tabId, {
                file: [
                    '/manifest/dialog.js',
                    'code:mode=' + (flagAlternate ? 2 : 1) + ';',
                    '/manifest/content_friendship.js'
                ],
                runAt: 'document_end',
                allFrames: false,
                frameId: 0
            });
        });
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        // We ignore an activated tab condition.
        if (reason == 'active')
            return true;

        // Called everytime the page is/needs updating
        updateTable();
        if (numFriends == 0) setTimeout(showCollectDialog, 500);
        return true;
    }

    function setButtonAction(button, action) {
        ['unlink', 'delete', 'ignore', 'regard', 'manual'].forEach(name => button.classList.toggle(name, name == action));
        button.title = guiString('Action' + action.substr(0, 1).toUpperCase() + action.substr(1));
    }

    function tableClick(event) {
        var row = event.target;
        while (true) {
            if (!row || row.tagName == 'TABLE') return;
            if (row.tagName == 'TR') break;
            row = row.parentNode;
        }
        var el = event.target,
            id = row.id,
            fb_id = id.startsWith('fb-') ? id.substr(3) : null,
            uid = id.startsWith('nb-') ? id.substr(3) : null,
            friend = bgp.daGame.getFriend(fb_id),
            pal = uid && getNeighbour(uid),
            flagModified = false,
            i, row2;

        if (el.tagName == 'TD' && el.cellIndex == 2 && ifTable.classList.contains('f-matching') && matchingUid && friend) {
            // MANUAL MATCH
            pal = getNeighbour(matchingUid);
            row2 = pal && document.getElementById('nb-' + pal.uid);
            if (row2) {
                matchFriendBase(friend, pal, 99);
                row.classList.remove('f-notmatched');
                row.classList.add('f-matched');
                row.classList.add('f-matched-manually');
                row.classList.add('f-neighbour');
                row.cells[2].innerText = friend.score;
                for (i = 4; i <= 8; i++) row.cells[i].innerHTML = row2.cells[i].innerHTML;
                row2.parentNode.removeChild(row2);
                setButtonAction(row.cells[3].getElementsByTagName('button')[0], 'unlink');
                flagModified = true;
            }
            cancelMatch();
        } else if (el.tagName != 'BUTTON' || !el.classList.contains('action')) {
            return;
        } else if (el.classList.contains('unlink') && friend && friend.score > 0 && friend.uid) {
            // UNLINK
            row.classList.remove('f-matched');
            if (row.classList.contains('f-matched-image')) {
                numMatchedImage--;
                row.classList.remove('f-matched-image');
            }
            if (row.classList.contains('f-matched-manually')) {
                numMatchedManually--;
                row.classList.remove('f-matched-manually');
            }
            row.classList.add('f-notmatched');
            row.cells[2].innerHTML = '';

            row2 = row.cloneNode(true);
            row.parentNode.insertBefore(row2, row);

            row2.classList.remove('f-neighbour');
            for (i = 4; i <= 8; i++) row2.cells[i].innerHTML = '';
            setButtonAction(row2.cells[3].getElementsByTagName('button')[0], 'ignore');

            row.classList.remove('f-friend');
            row.classList.remove('f-disabled');
            row.id = 'nb-' + friend.uid;
            for (i = 0; i <= 1; i++) row.cells[i].innerHTML = '';
            setButtonAction(row.cells[3].getElementsByTagName('button')[0], 'manual');

            numMatched--;
            delete friend.uid;
            delete friend.score;
            flagModified = true;
        } else if (friend && (el.classList.contains('ignore') || el.classList.contains('regard'))) {
            // IGNORE or REGARD
            var flag = el.classList.contains('ignore');
            row.classList.toggle('f-ignored', flag);
            setButtonAction(el, flag ? 'regard' : 'ignore');
            if (flag) numIgnored++;
            else numIgnored--;
            delete friend.uid;
            delete friend.score;
            if (flag) friend.score = -1;
            flagModified = true;
        } else if (el.classList.contains('manual') && pal) {
            if (matchingUid == pal.uid) {
                cancelMatch();
            } else {
                var div = document.getElementById('fMatchPlayer');
                div.getElementsByClassName('DAF-gc-level')[0].innerText = pal.level;
                div.getElementsByClassName('DAF-gc-avatar')[0].src = pal.pic_square;
                div.getElementsByClassName('DAF-gc-name')[0].innerText = getPlayerNameFull(pal);
                div.style.display = 'block';
                ifTable.classList.add('f-matching');
                matchingUid = pal.uid;
                if (firstTimeManualHelp) {
                    firstTimeManualHelp = false;
                    self.dialog.show({
                        text: guiString('ManualMatchHelp'),
                        style: [Dialog.OK]
                    });
                }
            }
        }
        if (flagModified) {
            bgp.daGame.setFriend(friend)
            showStats();
            // Dispatch the scroll event to load lazy images brought into view
            window.dispatchEvent(new Event("scroll"));
        }
    }

    function cancelMatch() {
        matchingUid = null;
        document.getElementById('fMatchPlayer').style.display = 'none';
        ifTable.classList.remove('f-matching');
    }

    function getNeighboursAsNotMatched() {
        var neighbours = bgp.daGame.daUser.neighbours;
        var notmatched = Object.assign({}, neighbours);
        delete notmatched[0];
        delete notmatched[1];
        return notmatched;
    }

    function getNeighbour(uid) {
        return bgp.daGame.daUser.neighbours[uid];
    }

    function updateTable() {
        cancelMatch();

        var tbody = ifTable.getElementsByTagName("tbody")[0];
        tbody.innerHTML = '';
        ifTable.tHead.innerHTML = theadSaved;
        sorttable.makeSortable(ifTable);

        var friends = Object.values(bgp.daGame.getFriends());
        numFriends = friends.length;
        var notmatched = getNeighboursAsNotMatched();
        numNeighbours = Object.keys(notmatched).length;
        numMatched = numMatchedImage = numMatchedManually = numDisabled = numIgnored = 0;
        var html = [];

        var today = getUnixTime();

        function pushCreated(info) {
            if (info && info.created) {
                html.push('<td sorttable_customkey="', info.created, '">', unixDate(info.created, false, false), '</td>');
                html.push('<td>', unixDaysAgo(info.created, today, 0), '</td>');
            } else {
                html.push('<td></td><td></td>');
            }
        }

        var buttonUnlink = '<button class="action unlink" title="' + Dialog.escapeHtml(guiString('ActionUnlink')) + '"></button>',
            buttonIgnore = '<button class="action ignore" title="' + Dialog.escapeHtml(guiString('ActionIgnore')) + '"></button>',
            buttonRegard = '<button class="action regard" title="' + Dialog.escapeHtml(guiString('ActionRegard')) + '"></button>',
            buttonManual = '<button class="action manual" title="' + Dialog.escapeHtml(guiString('ActionManual')) + '"></button>';

        friends.forEach(friend => {
            var fb_id = friend.fb_id,
                info = friend.score > 0 && getNeighbourCellData(notmatched[friend.uid], true),
                classes = ['f-friend', info ? 'f-neighbour f-matched' : 'f-notmatched'];
            if (friend.disabled) {
                numDisabled++;
                classes.push('f-disabled');
            }
            if (info && friend.score == 95) {
                numMatchedImage++;
                classes.push('f-matched-image');
            }
            if (info && friend.score == 99) {
                numMatchedManually++;
                classes.push('f-matched-manually');
            }
            if (friend.score == -1) {
                classes.push('f-ignored');
                numIgnored++;
            }
            html.push('<tr id="fb-', fb_id, '" class="', classes.join(' '), '">');
            var a = getFBFriendAnchor(fb_id);
            html.push('<td>', a, '<img height="50" width="50" lazy-src="', getFBFriendAvatarUrl(fb_id), '"/></a></td>');
            html.push('<td>', a, friend.name, '</a></td>');
            if (info) {
                numMatched++;
                html.push('<td>', friend.score, '</td>');
                html.push('<td>', buttonUnlink, '</td>');
                html.push('<td>', info.anchor, info.image, '</a></td>');
                html.push('<td>', info.anchor, info.name, '</a></td>');
                html.push('<td>', info.level, '</td>');
                delete notmatched[friend.uid];
            } else {
                html.push('<td></td><td>', friend.score == -1 ? buttonRegard : buttonIgnore, '</td><td></td><td><td></td></td>');
            }
            pushCreated(info);
            html.push('</tr>');
        });
        Object.keys(notmatched).forEach(uid => {
            var info = getNeighbourCellData(notmatched[uid], true);
            html.push('<tr id="nb-', uid, '" class="f-neighbour f-notmatched">');
            html.push('<td></td><td></td><td></td><td>', buttonManual, ' </td>');
            html.push('<td>', info.anchor, info.image, '</a></td>');
            html.push('<td>', info.anchor, info.name, '</a></td>');
            html.push('<td>', info.level, '</td>');
            pushCreated(info);
            html.push('</tr>');
        });

        tbody.innerHTML = html.join('');

        self.collectLazyImages();
        filterTable();

        showStats();
    }

    function getFBFriendAvatarUrl(fb_id) {
        return 'https://graph.facebook.com/v2.8/' + fb_id + '/picture';
    }

    function getFBFriendAnchor(fb_id) {
        return '<a target="_blank" href="https://www.facebook.com/' + fb_id + '">';
    }

    function getNeighbourCellData(pal, lazy) {
        if (!pal) return null;
        var created = null;
        try {
            created = bgp.daGame.daUser.derived.neighbours[pal.uid].present[0].first;
        } catch (e) {
            created = pal.timeCreated;
        }
        return {
            anchor: getFBFriendAnchor(pal.fb_id),
            image: '<img height="50" width="50" ' + (lazy ? 'lazy-' : '') + 'src="' + pal.pic_square + '"/>',
            name: getPlayerNameFull(pal),
            level: pal.level,
            created: created
        };
    }

    function showStats() {
        if (numToAnalyze == numAnalyzed || numToAnalyze == 0) {
            self.wait.hide();
        } else {
            var num = Math.min(numAnalyzed > 0 ? numAnalyzed + 1 : 0, numToAnalyze);
            self.wait.setText(guiString('AnalyzingMatches', [Math.floor(num / numToAnalyze * 100), num, numToAnalyze]));
        }
        var html = [];
        if (bgp.daGame.friendsCollectDate > 0) {
            html.push(guiString('FriendUpdateInfo', [numberWithCommas(numFriends), numberWithCommas(numNeighbours), unixDate(bgp.daGame.friendsCollectDate, 'full')]));
        }
        if (numToAnalyze != numAnalyzed) {
            if (bgp.daGame.friendsCollectDate > 0)
                html.push('<br>');
            html.push(guiString('AnalyzingMatches', [Math.floor(numAnalyzed / numToAnalyze * 100)]));
        }
        document.getElementById('ifStats').innerHTML = html.join('');

        var params = {
            'fFilterA': [numberWithCommas(numFriends), numberWithCommas(numNeighbours)],
            'fFilterD': [numberWithCommas(numDisabled)],
            'fFilterM': [numberWithCommas(numMatched)],
            'fFilterG': [numberWithCommas(numMatchedImage)],
            'fFilterH': [numberWithCommas(numMatchedManually)],
            'fFilterI': [numberWithCommas(numIgnored)],
            'fFilterF': [numberWithCommas(numFriends - numMatched - numIgnored)],
            'fFilterU': [numberWithCommas(numFriends - numMatched)],
            'fFilterN': [numberWithCommas(numNeighbours - numMatched)]
        };
        Array.from(document.getElementById('fFilter').getElementsByTagName('option')).forEach(option => {
            var msgId = 'fFilter' + option.value;
            option.innerText = guiString(msgId, params[msgId]);
        });
    }

    function matchFriendBase(friend, pal, score) {
        if (!friend || !pal) return false;
        friend.uid = pal.uid;
        friend.score = score;
        pal.isFriend = true;
        pal.realFBid = friend.fb_id;
        if (!pal.timeVerified)
            pal.timeVerified = getUnixTime();
        var fullName = getPlayerNameFull(pal);
        if (fullName == friend.name) delete pal.realFBname;
        else pal.realFBname = friend.name;
        numMatched++;
        if (score == 95) numMatchedImage++;
        if (score == 99) numMatchedManually++;
        return true;
    }

    function matchStoreAndUpdate() {
        var rest, notmatched, images, friendData, neighbourData, canvas;
        var hashById = {},
            hashByName = {};

        cancelMatch();

        var friends = Object.values(bgp.daGame.getFriends());
        numFriends = friends.length;
        if (numFriends == 0) return;

        notmatched = getNeighboursAsNotMatched();
        numNeighbours = Object.keys(notmatched).length;

        numMatched = numMatchedImage = numMatchedManually = numToAnalyze = numAnalyzed = numIgnored = 0;

        // we reset the isFriend flag
        Object.keys(notmatched).forEach(uid => {
            notmatched[uid].isFriend = false;
        });

        // we reset the association on friends
        friends.forEach(friend => {
            // we keep those who match by id or image, and clear the others
            if (friend.uid && friend.uid in notmatched && friend.score >= 95) {
                matchFriend(friend, notmatched[friend.uid], friend.score);
            } else if (friend.score == -1) {
                numIgnored++;
            } else {
                delete friend.uid;
                delete friend.score;
            }
        });

        rest = friends;
        rest = rest.filter(friend => !friend.score);

        // sort friends, disabled last
        rest.sort((a, b) => (a.disabled ? 1 : 0) - (b.disabled ? 1 : 0));

        matchRest(false);

        // Collect images to match
        images = [];
        rest.forEach(friend => {
            if (!friend.disabled) addImage('f' + friend.fb_id, getFBFriendAvatarUrl(friend.fb_id))
        });
        var numFriendsToAnalyze = images.length;
        Object.values(notmatched).forEach(pal => addImage('n' + pal.uid, pal.pic_square));
        var numNeighboursToAnalyze = images.length - numFriendsToAnalyze;
        // If there is at least one person in each group
        if (numFriendsToAnalyze > 0 && numNeighboursToAnalyze > 0) {
            friendData = [];
            neighbourData = [];
            canvas = document.createElement('canvas');
            // Start num parallel tasks to load images
            var num = 2;
            num = Math.min(images.length, num);
            while ((num--) > 0) collectNext(createImage());
        } else {
            numToAnalyze = numAnalyzed = 0;
            storeFriends(true);
            updateTable();

            // Signal Neighbours Tab to Refresh its display
            self.tabs['Neighbours'].time = null;
        }

        function matchFriend(friend, pal, score) {
            if (matchFriendBase(friend, pal, score)) {
                delete hashById[pal.fb_id];
                delete hashById[pal.portal_fb_id];
                delete hashByName[getPlayerNameFull(pal)];
                delete notmatched[pal.uid];
            }
        }

        function matchRest() {
            // prepare match
            // set the hashes
            hashById = {}, hashByName = {};
            Object.keys(notmatched).forEach(uid => {
                var pal = notmatched[uid],
                    key;
                // if the same key is already used, we set it to null to force an image comparison
                // store by fb_id
                key = pal.fb_id;
                hashById[key] = key in hashById ? null : pal;
                // store by portal_fb_id
                if (key != pal.portal_fb_id && (key = pal.portal_fb_id)) hashById[key] = key in hashById ? null : pal;
                // store by full name
                key = getPlayerNameFull(pal);
                hashByName[key] = key in hashByName ? null : pal;
            });

            // Match by FB id
            rest.forEach(friend => matchFriend(friend, hashById[friend.fb_id], 100));
            rest = rest.filter(friend => !friend.score);

            // prepare friends
            var hash = {}, col = rest;
            rest.forEach(friend => {
                var names = friend.name.split(' ');
                friend.names = names;
                friend.skip = false;
                if (names.length > 1) {
                    var first = names[0],
                        last = names[names.length - 1],
                        key1 = first + '\t' + last,
                        key2 = last + '\t' + first;
                    if (key1 in hash || key2 in hash) {
                        hash[key1].skip = true;
                        friend.skip = true;
                    } else {
                        hash[key1] = hash[key2] = friend;
                    }
                }
            });

            var skipped = rest.filter(friend => friend.skip);
            if (bgp.exPrefs.debug) console.log("Skipped", skipped);
            rest = rest.filter(friend => !friend.skip);

            // Match functions [score, fn] in order of score descending
            var matchFunctions = [
                // Match by full name
                [90, friend => hashByName[friend.name]],
                // Match by first name + last name
                [80, friend => {
                    var names = friend.names;
                    return names.length > 1 ? hashByName[names[0] + ' ' + names[names.length - 1]] : null;
                }],
                // Match by last name + first name
                [70, friend => {
                    var names = friend.names;
                    return names.length > 1 ? hashByName[names[names.length - 1] + ' ' + names[0]] : null;
                }],
                // Chinese characters
                [60, friend => {
                    var names = friend.names,
                        ch = names[0],
                        pal = null;
                    if (names.length == 1 && ch.charCodeAt(0) >= 19968) {
                        // Match by second character (as first name) + first character (as last name)
                        pal = hashByName[ch.substr(1) + ' ' + ch.substr(0, 1)];
                        // If there are at least 4 characters
                        if (!pal && ch.length >= 4) {
                            // Match by 3rd-to-end characters (as first name) + 1st two characters (as last name)
                            pal = hashByName[ch.substr(2) + ' ' + ch.substr(0, 2)];
                        }
                    }
                    return pal;
                }]
            ];
            // try to match, one method at a time
            for (var i = 0, len = matchFunctions.length; i < len; i++) {
                var fn = matchFunctions[i][1],
                    score = matchFunctions[i][0];
                rest.forEach(friend => matchFriend(friend, fn(friend), score));
                rest = rest.filter(friend => !friend.score);
            }

            rest = rest.concat(skipped);

            // cleanup
            col.forEach(friend => {
                delete friend.names;
                delete friend.skip;
            });
        }

        function addImage(id, url) {
            numToAnalyze++;
            images.push([id, url]);
        }

        function collectNext(img) {
            var a = images.pop();
            if (a) {
                img.id = a[0];
                img.src = a[1];
            }
        }

        function createImage() {
            var img = new Image();
            img.setAttribute('crossOrigin', 'anonymous');
            img.onload = imageOnLoad;
            img.onerror = imageOnLoad;
            return img;
        }


        function imageOnLoad() {
            // this is the image used by FB when a profile has no picture
            const FB_ANON_MALE_IMG = 'data:image/webp;base64,UklGRrIAAABXRUJQVlA4IKYAAACQBwCdASoyADIAPm0qkUWkIqGYDf2AQAbEtIBp7Ay0G/WSUM7JlLizCyxMfDWO4GTZsZ3rW/OD7o4ZrD5+BT08hIdEQYAA/voQZ4IvItpppdVXQWuubgHZ7Hz5ClT98CfXGkCeTZrhstMPkFiBPgl23Ssn29LDaI8GTQEsEUH2eeI8S7rLcNeX3hT74sAvZ2QAc9yDKh3vCDZXO6AcSFxINezC50AA';
            const FB_ANON_FEMALE_IMG = 'data:image/webp;base64,UklGRr4AAABXRUJQVlA4ILIAAABwBwCdASoyADIAPm0sk0WkIqGYDP0AQAbEtIBpOAqR8vvvO+zCp3M5F/ypDPVcAFo8VaiTamuvfoNQ/F5jaFiClqnYAAD++hBpI/d9yd90D8hRGlQZaLknz1bhjUBHwA03kCUnr+UZrKEK7H/RvtF2vwwgGNTfo5enYKkJ23075Nyi25PsFHIttUiGOfXnjtuOyT6lisDClpVR4YKW7iP+LCUUBF1yzvTUONcxCYqsEAAA';
            numAnalyzed++;
            showStats();
            var img = this;
            if (img.complete && img.naturalHeight > 0) {
                // get picture as base64 string
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                var dataURL = canvas.toDataURL('image/webp');
                if (dataURL != FB_ANON_MALE_IMG && dataURL != FB_ANON_FEMALE_IMG) {
                    var isFriend = img.id.charAt(0) == 'f',
                        id = img.id.substr(1),
                        data = [id, dataURL];
                    if (isFriend) friendData.push(data);
                    else neighbourData.push(data);
                }
            }
            if (numToAnalyze && numAnalyzed == numToAnalyze) {
                // all images are loaded
                numToAnalyze = numAnalyzed = 0;
                matchByImage();
                // then try to match by name (again)
                matchRest();
                storeFriends(true);
                updateTable();

                // Signal Neighbours Tab to Refresh its display
                self.tabs['Neighbours'].time = null;
            }
            collectNext(img);
        }

        function matchByImage() {
            for (var i = 0, len = friendData.length; i < len; i++) {
                var data = friendData[i],
                    fb_id = data[0],
                    dataURL = data[1],
                    friendsMatched = friendData.filter(data => data[1] == dataURL),
                    neighbourMatched = neighbourData.filter(data => data[1] == dataURL);
                // Image should be unique
                if (friendsMatched.length == 1 && neighbourMatched.length == 1) {
                    var friend = friends.find(friend => friend.fb_id == fb_id),
                        uid = neighbourMatched[0][0],
                        pal = notmatched[uid];
                    matchFriend(friend, pal, 95);
                }
            }
            rest = rest.filter(friend => !friend.uid);
        }
    }

    function getPlayerName(pal) {
        return pal.name || 'Player ' + pal.uid;
    }

    function getPlayerNameFull(pal) {
        var name = getPlayerName(pal);
        return pal.surname ? name + ' ' + pal.surname : name;
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/