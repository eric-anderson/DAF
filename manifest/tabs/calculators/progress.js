/*
 ** DA Friends Calculator - about.js
 */
var guiTabs = (function(self) {
    let tabID, tab, div, prgWarn, prgSum, prgTot;
    let progress = {
        level: {
            label: 'Level',
            icon: 'trophy.png'
        },
        achieved: {
            label: 'Achievements',
            icon: 'medal.png'
        },
        treasure: {
            label: 'Treasure',
            icon: 'chest.png'
        },
        events: {
            label: 'Events',
            icon: 'events.png'
        }
    };

    /*
     ** Define this Menu Item details
     */
    self.tabs.Calculators.menu.progress = {
        title: 'Progress',
        image: 'graph.png',
        html: true,
        onInit: onInit,
        onUpdate: onUpdate,
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(tid, cel) {
        tabID = tid;
        tab = self.tabs.Calculators.menu[tid];
        div = tab.html;
        prgWarn = document.getElementById('progWarn');
        prgSum = document.getElementById('progSum');
        prgTot = document.getElementById('progTot');

        console.log(bgp.daGame);
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        prgSum.innerHTML = '';
        prgTot.innerHTML = '';
        prgWarn.innerHTML = '';
        
        return Promise.all(Object.keys(progress).reduce(function(items, key) {
            items.push(new Promise((resolve, reject) => {
                let score = progress[key];
                let func = '__progress_' + key.toLowerCase(key);
                score.val = score.min = score.max = 0;
                
                if ((self.hasOwnProperty(func)) && typeof self[func] === 'function') {
                    console.log('Found', func);
                    resolve(self[func].call(this, key, score));
                }else
                    resolve(key);
            }));
            return items;
        }, [])).then(function(scores) {
            let html = [];
            let totals = {
                pct: 0,
                val: 0,
                min: 0,
                max: 0
            };

            scores.forEach(function(key) {
                let score = progress[key];
                score.pct = score.max > 0 ? (((score.val - score.min) / score.max) * 100) : 0;
                html.push('<tr id="prog-', key, '">');
                html.push('<td><img src="/img/', score.icon, '"/></td>');
                html.push('<td>', guiString(score.label), '</td>');
                html.push('<td>', numberWithCommas(score.val), '</td>');
                html.push('<td>', numberWithCommas(score.pct), '%', '</td>');
                html.push('<td>', numberWithCommas(score.min), '</td>');
                html.push('<td><progress value="', score.val, '" max="', score.max, '"></progress></td>');
                html.push('<td>', numberWithCommas(score.max), '</td>');
                html.push('</tr>');
                totals.val += score.val;
                totals.min += score.min;
                totals.max += score.max;                
            });
            prgSum.innerHTML = html.join('');

            totals.pct = totals.max > 0 ? (((totals.val - totals.min) / totals.max) * 100) : 0;
            html = ['<tr><td colspan="2">', guiString('Overall'), '</td>'];
            html.push('<td colspan="2">', numberWithCommas(totals.pct), '%', '</td>');
            html.push('<td colspan="3"><progress value="', totals.pct, '" max="100"></progress></td>');
            html.push('</tr>');
            prgTot.innerHTML = html.join('');

            return true;
        });


        /*
        if (achievs)
            return doUpdate();
        return bgp.daGame.loadGameXML('achievements.xml', false).then(doUpdate);
        */
    }

    /*
    ** Level Progress
    */
    self.__progress_level = function(key, score) {
        score.min = 1;
        score.max = Object.keys(bgp.daGame.daLevels).length - 1;
        score.val = parseInt(bgp.daGame.daUser.level);
        return key;
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/