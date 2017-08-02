var handler = null,
    friends = [],
    countStop = 0,
    hash = {},
    span;

init();

function init() {
    var parts = location.pathname.split('/');
    if (location.host != 'www.facebook.com') {
        alert('Not a FB page');
    } else if (parts[2] && parts[2].startsWith('friends')) {
        var div = document.createElement('div');
        div.className = 'pleaseWait';
        span = document.createElement('div');
        div.appendChild(span);
        document.body.appendChild(div);

        handler = setInterval(capture, 500);
    } else {
        chrome.runtime.sendMessage({
            cmd: 'friends-capture',
            data: parts[1]
        });
    }
}

function getId(d) {
    var i = d.indexOf('?id=');
    if (i < 0) return null;
    d = d.substr(i + 4);
    i = d.indexOf('&');
    return i > 0 ? d.substr(0, i) : d;
}

function capture() {
    var container = document.getElementById('pagelet_timeline_medley_friends');
    var ul = container && container.getElementsByClassName('uiList')[0];
    if (ul) {
        countStop = 0;
        var a = Array.from(ul.getElementsByTagName('li'));
        a.forEach(li => {
            var b = Array.from(li.getElementsByTagName('a'));
            var c = b.map(item => {
                if (item.innerText == '') return null;
                var id, d;
                d = item.getAttribute('data-hovercard');
                if (d && d.indexOf('user.php?id=') >= 0 && (id = getId(d))) {
                    return {
                        fb_id: id,
                        realFBname: item.innerText
                    };
                }
                d = item.getAttribute('ajaxify');
                if (d && d.indexOf('/inactive/') >= 0 && (id = getId(d))) {
                    return {
                        fb_id: id,
                        realFBname: item.innerText,
                        disabled: true
                    };
                }
                return null;
            });
            c = c.filter(item => !!item);
            friends = friends.concat(c);
        });
        ul.parentNode.removeChild(ul);
        document.title = chrome.i18n.getMessage('CollectStat', [friends.length]);
        span.innerText = document.title;
    } else {
        countStop++;
        if (countStop > 10) {
            clearInterval(handler);
            document.title = chrome.i18n.getMessage('CollectStat', [friends.length]);
            span.innerText = document.title;
            chrome.runtime.sendMessage({
                cmd: 'friends-captured',
                data: friends
            });
        }
    }
    document.getElementById('pagelet_bluebar').scrollIntoView();
    document.getElementById('pagelet_dock').scrollIntoView();
}