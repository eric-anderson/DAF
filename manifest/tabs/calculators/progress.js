/*
 ** DA Friends Calculator - about.js
 */
var guiTabs = (function(self) {
    let tabID, tab, div, prgWarn, prgSum, prgTot;
    let skipEvents = true;
    let progress = {
        level: {
            label: 'Level',
            icon: 'trophy.png'
        },
        achievs: {
            label: 'Achievements',
            icon: 'medal.png'
        },
        treasure: {
            label: 'Treasure',
            icon: 'chest.png',
            skip: true
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

        // Add in Region Progress
        let tot = bgp.daGame.maxRegions();
        let max = Math.min(Math.max(bgp.daGame.daUser.region, 1), tot);
        for (let rid = (skipEvents ? 1 : 0); rid <= tot; rid++) {
            let pid = 'Region' + rid;
            progress[pid] = {
                label: self.regionName(rid, !skipEvents, true),
                icon: (rid <= max) ? 'regions/' + rid + '.png' : 'locked.png',
                info: (rid <= max) ? self.__info_regions : null,
                calc: self.__calc_regions
            };
        }
        console.log(bgp.daGame);
        console.log(progress);
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        prgWarn.innerHTML = guiString('warnInfoDated', [unixDate(bgp.daGame.daUser.time, true)]);
        prgSum.innerHTML = '';
        prgTot.innerHTML = '';

        return Promise.all(Object.keys(progress).reduce(function(items, key) {
            if ((!progress[key].hasOwnProperty('skip')) || !progress[key].skip) {
                items.push(new Promise((resolve, reject) => {
                    let score = progress[key];
                    let func = func__calc(key);

                    score.val = score.min = score.max = 0;
                    if (func) {
                        resolve(func.call(this, key, score));
                    } else
                        resolve(key);
                }));
            }
            return items;
        }, [])).catch(function(error) {
            console.error(error);
            throw Error(error);
        }).then(function(scores) {
            let html = [];
            let totals = {
                pct: 0,
                val: 0,
                min: 0,
                max: 0
            };

            scores.forEach(function(key) {
                let score = progress[key];
                let info = !!func__info(key);

                score.pct = score.max > 0 ? ((score.val / score.max) * 100) : 0;
                html.push('<tr id="prog-', key, '" class="', (info ? 'selectable' : ''), '">');
                html.push('<td><img src="/img/', score.icon, '"/></td>');
                html.push('<td class="left">', bgp.daGame.string(score.label).toUpperCase(), '</td>');
                html.push('<td>', numberWithCommas(score.pct, 2), '%', '</td>');
                html.push('<td>', numberWithCommas(score.val), '</td>');
                html.push('<td>', numberWithCommas(score.max), '</td>');
                html.push('<td><progress value="', score.val, '" max="', score.max, '"></progress></td>');
                html.push('</tr>');
                totals.val += score.val;
                totals.min += score.min;
                totals.max += score.max;
            });
            prgSum.innerHTML = html.join('');

            totals.pct = totals.max > 0 ? ((totals.val / totals.max) * 100) : 0;
            html = ['<tr><td colspan="2">', guiString('Overall'), '</td>'];
            html.push('<td colspan="2">', numberWithCommas(totals.pct, 2), '%', '</td>');
            html.push('<td colspan="2"><progress value="', totals.pct, '" max="100"></progress></td>');
            html.push('</tr>');
            prgTot.innerHTML = html.join('');

            return true;
        });
    }

    function func__calc(key) {
        let func = '__calc_' + key.toLowerCase();
        if ((self.hasOwnProperty(func)) && typeof self[func] === 'function')
            return self[func];
        if ((progress[key].hasOwnProperty('calc')) && typeof progress[key].calc === 'function')
            return progress[key].calc;
        return null;
    }

    function func__info(key) {
        let func = '__info_' + key.toLowerCase();
        if ((self.hasOwnProperty(func)) && typeof self[func] === 'function')
            return self[func];
        if ((progress[key].hasOwnProperty('info')) && typeof progress[key].info === 'function')
            return progress[key].info;
        return null;
    }

    /*
     ** Level Progress
     */
    self.__calc_level = function(key, score) {
        score.min = 1;
        score.max = Object.keys(bgp.daGame.daLevels).length - 1;
        score.val = parseInt(bgp.daGame.daUser.level);
        return key;
    }

    /*
     ** Achievement Progress
     */
    self.daAchievs = null;

    self.__calc_achievs = function(key, score) {
        if (!self.daAchievs) {
            return bgp.daGame.loadGameXML('achievements.xml', true).then(function(xml) {
                let items = xml.getElementsByTagName('achievement');
                let def = {};
                self.daAchievs = {};
                for (let i = 0; i < items.length; i++) {
                    let id = items[i].attributes.id.textContent;

                    if (id != 0) {
                        let item = Object.assign({}, def, XML2jsobj(items[i]));
                        if (item.platform != 'all' && item.platform != 'desktop_only')
                            continue;

                        data = {
                            id: id,
                            nid: item.name_loc,
                            eid: item.event_id,
                            rid: item.region_id,
                            oid: item.object_id,
                            typ: item.type,
                            act: item.action,
                            hde: item.hide,
                            lvl: item.levels.level
                        };

                        self.daAchievs[id] = data;
                    } else
                        def = XML2jsobj(items[i]);
                }
                return doAchievs(key, score);
            });
        }
        return doAchievs(key, score);
    }

    function doAchievs(key, score) {
        score.max = 0;
        Object.keys(self.daAchievs).forEach(function(id) {
            let goal = self.daAchievs[id];
            if ((!!goal.hde) && goal.eid == 0 || !skipEvents)
                score.max = score.max + goal.lvl.length;
        });

        score.val = 0;
        if ((bgp.daGame.daUser.achievs) && bgp.daGame.daUser.achievs.length > 0) {
            bgp.daGame.daUser.achievs.forEach(function(user) {
                let goal = self.daAchievs[user.def_id];
                if ((!!goal.hde) && goal.eid == 0 || !skipEvents) {
                    score.val = score.val + parseInt(user.confirmed_level);
                    //console.log(bgp.daGame.string(goal.nid), user.confirmed_level, goal);
                }
            });
        }

        return key;
    }

    self.__info_achievs = function() {}

    /*
     ** Region(s) Locations/Mines
     */
    self.__calc_regions = function(key, score) {
        let uidPRG = bgp.daGame.daUser.loc_prog;
        let dak = 'da' + key;
        score.max = 0;
        score.val = 0;

        console.log('Calc', dak);
        if (bgp.daGame.hasOwnProperty(dak)) {

            Object.keys(bgp.daGame[dak]).forEach(function(lid) {
                let mine = bgp.daGame[dak][lid];

                // Emerald Nest was a re-diggable location until December of 2015. 
                // PF changed the format. It will NOT count towards the 
                // Hero of Egypt Achievement, so we ignore it.
                //
                // In case the Mine ID changes, we will use the Name ID as the identifier
                //
                // LID=1345
                //
                let good = self.mineValid(mine, false);
                if ((good) && mine.nid == 'LONA203')
                    good = false;

                if (good) {
                    let mPrg = intOrZero(mine.prg);
                    let uPrg = mPrg;

                    if (uidPRG.hasOwnProperty(mine.lid))
                        uPrg = intOrZero(uidPRG[mine.lid].prog);

                    score.max = score.max + mPrg;
                    score.val = score.val + Math.min(mPrg, uPrg);
                }
            });
        }
        return key;
    }

    self.__info_regions = function() {
        /*                            
                if (!mine.hasOwnProperty('name'))
                    mine.name = bgp.daGame.string(mine.nid);
        */
    }

    self.mineValid = function(mine, incRepeat = true) {
        let uidTUT = intOrDefault(bgp.daGame.daUser.tutorial_def_id, 1);
        let good = !isBool(mine.tst);
        if ((good && !!mine.tut) && mine.tut != uidTUT)
            good = false;
        if (good && mine.cdn != 0 && !incRepeat)
            good = false;
        return good;
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/