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
        Object.assign(div.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            height: '100%',
            width: '100%',
            backgroundColor: 'rgba(0,0,0,0.7)',
            textAlign: 'center',
            zIndex: '9999'
        });
        span = document.createElement('span');
        Object.assign(span.style, {
            position: 'relative',
            left: '50%',
            top: '50%',
            transform: 'perspective(1px) translateY(-50%) translateX(-50%)',
            backgroundColor: '#F00',
            padding: '20px',
            fontSize: '20pt',
            color: '#FFF',
            display: 'block',
            width: '50%',
            border: '2px solid #FFF',
            whiteSpace: 'pre'
        });
        span.innerText = chrome.i18n.getMessage('CollectPleaseWait');
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
                var id, inactive, d;
                d = item.getAttribute('data-hovercard') || '';
                if (!id && d.indexOf('user.php?id=') >= 0 && (id = getId(d))) {
                    inactive = false;
                }
                d = item.getAttribute('ajaxify') || '';
                if (!id && d.indexOf('/inactive/') >= 0 && (id = getId(d))) {
                    inactive = true;
                }
                return !id ? null : {
                    fb_id: id,
                    inactive: inactive,
                    realFBname: item.innerText
                };
            });
            c = c.filter(item => !!item);
            friends = friends.concat(c);
        });
        ul.parentNode.removeChild(ul);
        span.innerText = chrome.i18n.getMessage('CollectPleaseWait') + '\n' + chrome.i18n.getMessage('CollectStat', [friends.length]);
    } else {
        countStop++;
        if (countStop > 10) {
            clearInterval(handler);
            span.innerText = chrome.i18n.getMessage('CollectStat', [friends.length]);
            chrome.runtime.sendMessage({
                cmd: 'friends-captured',
                data: friends
            });
        }
    }
    document.getElementById('pagelet_bluebar').scrollIntoView();
    document.getElementById('pagelet_dock').scrollIntoView();
}