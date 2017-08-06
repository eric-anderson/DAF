var handler = null,
    friends = [],
    countStop = 0,
    hash = {},
    ulInactiveParent = null,
    ulInactive = null,
    liInactive = [],
    span;

init();

function init() {
    var container = document.getElementById('pagelet_timeline_medley_friends');
    if (!container) {
        alert('Something went wrong!');
    } else {
        var div = document.createElement('div');
        div.className = 'pleaseWait';
        span = document.createElement('div');
        div.appendChild(span);
        document.body.appendChild(div);

        handler = setInterval(capture, 500);
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
        Array.from(ul.getElementsByTagName('li')).forEach(li => {
            var found = null;
            Array.from(li.getElementsByTagName('a')).forEach(item => {
                if (item.innerText == '') return;
                var id, d;
                if ((d = item.getAttribute('data-hovercard')) && d.indexOf('user.php?id=') >= 0 && (id = getId(d))) {
                    found = {
                        fb_id: id,
                        realFBname: item.innerText
                    };
                } else if ((d = item.getAttribute('ajaxify')) && d.indexOf('/inactive/') >= 0 && (id = getId(d))) {
                    found = {
                        fb_id: id,
                        realFBname: item.innerText,
                        disabled: true
                    };
                }
            });
            if (found) {
                friends.push(found);
                if (found.disabled) {
                    if (!ulInactive) {
                        ulInactiveParent = ul.parentNode;
                        ulInactive = ul;
                    }
                    liInactive.push(li);
                }
            }
        });
        ul.parentNode.removeChild(ul);
        document.title = chrome.i18n.getMessage('CollectStat', [friends.length]);
        span.innerText = document.title;
    } else {
        countStop++;
        // if the connection is slow, we may want to try a bit more
        if (countStop > 20) {
            clearInterval(handler);
            document.title = chrome.i18n.getMessage('CollectStat', [friends.length]);
            span.innerText = document.title;
            chrome.runtime.sendMessage({
                cmd: 'friends-captured',
                data: friends
            });
            if (ulInactive) {
                ulInactive.innerHTML = '';
                liInactive.forEach(li => ulInactive.appendChild(li));
                ulInactiveParent.appendChild(ulInactive);
                Array.from(document.getElementsByClassName('pleaseWait')).forEach(div => div.style.display = 'none');
                ulInactive.scrollIntoView();
                // Wait for page repaint so the PleaseWait popup is removed
                setTimeout(function() {
                    alert(chrome.i18n.getMessage('DisabledAccountsDetected'));
                }, 100);
            }
            return;
        }
    }
    document.getElementById('pagelet_bluebar').scrollIntoView();
    document.getElementById('pagelet_dock').scrollIntoView();
}