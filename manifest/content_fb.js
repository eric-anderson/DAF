/*
 ** DA Friends - content_fb.js
 */
(function() {

    DAF.initialize({
        linkGrabButton: 2,
        linkGrabKey: 0,
        linkGrabSort: true,
        linkGrabReverse: false,
        linkGrabPortal2FB: false
    }, initialize);

    const LEFT_BUTTON = 0,
        KEY_ESC = 27,
        KEY_C = 67,
        OS_WIN = 1,
        OS_LINUX = 0;

    var os = ((navigator.appVersion.indexOf("Win") == -1) ? OS_LINUX : OS_WIN),
        defaultBox1 = {
            boxSizing: 'border-box',
            position: 'absolute',
            zIndex: 2147483647,
            display: 'none'
        },
        defaultBox2 = Object.assign({
            border: '1px solid #060',
            backgroundColor: 'rgba(0,255,0,0.3)'
        }, defaultBox1, {
            zIndex: 2147483646
        });

    var keyCode = 0,
        links = [],
        linkCount = 0,
        dialog, flagActive, flagShow, flagLinks, flagStopMenu, box, counter, oldLabel, mouseX, mouseY,
        startX, startY, boxX1, boxX2, boxY1, boxY2, autoScrollId, autoOpenElement, autoOpenCount,
        values, numLinks;

    function addListeners(obj, args) {
        [].slice.call(arguments, 1).forEach(fn => obj.addEventListener(fn.name, fn, true));
    }

    function removeListeners(obj, args) {
        [].slice.call(arguments, 1).forEach(fn => obj.removeEventListener(fn.name, fn, true));
    }

    function initialize() {
        dialog = Dialog();
        addListeners(window, mousedown, keydown, keyup, contextmenu);
        DAF.removeLater(() => {
            stop();
            removeListeners(window, mousedown, keydown, keyup, contextmenu);
            dialog.remove();
        });
    }

    function mousedown(event) {
        if (flagActive) {
            stop();
            // chrome.runtime.sendMessage({
            //     cmd: 'links-captured',
            //     data: values
            // });
            flagStopMenu = true;
        } else if (event.button == DAF.getValue('linkGrabButton') && keyCode == DAF.getValue('linkGrabKey')) {
            flagActive = true;
            if (os == OS_LINUX || (os == OS_WIN && DAF.getValue('linkGrabButton') == LEFT_BUTTON)) {
                event.stopPropagation();
                event.preventDefault();
            }
            if (!box) {
                box = createElement('span', {
                    style: Object.assign({
                        border: '1px solid #f00',
                        backgroundColor: 'rgba(255,255,0,0.3)'
                    }, defaultBox1)
                }, document.body);
                counter = createElement('span', {
                    style: Object.assign({
                        backgroundColor: '#600',
                        color: '#fff',
                        font: '10pt sans-serif',
                        padding: '2px 4px',
                        textAlign: 'left',
                        whiteSpace: 'pre'
                    }, defaultBox1)
                }, document.body);
            }
            startX = event.pageX;
            startY = event.pageY;
            addListeners(window, mousemove, mouseup, mousewheel, mouseout);
        }
    }

    function mousemove(event) {
        if (!flagShow) {
            if (Math.abs(event.pageX - startX) < 5 && Math.abs(event.pageY - startY) < 5) return;
            if (!autoScrollId) autoScrollId = setInterval(autoScroll, 100);
        }
        mouseX = event.clientX;
        mouseY = event.clientY;
        var el = document.elementsFromPoint(mouseX, mouseY).find(el => el !== box && el !== counter);
        if (!el || !el.className.match(/\b(UFIPagerLink|fss|see_more_link_inner|UFIReplySocialSentenceLinkText)\b/)) el = null;
        if (autoOpenElement !== el) {
            if (autoOpenElement && autoOpenCount <= 0) {
                flagLinks = true;
                linkCount = 0;
            }
            autoOpenCount = 5;
        }
        autoOpenElement = el;

        updateBox(mouseX, mouseY);
    }

    function mousewheel(event) {
        mousemove(event);
    }

    function mouseup(event) {
        if (!flagShow) stop();
    }

    function mouseout(event) {
        mousemove(event);
    }

    function keydown(event) {
        keyCode = event.keyCode;
        if (keyCode == KEY_ESC && flagActive) stop();
        if (keyCode == KEY_C && flagActive) {
            stop();
            if (DAF.getValue('linkGrabPortal2FB')) {
                values = values.map(href => {
                    var converted = href.indexOf('portal.pixelfederation.com') >= 0 ? portal2FB(href) : null;
                    return converted || href;
                });
            }
            if (DAF.getValue('linkGrabSort')) values.sort();
            if (DAF.getValue('linkGrabReverse')) values.reverse();
            var text = values.join('\n') + '\n';
            copyToClipboard(text);
            Dialog(Dialog.TOAST).show({
                text: guiString('linksCopied', [values.length])
            });
        }
    }

    function keyup(event) {
        keyCode = 0;
    }

    function contextmenu(event) {
        if (flagShow || flagStopMenu) event.preventDefault();
        flagStopMenu = false;
    }

    function autoScroll() {
        var height = window.innerHeight,
            speed, direction;
        if (mouseY > height - 20) speed = height - mouseY, direction = 1;
        else if (window.scrollY > 0 && mouseY < 20) speed = mouseY, direction = -1;
        else {
            if (autoOpenElement && (autoOpenCount--) == 0) {
                try {
                    autoOpenElement.click();
                    flagLinks = true;
                } catch (e) {}
            }
            return;
        }
        var value = (speed < 2 ? 60 : (speed < 10 ? 30 : 10)) * direction;
        window.scrollBy(0, value);
        updateBox(mouseX, mouseY);
    }

    function updateBox(x, y) {
        x = Math.min(x, window.innerWidth - 7) + document.body.scrollLeft;
        y = Math.min(y, window.innerHeight - 7) + document.body.scrollTop;

        if (x > startX) boxX1 = startX, boxX2 = x;
        else boxX1 = x, boxX2 = startX;
        if (y > startY) boxY1 = startY, boxY2 = y;
        else boxY1 = y, boxY2 = startY;
        if (boxX1 < 0) boxX1 = 0;
        if (boxY1 < 0) boxY1 = 0;

        box.style.left = boxX1 + 'px';
        box.style.width = (boxX2 - boxX1) + 'px';
        box.style.top = boxY1 + 'px';
        box.style.height = (boxY2 - boxY1) + 'px';
        if (!flagShow || (flagLinks && linkCount != document.links.length)) start();

        var hash = {};
        values = [], numLinks = 0;
        links.forEach(a => {
            var daf = a.daf;
            if (!daf) return;
            if (daf.y1 >= boxY2 || daf.y2 <= boxY1 || daf.x1 >= boxX2 || daf.x2 <= boxX1) {
                if (daf.box) daf.box.style.display = 'none';
            } else {
                numLinks++;
                if (!(daf.url in hash)) {
                    hash[daf.url] = true;
                    values.push(daf.url);
                }
                if (!daf.boxSet) {
                    daf.box = daf.box || createElement('span', {}, document.body);
                    Object.assign(daf.box.style, {
                        left: (daf.x1 - 1) + 'px',
                        top: (daf.y1 - 1) + 'px',
                        width: (daf.x2 - daf.x1 + 2) + 'px',
                        height: (daf.y2 - daf.y1 + 2) + 'px'
                    }, defaultBox2);
                    daf.boxSet = true;
                }
                daf.box.style.display = 'block';
            }
        });
        var text = guiString('linksSelected', [values.length, numLinks]);
        if (values.length > 0) text += '\n' + guiString('linksCopy', ['C']);
        if (text != oldLabel) counter.innerText = oldLabel = text;
        var cx = mouseX + document.body.scrollLeft,
            cy = mouseY + document.body.scrollTop - counter.offsetHeight;
        if (y <= startY) cx -= Math.floor(counter.offsetWidth / 2);
        else if (x <= startX) cx -= counter.offsetWidth;
        counter.style.top = cy + 'px';
        counter.style.left = cx + 'px';
    }

    var reL = /http(s?):\/\/l\.facebook\.com\/l.php\?u=([^&]+)\S+/g;
    var re1 = /http(s?):\/\/apps\.facebook\.com\/diggysadventure\/wallpost\.php\?wp_id=\d+&fb_type=(standard|portal)&wp_sig=[0-9a-z]+/g;
    var re2 = /http(s?):\/\/portal\.pixelfederation\.com\/(([^\/]+\/)?gift|wallpost)\/diggysadventure\?params=(([0-9a-zA-Z\-_]|%2B|%2F)+(%3D){0,2})/g;

    function normalizeRewardLink(href) {
        var url = null,
            match;
        if (href.indexOf('l.facebook') > 0) href = href.replace(reL, (a, b, c) => decodeURIComponent(c));
        if ((match = href.match(re1))) {
            url = match[0];
            if (url.startsWith('http:')) url = 'https:' + url.substr(5);
        } else if ((match = href.match(re2))) {
            url = match[0];
            url = 'https://portal.pixelfederation.com/wallpost/diggysadventure' + url.substr(url.indexOf('?'));
        }
        return url;
    }

    function portal2FB(href) {
        try {
            re2.lastIndex = 0; // will reset the RegExp object
            var match = re2.exec(href);
            console.log(match);
            if (match) {
                var params = decodeURIComponent(match[4]).replace(/\-/g, '+').replace(/_/g, '/'),
                    payload = atob(params),
                    json = JSON.parse(payload),
                    result = 'https://apps.facebook.com/diggysadventure/wallpost.php',
                    c = '?';
                if (json.action == 'wallpost') {
                    Object.keys(json).forEach(key => {
                        if (key != 'action') {
                            result += c + encodeURIComponent(key) + '=' + encodeURIComponent(json[key]);
                            c = '&';
                        }
                    });
                    return result;
                }
                return 'https://apps.facebook.com/diggysadventure/wallpost.php?wp_id=' + json.wp_id + '&fb_type=' + json.fb_type + '&wp_sig=' + json.wp_sig;
            }

        } catch (e) {
            console.log(e);
        }
        return null;
    }

    function start() {
        flagShow = true;
        flagLinks = false;
        var left = document.body.scrollLeft,
            top = document.body.scrollTop;
        document.body.style.userSelect = 'none';
        box.style.display = counter.style.display = 'block';
        links = document.links;
        linkCount = links.length;
        links = Array.from(links).filter(a => {
            var url = a.href;
            if (url.indexOf('diggysadventure') > 0 && (url = normalizeRewardLink(a.href))) {
                var rect = a.getBoundingClientRect();
                if (rect.height > 0) {
                    a.daf = {
                        x1: Math.floor(left + rect.left),
                        y1: Math.floor(top + rect.top),
                        x2: Math.floor(left + rect.left + rect.width),
                        y2: Math.floor(top + rect.top + rect.height),
                        url: url,
                        box: a.daf && a.daf.box
                    };
                    return true;
                }
            }
        });
    }

    function stop() {
        autoOpenElement = null;
        if (flagActive) {
            flagActive = false;
            removeListeners(window, mousemove, mouseup, mousewheel, mouseout);
        }
        keyCode = 0;
        if (flagShow) {
            flagShow = false;
            document.body.style.userSelect = '';
            box.style.display = counter.style.display = 'none';
        }
        if (autoScrollId) {
            clearInterval(autoScrollId);
            autoScrollId = 0;
        }
        links.forEach(a => {
            var daf = a.daf;
            if (daf) {
                if (daf.box) daf.box.parentNode.removeChild(daf.box);
                daf.box = null;
                a.daf = null;
            }
        });
        links = [];
        flagLinks = false;
        document.getSelection().removeAllRanges();
    }

    function copyToClipboard(text) {
        var ta = document.body.appendChild(document.createElement('textarea'));
        ta.value = text;
        ta.select();
        document.execCommand("Copy", false, null);
        document.body.removeChild(ta);
    }

})();
/*
 ** END
 *******************************************************************************/