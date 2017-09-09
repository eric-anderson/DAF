/*
 ** DA Friends - wiki.js
 */
var guiTabs = (function(self) {
    var tabID;

    /*
     ** Define this Menu Item details
     */
    self.tabs.Calculators.menu.god_children = {
        title: 'godsChildren',
        image: 'tools.png',
        html: true,
        onInit: onInit,
        onAction: onAction,
        onUpdate: onUpdate,
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(id, cel) {
        tabID = id;
        document.getElementById('wikiGodChildrenTable').onclick = wikiGodChildrenTable;
    }

    /*
     ** @Private - Sync Action
     */
    function onAction(id, action, data) {}

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {

        if (reason == 'active')
            return true;

        return true;
    }

    function wikiGodChildrenTable() {
        let file = 'childs.xml'
        clearResult();
        setStatus('Fetching ' + file);
        bgp.daGame.loadGameXML(file)
            .then(processGodChildrenXML)
            .catch(function(error) {
                setStatus('Error ' + error);
            });
    }

    function processGodChildrenXML(xml) {
        var childs = xml.getElementsByTagName('child');
        var gc = [];

        for (var i = 0; i < childs.length; i++) {
            var child = childs[i];
            var region = parseInt(child.getAttribute('neighbourg_region'));
            if (!(region > 0 && region < 10)) {
                continue;
            }
            var id = parseInt(child.getAttribute('id'));
            var min_level = parseInt(child.getAttribute('min_level'));
            var max_level = parseInt(child.getAttribute('max_level'));
            var friend_stamina = parseInt(getNode(child, 'friend_stamina'));
            gc.push({
                region: region,
                min_level: min_level,
                max_level: max_level,
                energy: friend_stamina
            });
        }
        console.log('GC', gc);

        var prev_level = 0;
        var prev = '';
        var rows = [];
        var wikiRows = [];
        for (var level = 1; level <= 999; level++) {
            var gc_e = [];
            for (var rid = 1; rid <= 5; rid++) {
                gc_e.push(Math.floor(5 * averageGC(gc, rid, level)));
            }
            var row = gc_e.join(',');
            if (row != prev || level == 999) {
                if (prev_level > 0) {
                    var level_s;
                    if (level == 999) {
                        level = 1000; // Final level with data 999.
                    }
                    if (prev_level == level - 1) {
                        level_s = prev_level;
                    } else {
                        level_s = prev_level + '-' + (level - 1);
                    }
                    rows.push(level_s + ": " + prev);
                    prev = prev.replace(new RegExp(',', 'g'), '\n| ');
                    wikiRows.push('\n| ' + level_s + '\n| ' + prev + '\n\n');
                }
                prev_level = level;
                prev = row;
            }
        }
        console.log(rows.join('\n'));
        document.getElementById('wikiProcessResult').innerHTML =
            '<PRE>' + wikiRows.join('|-\n') + '</PRE>';
        setStatus('success');
        selectResult();
    }

    function matchGC(gc, region, level) {
        var ret = [];
        for (var i = 0; i < gc.length; i++) {
            if (gc[i].region != region) {
                continue;
            }
            if (level < gc[i].min_level || level > gc[i].max_level) {
                continue;
            }
            ret.push(gc[i]);
        }
        return ret;
    }

    function averageGC(gc, region, level) {
        var m = matchGC(gc, region, level);
        if (m.length == 0) {
            throw "fail";
        }
        var sum = 0;
        for (var i = 0; i < m.length; i++) {
            sum += m[i].energy;
        }
        return sum / m.length;
    }

    /**********************************************************************
     * Generic utility fns
     */

    function setStatus(message) {
        document.getElementById('wikiProcessStatus').innerHTML = '<B>Status: </B>' + message;
    }

    function getNode(n, v) {
        var e = n.getElementsByTagName(v);
        if (e.length != 1) {
            throw "fail";
        }
        return e[0].innerHTML;
    }

    function clearResult() {
        document.getElementById('wikiProcessResult').innerHTML = '';
    }

    function selectResult() {
        var range = document.createRange();
        range.selectNode(document.getElementById('wikiProcessResult'));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/
