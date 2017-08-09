var handler = null,
    friends = [],
    countStop = 0,
    hash = {},
    ulInactiveParent = null,
    ulInactive = null,
    liInactive = [],
    wait;

init();

function init() {
    var container = document.getElementById('pagelet_timeline_medley_friends');
    if (!container) {
        alert('Something went wrong!');
    } else {
        wait = Dialog();
        wait.element.classList.add('DAF-md-wait');
        wait.show();

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
        wait.setText(document.title);
    } else {
        countStop++;
        // if the connection is slow, we may want to try a bit more
        if (countStop > 20) {
            clearInterval(handler);
            document.title = chrome.i18n.getMessage('CollectStat', [friends.length]);
            wait.setText(document.title);
            chrome.runtime.sendMessage({
                cmd: 'friends-captured',
                data: friends,
                close: !ulInactive
            });
            if (ulInactive) {
                ulInactive.innerHTML = '';
                liInactive.forEach(li => ulInactive.appendChild(li));
                ulInactiveParent.appendChild(ulInactive);
                ulInactive.scrollIntoView();
                wait.hide();
                Dialog().show({
                    text: chrome.i18n.getMessage('DisabledAccountsDetected'),
                    style: [Dialog.OK]
                });
            }
            return;
        }
    }
    document.body.scrollIntoView(true);
    document.getElementById('pagelet_dock').scrollIntoView();
}