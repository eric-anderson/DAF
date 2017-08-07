/*
 ** DA Friends - friendship.js
 */
var guiTabs = (function(self) {
    var tabID, ifTable, theadSaved, matchButton;
    var numFriends = 0,
        numDisabled = 0,
        numNeighbours = 0,
        numOthers = 0,
        numMatched = 0,
        numAnalyzed = 0,
        numToAnalyze = 0;

    /*
     ** Define this tab's details
     */
    var thisTab = {
        title: 'Friendship',
        image: 'friends.png',
        order: 10,
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

        document.getElementById('ifCollect').addEventListener('click', function() { collectFriends(false); });
        document.getElementById('ifCollect2').addEventListener('click', function() { collectFriends(true); });
        matchButton = document.getElementById('ifMatch');
        matchButton.addEventListener('click', matchFriends);
        matchButton.style.display = 'none';

        ifTable = document.getElementById('ifTable');
        guiText_i18n(ifTable);
        theadSaved = ifTable.tHead.innerHTML;

        Array.from(document.getElementsByName('fFilter')).forEach(input => {
            if (input.getAttribute('value') == bgp.exPrefs.fFilter) {
                input.setAttribute('checked', 'checked');
            } else
                input.removeAttribute('checked');

            input.addEventListener('click', function(e) {
                var filter = e.target.getAttribute('value');
                bgp.exPrefs.fFilter = filter;
                filterTable();
            });
        });

        chrome.storage.local.get(['friends', 'friendsCollectDate'], (obj) => {
            bgp.daGame.friends = (obj && obj.friends) || [];
            bgp.daGame.friendsCollectDate = (obj && obj.friendsCollectDate) || 0;
            updateTable();
        });
    }

    /*
     ** @Private - Sync Action
     */
    function onAction(id, action, data) {
        //console.log(id, "onAction", action, data);
        if (action == 'friends-captured') {
            if (data && data.length) {
                bgp.daGame.friends = data;
                matchStoreAndUpdate();
            }
        }
    }

    function filterTable() {
        var filter = bgp.exPrefs.fFilter;
        var input = document.getElementById('fFilter' + filter);
        if (input) input.checked = true;
        ifTable.tBodies[0].setAttribute('filter', filter);
        // Dispatch the scroll event to load lazy images brought into view by the filter
        window.dispatchEvent(new Event("scroll"));
    }

    function storeFriends(flagStoreNeighbours) {
        chrome.storage.local.set({
            friends: bgp.daGame.friends
        });
        // store neighbours
        if (flagStoreNeighbours) bgp.daGame.cacheSync();
    }

    function collectFriends(flagAlternate) {
        var width = 1000,
            height = 500;
        if (!confirm(guiString('CollectWarning') + '\n\n' + guiString('ConfirmWarning'))) return;
        chrome.windows.create({
            width: width,
            height: height,
            left: Math.floor((screen.availWidth - width) / 2),
            top: Math.floor((screen.availHeight - height) / 2),
            type: 'popup',
            url: 'https://www.facebook.com/profile.php?sk=friends'
        }, function(w) {
            var tabId = w.tabs[0].id;
            bgp.injectFriendCollectCode(tabId, flagAlternate);
        });
    }

    function matchFriends() {
        var friends = bgp.daGame.friends instanceof Array ? bgp.daGame.friends : [];
        numFriends = friends.length;
        if (numFriends == 0) {
            return;
        }
        if (!confirm(guiString('MatchWarning') + '\n\n' + guiString('ConfirmWarning'))) return;
        matchStoreAndUpdate();
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

        return true;
    }

    function getNeighboursAsNotMatched() {
        var neighbours = bgp.daGame.daUser.neighbours;
        var notmatched = Object.assign({}, neighbours);
        delete notmatched[0];
        delete notmatched[1];
        return notmatched;
    }

    function updateTable() {
        var tbody = ifTable.getElementsByTagName("tbody")[0];
        tbody.innerHTML = '';
        ifTable.tHead.innerHTML = theadSaved;
        sorttable.makeSortable(ifTable);

        var friends = bgp.daGame.friends instanceof Array ? bgp.daGame.friends : [];
        numFriends = friends.length;
        var notmatched = getNeighboursAsNotMatched();
        numNeighbours = Object.keys(notmatched).length;
        numMatched = 0;
        numDisabled = 0;
        numOthers = 0;
        var html = [];

        var today = Math.floor(Date.now() / 1000);

        function pushCreated(info) {
            if (info && info.created) {
                html.push('<td sorttable_customkey="', info.created, '">', unixDate(info.created, false, false), '</td>');
                html.push('<td>', unixDaysAgo(info.created, today, 0), '</td>');
            } else {
                html.push('<td></td><td></td>');
            }
        }

        bgp.daGame.friends.forEach(friend => {
            var fb_id = friend.fb_id;
            var info = getNeighbourCellData(notmatched[friend.uid], true);
            var classes = [];
            if (friend.disabled) {
                numDisabled++;
                classes.push('friend-disabled');
            }
            if (friend.nonfriend) {
                numOthers++;
                classes.push('friend-not');
            }
            if (info) classes.push('friend-matched');
            if (!info) classes.push('friend-notmatched');
            html.push('<tr id="fb-', fb_id, '" class="', classes.join(' '), '">');
            var a = getFBFriendAnchor(fb_id);
            html.push('<td>', a, '<img height="50" width="50" lazy-src="', getFBFriendAvatarUrl(fb_id), '"/></a></td>');
            html.push('<td>', a, friend.realFBname, '</a></td>');
            if (info) {
                numMatched++;
                html.push('<td>', friend.score, '</td>');
                html.push('<td>', info.anchor, info.image, '</a></td>');
                html.push('<td>', info.anchor, info.name, '</a></td>');
                html.push('<td>', info.level, '</td>');
                delete notmatched[friend.uid];
            } else {
                html.push('<td></td><td></td><td></td><td></td>');
            }
            pushCreated(info);
            html.push('</tr>');
        });
        Object.keys(notmatched).forEach(uid => {
            var info = getNeighbourCellData(notmatched[uid], true);
            html.push('<tr id="nb-', uid, '" class="neighbour-notmatched">');
            html.push('<td></td><td></td><td></td>');
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
        matchButton.style.display = numFriends ? '' : 'none';

        var div = document.getElementsByClassName('pleaseWait')[0];
        if (div) {
            div.style.display = numToAnalyze != numAnalyzed ? 'block' : 'none';
            var num = Math.min(numAnalyzed > 0 ? numAnalyzed + 1 : 0, numToAnalyze);
            div.firstChild.innerText = numToAnalyze > 0 ? guiString('AnalyzingMatches', [Math.floor(num / numToAnalyze * 100), num, numToAnalyze]) : '';
        }
        var html = [];
        if (bgp.daGame.friendsCollectDate > 0) {
            html.push(guiString('FriendUpdateInfo', [unixDate(bgp.daGame.friendsCollectDate, 'full')]));
        }
        if (numToAnalyze != numAnalyzed) {
            if (bgp.daGame.friendsCollectDate > 0)
                html.push('<br>');
            html.push(guiString('AnalyzingMatches', [Math.floor(numAnalyzed / numToAnalyze * 100)]));
        }

        html.push('<hr/>');

        document.getElementById('ifStats').innerHTML = html.join('');

        var params = {
            'fFilterA': [numberWithCommas(numFriends), numberWithCommas(numNeighbours)],
            'fFilterD': [numberWithCommas(numDisabled)],
            'fFilterM': [numberWithCommas(numMatched)],
            'fFilterF': [numberWithCommas(numFriends - numMatched)],
            'fFilterN': [numberWithCommas(numNeighbours - numMatched)],
            'fFilterO': [numberWithCommas(numOthers)]
        };
        Array.from(document.getElementById('ifFBar').getElementsByTagName('label')).forEach(label => {
            if (label.htmlFor in params) label.innerText = guiString(label.htmlFor, params[label.htmlFor]);
        })
    }

    function matchStoreAndUpdate() {
        var rest, notmatched, images, friendData, neighbourData, canvas;

        if (!(bgp.daGame.friends instanceof Array)) return;
        var hashById, hashByName;

        var friends = bgp.daGame.friends instanceof Array ? bgp.daGame.friends : [];
        numFriends = friends.length;

        notmatched = getNeighboursAsNotMatched();
        numNeighbours = Object.keys(notmatched).length;

        numMatched = numToAnalyze = numAnalyzed = 0;
        var today = Math.floor(Date.now() / 1000);

        // we reset the isFriend flag
        Object.keys(notmatched).forEach(uid => {
            notmatched[uid].isFriend = false;
        });
        // we reset the association on friends
        friends.forEach(friend => {
            delete friend.uid;
            delete friend.score;
        });

        // sort friends, disabled last
        friends.sort((a, b) => (a.disabled ? 1 : 0) - (b.disabled ? 1 : 0));

        rest = friends;

        prepareMatch();
        matchRest(false);
        cleanupMatch();

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
            storeFriends(true);
            updateTable();
            showStats();
                    
            // Signal Neighbours Tab to Refresh its display
            self.tabs['Neighbours'].time = null;
        }

        function prepareMatch() {
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

            // prepare friends
            rest.forEach(friend => {
                friend.names = friend.realFBname.split(' ');
            });
        }

        function cleanupMatch() {
            friends.forEach(friend => {
                delete friend.names;
            });
        }

        function matchFriend(friend, pal, score) {
            if (!friend || !pal) return;
            friend.uid = pal.uid;
            friend.score = score;
            pal.isFriend = true;
            pal.realFBid = friend.fb_id;
            pal.timeVerified = today;
            var fullName = getPlayerNameFull(pal);
            if (fullName == friend.realFBname) delete pal.realFBname;
            else pal.realFBname = friend.realFBname;
            delete hashById[pal.fb_id];
            delete hashById[pal.portal_fb_id];
            delete hashByName[getPlayerNameFull(pal)];
            delete notmatched[pal.uid];
            numMatched++;
        }

        function matchRest() {
            // Match functions [score, fn] in order of score descending
            var matchFunctions = [
                // Match by FB id
                [100, friend => hashById[friend.fb_id]],
                // Match by full name
                [90, friend => hashByName[friend.realFBname]],
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
                rest = rest.filter(friend => !friend.uid);
            }
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
                prepareMatch();
                matchRest();
                cleanupMatch();
                storeFriends(true);
                updateTable();
                showStats();
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