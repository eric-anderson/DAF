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
        console.log(this);
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
                score.min = 0;
                score.max = 100;
                score.val = 50;
                resolve(key);
            }));
            return items;
        }, [])).then(function(scores) {
            let html = [];
            let totals = {
                val: 0,
                min: 0,
                max: 100
            };

            scores.forEach(function(key) {
                let score = progress[key];
                console.log("Item", key, score);
                html.push('<tr id="prog-', key, '">');
                html.push('<td><img src="/img/', score.icon, '"/></td>');
                html.push('<td>', guiString(score.label), '</td>');
                html = doScores(html, score);
                html.push('</tr>');                
            });
            prgSum.innerHTML = html.join('');

            html = ['<tr><td colspan="2">',  guiString('Progress'), '</td>'];
            html = doScores(html, totals);
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

    function doScores(html, score) {
        html.push('<td>', score.val, '</td>');
        html.push('<td>', 0, '%', '</td>');
        html.push('<td>', score.min, '</td>');
        html.push('<td><progress value="', score.val, '" min="', score.min, '" max="', score.max, '"></progress></td>');
        html.push('<td>', score.max, '</td>');        
        return html;
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/