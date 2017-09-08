/*
 ** DA Friends Calculator - about.js
 */
var guiTabs = (function(self) {
    let tabID, tab, div, prgWarn, prgSum, prgTot, prgInf;
    let prgTHD, prgTBD, prgTFT;
    let skipEvents = true,
        skipComplete = true;

    let progress = {
        level: {
            label: 'Level',
            icon: 'trophy.png'
        },
        achievs: {
            label: 'Achievements',
            icon: 'medal.png'
        },
        collect: {
            label: 'Treasure',
            icon: 'chest.png'
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
        prgInf = document.getElementById('progInfo');
        prgTHD = document.getElementById('progTHD');
        prgTBD = document.getElementById('progTBD');
        prgTFT = document.getElementById('progTFT');

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

        // Until the code is moved into gameDiggy.js, we celar out the data for
        // Achievements and Collections etc. to ensure we get fresh and upto 
        // date information
        //
        // TODO: Move Data Collection to gameDiggy.js
        //
        if (localStorage.installType != 'development') {
            bgp.daGame.daAchievs = null;
            bgp.daGame.daCollect = null;
        }
    }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        prgWarn.innerHTML = guiString('warnInfoDated', [unixDate(bgp.daGame.daUser.time, true)]);
        prgInf.style.display = 'none';
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
                html.push('<td>', numberWithCommas(score.max - score.val), '</td>');
                html.push('<td><progress value="', score.val, '" max="', score.max, '"></progress></td>');

                html.push('</tr>');
                totals.val += score.pct;
                totals.min += 0;
                totals.max += 100;
            });
            prgSum.innerHTML = html.join('');

            totals.pct = totals.max > 0 ? ((totals.val / totals.max) * 100) : 0;
            html = ['<tr><td colspan="2">', guiString('Overall'), '</td>'];
            html.push('<td colspan="2">', numberWithCommas(totals.pct, 2), '%', '</td>');
            html.push('<td colspan="3"><progress value="', totals.pct, '" max="100"></progress></td>');
            html.push('</tr>');
            prgTot.innerHTML = html.join('');

            prgSum.querySelectorAll('.selectable').forEach(function(row) {
                row.addEventListener('click', onClickInfo);
            });

            return true;
        });
    }

    function onClickInfo(e) {
        e.preventDefault();
        e = e.target;
        if (e.tagName != 'TR')
            e = e.parentElement;

        let key = '';
        if (!e.id.startsWith('prog-')) {
            if (!e.dataset.progId)
                return;
            key = e.dataset.progId;
        } else
            key = e.id.slice(5);

        let func = func__info(key);
        let score = progress[key];
        prgTHD.innerHTML = '';
        prgTBD.innerHTML = '';
        prgTFT.innerHTML = '';

        if (func) {
            document.getElementById('progIcon').src = '/img/' + score.icon;
            document.getElementById('progName').innerHTML =
                bgp.daGame.string(score.label).toUpperCase() +
                ' - ' + guiString('inProgress').toUpperCase();
            if (func.call(this, key, score) === true) {
                prgInf.style.display = '';
                return;
            }
        }
        prgInf.style.display = 'none';
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

    function progressHTML(html, val, max, tag = 'td') {
        let sTag = '<' + tag + '>';
        let eTag = '</' + tag + '>';
        let pct = max > 0 ? ((val / max) * 100) : 0;

        html.push(sTag, numberWithCommas(pct, 2), '%', eTag);
        html.push(sTag, numberWithCommas(val), eTag);
        html.push(sTag, numberWithCommas(max), eTag);
        html.push(sTag, numberWithCommas(max - val), eTag);
        html.push(sTag, '<progress value="', val, '" max="', max, '"></progress>', eTag);
        return html;
    }

    /*
     ** Level Progress
     */
    self.__calc_level = function(key, score) {
        score.min = 1;
        score.max = Object.keys(bgp.daGame.daLevels).length - 1;
        score.val = intOrDefault(bgp.daGame.daUser.level, 1);
        return key;
    }

    self.__info_level = function(key, score) {
        if (!bgp.daGame.daLevels)
            return false;

        let uidLVL = intOrDefault(bgp.daGame.daUser.level, 0);
        let val = 0;
        let max = 0;
        Object.keys(bgp.daGame.daLevels).sort(function(a, b) {
            return bgp.daGame.daLevels[a].level - bgp.daGame.daLevels[b].level;
        }).forEach(function(v, l, a) {
            let level = bgp.daGame.daLevels[l];
            let lno = intOrZero(level.level);
            let xp = intOrZero(level.xp);
            max = max + xp;
            if (lno < uidLVL) {
                val = val + xp;
            } else if (lno == uidLVL)
                val = val + intOrZero(bgp.daGame.daUser.exp);
        });

        document.getElementById('progIcon').src = '/img/stars.png';
        document.getElementById('progName').innerHTML = guiString('Experience');
        let html = [];
        html.push('<tr>');
        html.push('<th colspan="2">', guiString('Measure'), '</th>');
        html.push('<th colspan="2">', guiString('Attained'), '</th>');
        html.push('<th>', guiString('Goal'), '</th>');
        html.push('<th>', guiString('Remaining'), '</th>');
        html.push('<th>', guiString('Progress'), '</th>');
        html.push('</tr>');
        prgTHD.innerHTML = html.join('');

        html = [];
        html.push('<tr>');
        html.push('<td><img src="/img/materials/xp.png"/></td>');
        html.push('<td class="left">', guiString('XP'), '</td>');
        html = progressHTML(html, val, max);
        html.push('</tr>');
        prgTBD.innerHTML = html.join('');

        return true;
    }

    /*
     ** Collections (Treasure) Progress
     */
    self.__calc_collect = function(key, score) {
        if (!bgp.daGame.daCollect) {
            return bgp.daGame.loadGameXML('collections.xml', true).then(function(xml) {
                let items = xml.getElementsByTagName('collection');
                let def = {};
                bgp.daGame.daCollect = {};
                for (let i = 0; i < items.length; i++) {
                    let id = items[i].attributes.id.textContent;

                    if (id != 0) {
                        let item = Object.assign({}, def, XML2jsobj(items[i]));

                        data = {
                            id: id,
                            dsc: item.desc,
                            nid: item.name_loc,
                            eid: item.event_id,
                            rid: item.region_id,
                            hde: item.hide,
                            pce: item.pieces.split(','),
                            fbp: item.fb_points,
                            rwd: item.reward
                        };

                        bgp.daGame.daCollect[id] = data;
                    } else
                        def = XML2jsobj(items[i]);
                }
                return doCollect(key, score);
            });
        }
        return doCollect(key, score);
    }

    function doCollect(key, score) {
        score.max = 0;
        score.val = 0;
        let art = bgp.daGame.daUser.artifacts.split(',');
        Object.keys(bgp.daGame.daCollect).forEach(function(id) {
            let goal = bgp.daGame.daCollect[id];
            if ((!isBool(goal.hde)) && goal.eid == 0 || !skipEvents) {
                score.max = score.max + goal.pce.length;
                for (let p = 0; p < goal.pce.length; p++) {
                    let pce = goal.pce[p];
                    if (art.indexOf(pce) !== -1)
                        score.val = score.val + 1;
                }
            }
        });

        return key;
    }

    self.__info_collect = function(key, score) {
        if (!bgp.daGame.daCollect || !bgp.daGame.daUser.artifacts)
            return false;

        let uidRID = Math.min(Math.max(bgp.daGame.daUser.region, 1), bgp.daGame.maxRegions());
        let art = bgp.daGame.daUser.artifacts.split(',');
        let html = [];
        html.push('<tr>');
        html.push('<th colspan="2">', guiString('Measure'), '</th>');
        html.push('<th colspan="2">', guiString('Attained'), '</th>');
        html.push('<th>', guiString('Goal'), '</th>');
        html.push('<th>', guiString('Remaining'), '</th>');
        html.push('<th>', guiString('Progress'), '</th>');
        html.push('</tr>');
        prgTHD.innerHTML = html.join('');

        html = [];
        Object.keys(bgp.daGame.daCollect).forEach(function(id) {
            let goal = bgp.daGame.daCollect[id];

            if (!(goal.rid > uidRID)) {
                if ((!isBool(goal.hde)) && goal.eid == 0 || !skipEvents) {
                    let val = 0;
                    let max = goal.pce.length;
                    for (let p = 0; p < max; p++) {
                        let pce = goal.pce[p];
                        if (art.indexOf(pce) !== -1)
                            val += 1;
                    }
                    if (val < max || !skipComplete) {
                        let name = bgp.daGame.string(goal.nid);

                        html.push('<tr>');
                        html.push('<td>', self.regionImage(goal.rid, true, 32), '</td>');
                        html.push('<td class="left">', name, '</td>');
                        html = progressHTML(html, val, max);
                        html.push('</tr>');
                    }
                }
            }
        });

        prgTBD.innerHTML = html.join('');
        return true;
    }

    /*
     ** Achievement Progress
     */
    self.__calc_achievs = function(key, score) {
        if (!bgp.daGame.daAchievs) {
            return bgp.daGame.loadGameXML('achievements.xml', true).then(function(xml) {
                let items = xml.getElementsByTagName('achievement');
                let def = {};
                bgp.daGame.daAchievs = {};
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

                        bgp.daGame.daAchievs[id] = data;
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
        Object.keys(bgp.daGame.daAchievs).forEach(function(id) {
            let goal = bgp.daGame.daAchievs[id];
            if ((!isBool(goal.hde)) && goal.eid == 0 || !skipEvents)
                score.max = score.max + goal.lvl.length;
        });

        score.val = 0;
        if ((bgp.daGame.daUser.achievs) && bgp.daGame.daUser.achievs) {
            Object.keys(bgp.daGame.daUser.achievs).forEach(function(id) {
                let user = bgp.daGame.daUser.achievs[id];
                let goal = bgp.daGame.daAchievs[user.def_id];
                if ((!isBool(goal.hde)) && goal.eid == 0 || !skipEvents) {
                    score.val = score.val + parseInt(user.confirmed_level);
                    //console.log(bgp.daGame.string(goal.nid), user.confirmed_level, goal);
                }
            });
        }

        return key;
    }

    self.__info_achievs = function(key, score) {
        if (!bgp.daGame.daAchievs)
            return false;

        let uidRID = Math.min(Math.max(bgp.daGame.daUser.region, 1), bgp.daGame.maxRegions());
        let html = [];
        html.push('<tr>');
        html.push('<th colspan="2">', guiString('Measure'), '</th>');
        html.push('<th><img src="/img/a_level.png"/></th>');
        html.push('<th colspan="2">', guiString('Attained'), '</th>');
        html.push('<th>', guiString('Goal'), '</th>');
        html.push('<th>', guiString('Remaining'), '</th>');
        html.push('<th>', guiString('Progress'), '</th>');
        html.push('</tr>');
        prgTHD.innerHTML = html.join('');

        html = [];
        Object.keys(bgp.daGame.daAchievs).sort(function(a, b) {
            let ta = bgp.daGame.daAchievs[a];
            let tb = bgp.daGame.daAchievs[b];

            if (ta.rid - tb.rid != 0)
                return ta.rid - tb.rid;

            if ((ta = bgp.daGame.daUser.achievs[a]))
                ta = intOrZero(ta.level);
            if ((tb = bgp.daGame.daUser.achievs[b]))
                tb = intOrZero(tb.level);

            return ta - tb;
        }).forEach(function(id) {
            let goal = bgp.daGame.daAchievs[id];
            if ((!isBool(goal.hde)) && goal.eid == 0 || !skipEvents) {
                let user = bgp.daGame.daUser.achievs[id];
                let name = bgp.daGame.string(goal.nid)
                let icon = '<img src="/img/blank.gif" />';
                let show = true;
                let prg = 0;
                let val = 0;
                let max = 0;
                
                if ((user) && isBool(user.done) && skipComplete)
                    show = false;
                if ((!user) && goal.rid > uidRID)
                    show = false;

                if (show) {
                    for (let l = 0; l < goal.lvl.length; l++) {
                        let lvl = goal.lvl[l];
                        let amt = intOrZero(lvl.amount);
                        max = max + amt;

                        if (user) {
                            if (!isBool(user.done)) {
                                if (lvl.level_id < user.level) {
                                    val = val + amt;
                                } else if (lvl.level_id == user.level)
                                    val = val + intOrZero(user.progress);
                            } else
                                val = val + amt;
                        }
                    }

                    prg = ((user) ? user.confirmed_level : 0);

                    if (goal.typ == 'material') {
                        icon = self.objectImage(goal.typ, goal.oid, 32);
                    } else if (goal.typ == 'clear_mine') {
                        icon = self.regionImage(goal.rid, true, 32);
                    } else if (goal.typ == 'refresh_mine') {
                        icon = '<img src="/img/repeat.png" />';
                    } else if (goal.typ == 'collection') {
                        icon = '<img src="/img/chest.png" />';
                    } else if (goal.typ == 'friend_child') {
                        icon = '<img src="/img/gc.png" />';
                    } else if (goal.typ == 'building') {
                        icon = '<img src="/img/camp.png" />';
                    } else if (goal.typ == 'dig') {
                        icon = '<img src="/img/dig.png" />';
                    } else if (goal.typ == 'debris') {
                        icon = '<img src="/img/bomb.png" />';
                    } else if (goal.typ == 'gift') {
                        icon = '<img src="/img/gift.png" />';
                    } else if (goal.typ == 'invite') {
                        icon = '<img src="/img/friends.png" />';
                    } else if (goal.typ == 'caravan') {
                        icon = '<img src="/img/caravan.png" />';
                    } else if (goal.typ == 'windmill') {
                        icon = '<img src="/img/mill.png" />';
                    } else if (goal.typ == 'decoration') {
                        icon = '<img src="/img/deco.png" />';
                    } else
                        console.warn('Type', goal.typ);

                    if (goal.typ == 'clear_mine') {
                        html.push('<tr class="selectable", data-prog-id="Region', goal.rid, '">');
                    } else
                        html.push('<tr>');
                    html.push('<td>', icon, '</td>');
                    html.push('<td class="left">', name, '</td>');
                    html.push('<td>', prg, '/', goal.lvl.length, '</td>');
                    html = progressHTML(html, val, max);
                    html.push('</tr>');
                }
            }
        });

        prgTBD.innerHTML = html.join('');
        prgTBD.querySelectorAll('.selectable').forEach(function(row) {
            row.addEventListener('click', onClickInfo);
        });
        return true;
    }

    /*
     ** Region(s) Locations/Mines
     */
    self.__calc_regions = function(key, score) {
        let uidPRG = bgp.daGame.daUser.loc_prog;
        let dak = 'da' + key;
        score.max = 0;
        score.val = 0;

        if (bgp.daGame.hasOwnProperty(dak)) {
            Object.keys(bgp.daGame[dak]).forEach(function(lid) {
                //let mine = bgp.daGame[dak][lid];
                let mine = bgp.daGame.mineInformation(bgp.daGame[dak][lid]);

                // Emerald Nest was a re-diggable location until December of 2015. 
                // PF changed the format. It will NOT count towards the 
                // Hero of Egypt Achievement, so we ignore it.
                //
                // In case the Mine ID changes, we will use the Name ID as the identifier
                //
                // LID=1345
                //
                let good = self.mineValid(mine, false);
                if ((good) && mine.nid != 'LONA203') {
                    let mPrg = intOrZero(mine.prg);
                    let uPrg = 0;

                    if (uidPRG.hasOwnProperty(mine.lid))
                        uPrg = intOrZero(uidPRG[mine.lid].prog);

                    score.max = score.max + mPrg;
                    score.val = score.val + Math.min(mPrg, uPrg);
                }
            });

            if ((skipComplete) && score.val == score.max)
                score.info = false;
        }

        return key;
    }

    self.__info_regions = function(key, score) {
        let dak = 'da' + key;

        if (bgp.daGame.hasOwnProperty(dak)) {
            let uidPRG = bgp.daGame.daUser.loc_prog;
            let html = [];
            let sub = 0,
                sQty = 0,
                sVal = 0,
                sMax = 0;
            let map = 0,
                tQty = 0,
                tVal = 0,
                tMax = 0;

            html.push('<tr>');
            html.push('<th colspan="2">', guiString('Measure'), '</th>');
            html.push('<th colspan="2">', guiString('Attained'), '</th>');
            html.push('<th>', guiString('Goal'), '</th>');
            html.push('<th>', guiString('Remaining'), '</th>');
            html.push('<th>', guiString('Progress'), '</th>');
            html.push('</tr>');
            prgTHD.innerHTML = html.join('');

            html = [];
            Object.keys(bgp.daGame[dak]).sort(function(a, b) {
                let ta = bgp.daGame[dak][a];
                let tb = bgp.daGame[dak][b];

                if (ta.map - tb.map)
                    return ta.map - tb.map;
                return ta.gid - tb.gid;
            }).forEach(function(lid) {
                let mine = bgp.daGame[dak][lid];
                let good = self.mineValid(mine, false);

                if (good) {
                    let mPrg = intOrZero(mine.prg);
                    let uPrg = 0;
                    let show = true;

                    if ((mine.eid == 0) && mine.mflt == 'side')
                        mine.isXLO = true;

                    if (mine.rid != 0 && mine.nid != 'LONA203') {
                        if (uidPRG.hasOwnProperty(mine.lid)) {
                            uPrg = intOrZero(uidPRG[mine.lid].prog);
                            if (uPrg >= mPrg && skipComplete)
                                show = false;
                        }
                    } else
                        show = false;

                    if (show) {
                        if (map != mine.map) {
                            if (map != 0) {
                                if (sQty > 1) {
                                    html = regionSummary(html, sVal, sMax, sQty);
                                    sub += 1;
                                }
                                sQty = 0, sVal = 0, sMax = 0;
                            }

                            let filter = bgp.daGame.daFilters[mine.map];
                            if (!filter.hasOwnProperty('name'))
                                filter.name = bgp.daGame.string(filter.nid);
                            map = mine.map;
                            html.push('<tr class="group-header" data-prog-map="', mine.map, '">');
                            html.push('<th colspan="7"  class="left">', filter.name, '</th>');
                            html.push('</tr>');
                        }

                        sQty += 1;
                        sVal += uPrg;
                        sMax += mPrg;
                        tQty += 1;
                        tVal += uPrg;
                        tMax += mPrg;
                        html.push('<tr data-mine-map="', mine.map, '">');
                        html.push('<td>', self.mineImage(mine), '</td>');
                        html.push('<td class="left">', mine.name, '</td>');
                        html = progressHTML(html, uPrg, mPrg);
                        html.push('</tr>');
                    }
                }
            });

            if (sQty > 1 && sub > 1)
                html = regionSummary(html, sVal, sMax, sQty);
            prgTBD.innerHTML = html.join('');
            prgTFT.innerHTML = regionSummary([], tVal, tMax, tQty, 'grandTotal').join('');

            return true;
        }
        return false;
    }

    function regionSummary(html, val, max, qty, text = 'subTotal') {
        let trClass = (text == 'subTotal' ? ' group-footer' : '');
        html.push('<tr class="right', trClass, '">');
        html.push('<th colspan="2">', guiString(text), ' (', qty, ' ', guiString('Locations'), ') </th>');
        html = progressHTML(html, val, max, 'th');
        html.push('</tr>');
        return html;
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/