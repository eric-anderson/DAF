var pleaseWait, span, req;

init();

function init() {
    var container = document.getElementById('pagelet_timeline_medley_friends');
    if (!container) {
        alert('Something went wrong!');
    } else {
        pleaseWait = document.createElement('div');
        pleaseWait.className = 'pleaseWait';
        span = document.createElement('div');
        pleaseWait.appendChild(span);
        document.body.appendChild(pleaseWait);

        try {
            var fb_dtsg = document.getElementsByName('fb_dtsg')[0].value;
            var fb_id = document.cookie.match(/c_user=(\d+)/)[1];
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
    span.innerText = message;
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
        keys.forEach(key => {
            var item = payload[key];
            if (typeof item.id == 'string' && typeof item.is_friend == 'boolean') {
                var friend = {
                    fb_id: item.id,
                    realFBname: item.name,
                };
                if (!item.is_friend) friend.nonfriend = true;
                friends.push(friend);
            }
        });
        document.title = chrome.i18n.getMessage('CollectStat', [friends.length]);
        span.innerText = document.title;
        chrome.runtime.sendMessage({
            cmd: 'friends-captured',
            data: friends
        });
    } catch (e) {
        transferError(e.message);
    }
}