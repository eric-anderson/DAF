var wait, fb_dtsg, fb_id, req, ghosts, numGhosts, numGhostsProcessed, numGhostsRemoved, dialog;

init();

function init() {
    var container = document.getElementById('pagelet_timeline_medley_friends');
    if (!container) {
        alert('Something went wrong!');
    } else {
        wait = Dialog();
        wait.element.classList.add('DAF-md-wait');
        wait.show().setText(chrome.i18n.getMessage('CollectAlternateWait'));

        try {
            fb_dtsg = document.getElementsByName('fb_dtsg')[0].value;
            fb_id = document.cookie.match(/c_user=(\d+)/)[1];
            var url = 'https://www.facebook.com/chat/user_info_all/?viewer=' + fb_id + '&cb=' + Date.now() + '&__user=' + fb_id + '&__a=1&__dyn=&__req=3m&fb_dtsg=' + fb_dtsg + '&ttstamp=&__rev=';
            req = new XMLHttpRequest();
            req.addEventListener('load', transferComplete, false);
            req.addEventListener('error', transferFailed, false);
            req.addEventListener('abort', transferCanceled, false);
            req.open('POST', url, true);
            req.send();
        } catch (e) {
            transferError(e.message);
        }
    }
}

function transferError(message) {
    wait.setText(message);
}

function transferFailed(evt) {
    transferError('The operation failed!');
}

function transferCanceled(evt) {
    transferError('The operation was canceled!');
}

function transferComplete(evt) {
    try {
        var s = req.responseText;
        var i = s.indexOf('{');
        var json = s.substr(i);
        var data = JSON.parse(json);
        var payload = data.payload;
        var keys = Object.keys(payload);
        var friends = [];
        ghosts = [];
        keys.forEach(key => {
            var item = payload[key];
            if (typeof item.id == 'string' && item.is_friend === true) {
                var friend = {
                    fb_id: item.id,
                    realFBname: item.name,
                };
                friends.push(friend);
            }
            if (item.id === 0) {
                ghosts.push(key);
            }
        });
        document.title = chrome.i18n.getMessage('CollectStat', [friends.length]);
        wait.setTitle(document.title);
        chrome.runtime.sendMessage({
            cmd: 'friends-captured',
            data: friends,
            close: ghosts.length == 0
        });
        if (ghosts.length) {
            wait.hide();
            dialog = Dialog();
            dialog.show({
                text: chrome.i18n.getMessage('GhostFriendsDetected', [ghosts.length]),
                style: [Dialog.OK, Dialog.CANCEL]
            }, function(method) {
                if (method != Dialog.OK) {
                    window.close();
                    return;
                }
                console.log(ghosts);
                numGhosts = ghosts.length;
                numGhostsProcessed = numGhostsRemoved = 0;
                removeOne();
            });
        }
    } catch (e) {
        transferError(e.message);
    }
}

function removeOne() {
    var id = ghosts.pop();
    if (id) {
        numGhostsProcessed++;
        wait.setText(chrome.i18n.getMessage('GhostFriendRemoving', [numGhostsProcessed, numGhosts]));
        var url = 'https://www.facebook.com/ajax/profile/removefriendconfirm.php?dpr=1';
        url += '&uid=' + id + '&unref=bd_friends_tab&floc=friends_tab&nctr[_mod]=pagelet_timeline_app_collection_' + fb_id + '%3A2356318349%3A2&__user=' + fb_id + '&__a=1&__dyn=&__req=1b&__be=0&__pc=PHASED%3ADEFAULT&fb_dtsg=' + fb_dtsg + '&ttstamp=&__rev=';
        var req = new XMLHttpRequest();
        req.addEventListener('load', transferComplete, false);
        req.addEventListener('error', transferFailed, false);
        req.addEventListener('abort', transferFailed, false);
        req.open('POST', url, true);
        req.send();
    } else {
        wait.hide();
        dialog.show({
            text: chrome.i18n.getMessage('GhostFriendRemoved', [numGhostsRemoved]),
            style: [Dialog.OK]
        }, function(method) {
            window.close();
            return;
        });
    }

    function transferFailed() {
        console.log('Failed: ', id, req.responseText);
        removeOne();
    }

    function transferComplete() {
        console.log('Complete: ', id, req.responseText);
        if(req.responseText.indexOf('errorSummary') < 0) numRemoved++;
        removeOne();
    }
}