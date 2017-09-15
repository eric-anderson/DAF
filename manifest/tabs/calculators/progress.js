/*
 ** DA Friends Calculator - progress.js
 */
var guiTabs = (function(self) {
    let tabID, tab, div, prgWarn, prgSum, prgTot, prgSkip;
    let prgInf, prgGrp, prgTHD, prgTBD, prgTFT, prgDte;
    let progItem = null,
        skipEvents = true,
        skipComplete = true,
        showDates = false,
        mineGroups = true;

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
     ** Define Progress Calculators
     */
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
     ** Special Objects - God Materials/Tokens
     */
    let specialObjects = {
        3: { // CHINA - SCALES
            105: { typ : 'material' },  // Dragon of Wood
            106: { typ : 'material' },  // Dragon of Metal
            107: { typ : 'material' },  // Dragon of Fire
            108: { typ : 'material' },  // Dragon of Water
            109: { typ : 'material' }   // Dragon of Earth
        },
        4: { // ATLANTIS - LOCK's of HAIR
            153: { typ : 'material' },  // Gaia
            156: { typ : 'material' },  // Kronos
            159: { typ : 'material' },  // Mnemosyn
            161: { typ : 'material' },  // Atlas
            167: { typ : 'material' }   // Hyperion
        },
        5: { // GREECE - SHIELDS
            204: { typ : 'material' },  // Zeus
            210: { typ : 'material' },  // Hera
            214: { typ : 'material' },  // Aphrodite
            217: { typ : 'material' },  // Hephaestus
            221: { typ : 'material' },  // Poseidon
            225: { typ : 'material' },  // Ares        

            //  xxx: { typ : 'material' },  // Athena
            //  xxx: { typ : 'material' },  // Dionysus
            //  xxx: { typ : 'material' },  // Apollo
            //  xxx: { typ : 'material' },  // Hades
        }
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(tid, cel) {
        tabID = tid;
        tab = self.tabs.Calculators.menu[tid];
        div = tab.html;
        prgStats = document.getElementById("progStats");
        prgSkip = document.getElementById("progSkipDone");        
        prgWarn = document.getElementById('progWarn');
        prgSum = document.getElementById('progSum');
        prgTot = document.getElementById('progTot');
        prgInf = document.getElementById('progInfo');
        prgGrp = document.getElementById('progGroup');
        prgDte = document.getElementById('progDates');
        prgTHD = document.getElementById('progTHD');
        prgTBD = document.getElementById('progTBD');
        prgTFT = document.getElementById('progTFT');

        mineGroups = !!bgp.exPrefs.progMineGrp;
        prgGrp.addEventListener('change', function(e) {
            bgp.exPrefs.progMineGrp = mineGroups = self.setPref('progMineGrp', e.target.checked);
            doClickInfo(progItem);
        });

        showDates = !!bgp.exPrefs.progMineDate;
        prgDte.addEventListener('change', function(e) {
            bgp.exPrefs.progMineDate = showDates = self.setPref('progMineDate', e.target.checked);
            doClickInfo(progItem);
        });

        prgSkip.checked = skipComplete = !!bgp.exPrefs.progSkipDone;
        prgSkip.addEventListener('change', function(e) {
            bgp.exPrefs.progSkipDone = skipComplete = self.setPref('progSkipDone', e.target.checked);
            regionPrep();
            self.update();
            doClickInfo(progItem);
        });      
        regionPrep();
        
        // Until the code is moved into gameDiggy.js, we clear out the data for
        // Achievements and Collections etc. to ensure we get fresh and up to 
        // date information
        //
        // TODO: Move Data Collection to gameDiggy.js and cache it
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
        prgStats.innerHTML = guiString('dataProcessing');
        prgWarn.style.display = 'none';
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
                let titl = '';
                
                score.pct = score.max > 0 ? ((score.val / score.max) * 100) : 0;
                html.push('<tr id="prog-', key, '" class="', (info ? 'selectable' : ''), '" title="', titl, '">');
                html.push('<td><img src="/img/', score.icon, '"/></td>');
                html.push('<td class="left">', bgp.daGame.string(score.label).toUpperCase(), '</td>');

                if (score.val == score.max) {
                    html.push('<td><img width="24" src="/img/tick.png"/></td>');
                } else
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

            prgWarn.innerHTML = guiString('warnInfoDated', [unixDate(bgp.daGame.daUser.time, true)]);
            prgWarn.style.display = '';

            let now = getUnixTime();
            let started = progress.Region1.bt;
            let playing = self.duration(now - started);
            prgStats.innerHTML = guiString('playTime', [('~' + unixDate(started)), playing, unixDate(now, true)]);
            //console.log(unixDate(started, true));
            
            return true;
        });
    }

    function onClickInfo(e) {
        e.preventDefault();
        e = e.target;
        if (e.tagName != 'TR')
            e = e.parentElement;

        let key = '';
        let flag = null;

        if (!e.id.startsWith('prog-')) {
            if (!e.dataset.progId)
                return;
            key = e.dataset.progId;
        } else
            key = e.id.slice(5);
        progItem = key;
        doClickInfo(key);
    }

    function doClickInfo(key = progItem) {
        let flag = null;
        let i = key.indexOf('-');
        if (i !== -1) {
            i = key.split('-');
            key = i[0];
            flag = i[1];
        }

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
            prgGrp.parentElement.style.display = 'none';
            prgDte.parentElement.style.display = 'none';
            if (func.call(this, key, score, flag) === true) {
                prgTBD.querySelectorAll('.selectable').forEach(function(row) {
                    row.addEventListener('click', onClickInfo);
                });
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

        if (val == max && tag == 'td') {
            html.push('<td><img width="24" src="/img/tick.png"/></td>');
        } else
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

    self.__info_level = function(key, score, flag) {
        if (!bgp.daGame.daLevels)
            return false;

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
        let uidLVL = intOrDefault(bgp.daGame.daUser.level, 1);
        let goal = levelXP(uidLVL);  
        let lvlMax = goal.cnt + 1;
        let lvlMin = Math.min(uidLVL + 1, lvlMax);
        html.push('<tr>');
        html.push('<td><img src="/img/materials/xp.png"/></td>');
        html.push('<td class="left">', '1 ', guiString('toLevel', [lvlMax]), '</td>');
        html = progressHTML(html, goal.val, goal.max);
        html.push('</tr>');

        html.push('<tr class="group-footer">', '<th colspan="7">', '</th>', '</tr>');
        
        let lvlGoal = intOrDefault(bgp.exPrefs.progLvlGoal, uidLVL);
        bgp.exPrefs.progLvlGoal = lvlGoal = Math.min(Math.max(lvlMin, lvlGoal), lvlMax);
        html.push('<tr id="prog-lvl-goal">');
        html.push('</tr>');

        html.push('<tr id="prog-lvl-slider">');
        html.push('<td colspan="7">');
        html.push('<div class"slider-wrap"><input type="range" id="prog-lvl-range" step="1" list="prog-lvl-ticks" value="', lvlGoal, '" min="', lvlMin, '" max="', lvlMax, '"></div>');  
        html.push('<span class="slider-text" style="float: left">', lvlMin, '</span>');
        html.push('<span class="slider-text" style="float: right">', lvlMax, '</span>');
           
        html.push('</td>');        
        html.push('</tr>');

        prgTBD.innerHTML = html.join('');
        document.getElementById('progIcon').src = '/img/stars.png';
        document.getElementById('progName').innerHTML = guiString('Experience');

        let range = document.getElementById('prog-lvl-range');
        levelSlider();
        range.addEventListener('input', function(e) {
            bgp.exPrefs.progLvlGoal = e.target.value;
            levelSlider(e.target);
        });
        return true;
    }

    function levelSlider(tel = null)
    {
        let lvlGoal = bgp.exPrefs.progLvlGoal;
        let uidLVL = intOrDefault(bgp.daGame.daUser.level, 1);
        let goal = levelXP(uidLVL, lvlGoal);  
        let info = document.getElementById('prog-lvl-goal');
        let html = [];
        let val = intOrDefault(bgp.daGame.daUser.exp);
        let max = (goal.max - goal.val) + val;

        html.push('<td><img src="/img/materials/xp.png"/></td>');
        html.push('<td class="left">', uidLVL, ' ', guiString('toLevel', [lvlGoal]), '</td>');
        html = progressHTML(html, val, max);

        info.innerHTML = html.join('');
    }

    function levelXP(uidLevel, capLevel = -1)
    {
        let val = 0;
        let max = 0;
        let cnt = 0;

        Object.keys(bgp.daGame.daLevels).sort(function(a, b) {
            return bgp.daGame.daLevels[a].level - bgp.daGame.daLevels[b].level;
        }).forEach(function(v, l, a) {
            let level = bgp.daGame.daLevels[l];
            let lno = intOrDefault(level.level);
            let xp = intOrDefault(level.xp);
            cnt = lno;

            if ((capLevel == -1) || lno < capLevel) {
                max = max + xp;
                if (lno < uidLevel) {
                    val = val + xp;
                } else if (lno == uidLevel)
                    val = val + intOrDefault(bgp.daGame.daUser.exp);
            }
        });

        return {
            val: val,
            max: max,
            cnt: cnt
        };
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

    self.__info_collect = function(key, score, flag) {
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
            if ((!isBool(goal.hde)) && goal.eid == 0 || !skipEvents) {
                for (let s = 0; s < goal.lvl.length; s++) {
                    if (intOrDefault(goal.lvl[s].amount) > 0)
                        score.max = score.max + 1;                    
                }
            }
        });

        score.val = 0;
        if ((bgp.daGame.daUser.achievs) && bgp.daGame.daUser.achievs) {
            Object.keys(bgp.daGame.daUser.achievs).forEach(function(id) {
                let user = bgp.daGame.daUser.achievs[id];
                let goal = bgp.daGame.daAchievs[user.def_id];
                if ((!isBool(goal.hde)) && goal.eid == 0 || !skipEvents) {
                    score.val = score.val + parseInt(user.confirmed_level);
                }
            });
        }

        return key;
    }

    self.__info_achievs = function(key, score, flag) {
        if (!bgp.daGame.daAchievs)
            return false;

        let uidRID = Math.min(Math.max(bgp.daGame.daUser.region, 1), bgp.daGame.maxRegions());
        let html = [];
        html.push('<tr>');
        html.push('<th colspan="2">', guiString('Measure'), '</th>');
        html.push('<th><img src="/img/a_level.png"/></th>');
        html.push('<th>', Dialog.escapeHtmlBr(guiString('nextStep')), '</th>');
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
                ta = intOrDefault(ta.level);
            if ((tb = bgp.daGame.daUser.achievs[b]))
                tb = intOrDefault(tb.level);

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
                let nxt = 0;

                if ((user) && isBool(user.done) && skipComplete)
                    show = false;
                if ((!user) && goal.rid > uidRID)
                    show = false;
                
                if (show) {
                    let steps = 0;

                    for (let l = 0; l < goal.lvl.length; l++) {
                        let lvl = goal.lvl[l];
                        let amt = intOrDefault(lvl.amount);
                        if (amt > 0) {
                            steps = steps + 1;
                            max = max + amt;
                        }

                        if (user) {
                            if (!isBool(user.done)) {
                                if (lvl.level_id < user.level) {
                                    val = val + amt;
                                } else if (lvl.level_id == user.level) {
                                    let prg = intOrDefault(user.progress);
                                    val = val + prg;
                                    nxt = amt - prg;
                                }
                            } else
                                val = val + amt;
                        }else if(l == 0)
                            nxt = amt;
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
                    html.push('<td>', prg, '/', steps, '</td>');
                    html.push('<td>', numberWithCommas(nxt), '</td>');                    
                    html = progressHTML(html, val, max);
                    html.push('</tr>');
                }
            }
        });

        prgTBD.innerHTML = html.join('');
        return true;
    }

    /*
     ** Region(s) Locations/Mines
     */
    function regionPrep()
    {
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
    }

    self.__calc_regions = function(key, score) {
        let uidPRG = bgp.daGame.daUser.loc_prog;
        let dak = 'da' + key;
        score.max = 0;
        score.val = 0;
        score.bt = 0;
        score.et = 0;

        if (bgp.daGame.hasOwnProperty(dak)) {
            Object.keys(bgp.daGame[dak]).forEach(function(lid) {
                let mine = bgp.daGame.mineInformation(bgp.daGame[dak][lid]);
                let good = regionMineValid(mine);

                if (good) {
                    let mPrg = intOrZero(mine.prg);
                    let uPrg = 0;

                    if (uidPRG.hasOwnProperty(mine.lid)) {
                        let done = uidPRG[mine.lid];
                        uPrg = intOrZero(done.prog);
                        let bt = done.crtd;
                        let et = done.cmpl;

                        if (!mine.isXLO) {
                            // Kludge, if no created time, use the end time minus 1 second
                            if (bt == 0 && et > 0)
                                bt = (et - 1);

                            if (bt < score.bt || score.bt == 0)
                                score.bt = bt;
                            if (et > score.et)
                                score.et = et;
                        }
                    }

                    score.max = score.max + mPrg;
                    score.val = score.val + Math.min(mPrg, uPrg);
                }
            });

            if (score.val < score.max)
                score.et = 0;

            if ((skipComplete) && score.val == score.max)
                score.info = false;
        }

        return key;
    }

    self.__info_regions = function(key, score, flag) {
        let dak = 'da' + key;

        if (bgp.daGame.hasOwnProperty(dak)) {
            let uidPRG = bgp.daGame.daUser.loc_prog;
            let grp = !!((mineGroups) && flag == null);
            let flt = ((mineGroups) ? flag : null);
            let html = [];
            let sub = 0,
                sQty = 0,
                sVal = 0,
                sMax = 0
                sBT = 0,
                sET = 0,
                sDN = 0;
            let map = 0,
                tQty = 0,
                tVal = 0,
                tMax = 0,
                tBT = 0,
                tET = 0,
                tDN;

            if (flt)
                document.getElementById('progName').innerHTML += (' - ' + self.mapName(flt));
            prgDte.parentElement.style.display = '';
            prgDte.checked = showDates;
            prgGrp.parentElement.style.display = '';
            prgGrp.checked = mineGroups;

            html.push('<tr>');
            html.push('<th colspan="2">', guiString((grp ? 'Map' : 'Measure')), '</th>');
            html.push('<th colspan="2">', guiString('Attained'), '</th>');
            html.push('<th>', guiString('Goal'), '</th>');
            html.push('<th>', guiString('Remaining'), '</th>');
            html.push('<th>', guiString('Progress'), '</th>');
            if (showDates) {
                html.push('<th>', '<img src="/img/time_s.png" title="', guiString('Started'), '"/></th>');
                html.push('<th>', '<img src="/img/time_c.png" title="', guiString('Finished'), '"/></th>');
                html.push('<th>', '<img src="/img/time.png" title="', guiString('Duration'), '"/></th>');
            }
            html.push('</tr>');
            prgTHD.innerHTML = html.join('');

            html = [];
            Object.keys(bgp.daGame[dak]).sort(function(a, b) {
                let ta = bgp.daGame[dak][a];
                let tb = bgp.daGame[dak][b];

                if (ta.seq - tb.seq)
                    return ta.seq - tb.seq;
                if (ta.gid - tb.gid)
                    return ta.gid - tb.gid;
                return ta.ord - tb.ord;
            }).forEach(function(lid) {
                let mine = bgp.daGame[dak][lid];
                let good = self.mineValid(mine, false);

                if (good) {
                    let good = regionMineValid(mine);
                    let mPrg = intOrZero(mine.prg);
                    let uPrg = 0;
                    let bt = 0;
                    let et = 0;
                    
                    if ((mine.eid == 0) && mine.mflt == 'side' || mine.gid != 0)
                        mine.isXLO = true;

                    if ((good) && mine.rid != 0) {
                        if (uidPRG.hasOwnProperty(mine.lid)) {
                            uPrg = intOrDefault(uidPRG[mine.lid].prog);
                            bt = intOrDefault(uidPRG[mine.lid].crtd);
                            et = intOrDefault(uidPRG[mine.lid].cmpl);    
                            
                            // Kludge, if no created time, use the end time minus 1 second
                            if (bt == 0 && et != 0)
                                bt = (et - 1);

                            if ((!grp) && uPrg >= mPrg && skipComplete)
                                good = false;
                            if ((flt != null && good) && mine.map != flt)
                                good = false;
                        } else if ((flt != null) && mine.map != flt)
                            good = false;
                    } else
                        good = false;

                    if (good) {
                        let show = !grp;

                        if (map != mine.map) {
                            if (grp) {
                                if (map != 0) {
                                    html = regionGroup(html, key, map, sVal, sMax, sQty, sBT, sET, sDN);
                                    sub += 1;
                                }
                            } else if ((!flt) && map != 0 && sQty > 1) {
                                html = regionSummary(html, sVal, sMax, sQty, sBT, sET, sDN);
                                sub += 1;
                            }
                            map = mine.map;
                            sQty = 0, sVal = 0, sMax = 0, sBT = 0, sET = 0, sDN = 0;
                            if (!grp && !flt) {
                                html.push('<tr class="group-header" data-prog-map="', map, '">');
                                html.push('<th colspan="', (showDates ? 10 : 7), '"  class="left">', self.mapName(map), '</th>');
                                html.push('</tr>');
                            }
                        }

                        // Fix for issues like "Tomb of the First Emperor"!
                        uPrg = Math.min(mPrg, uPrg);

                        if (show) {
                            let titl = '';

                            html.push('<tr data-mine-map="', mine.map, '" title="', titl, '">');
                            html.push('<td>', self.mineImage(mine), '</td>');
                            html.push('<td class="left">', mine.name, '</td>');
                            if (mPrg == 0) {
                                html.push('<td colspan="5">', '</td>');
                            }else
                                html = progressHTML(html, uPrg, mPrg);
                            if (showDates) {
                                html.push('<td>', unixDate(bt, true), '</td>');
                                html.push('<td>', ((et > 0) ? unixDate(et, true) : ''), '</td>');
                                html.push('<td>', ((et > 0) ? self.duration(et - bt) : ''), '</td>');
                            }
                            html.push('</tr>');
                        }

                        sQty += 1;
                        sVal += uPrg;
                        sMax += mPrg;
                        if ((sBT == 0) || bt < sBT)
                            sBT = bt;
                        if (et > sET)
                            sET = et;
                        sDN += (et - bt);

                        tQty += 1;
                        tVal += uPrg;
                        tMax += mPrg;
                        if ((tBT == 0) || bt < tBT)
                            tBT = bt;
                        if (et > tET)
                            tET = et;
                        tDN += (et - bt);
                        
                    }
                }
            });

            if ((!grp) && sQty > 1 && sub > 1) {
                html = regionSummary(html, sVal, sMax, sQty, sBT, sET, sDN);
            } else if (grp && sQty > 0)
                html = regionGroup(html, key, map, sVal, sMax, sQty, sBT, sET, sDN);

            prgTBD.innerHTML = html.join('');
            prgTFT.innerHTML = regionSummary([], tVal, tMax, tQty, tBT, tET, tDN, 'grandTotal').join('');
            return true;
        }
        return false;
    }

    function regionMineValid(mine) {
        // Emerald Nest (1345) was a re-diggable location until December of 2015. 
        // PF changed the format. It will NOT count towards the Hero of Egypt Achievement,
        // so we ignore it. In case the Mine ID changes, we will use the Name ID as the 
        // identifier
        //
        // Anpu's Arena (1642) and Anpu's Racetrack (1643) are not part of the 
        // main game so skip as well (seem to have been a later addition?)
        //
        // The following mines, have old and new versions, so we need to check
        // which is the correct version to use, the daFilters, gives the current
        // correct list, but we need these checks to allow for users who played
        // the old versions!
        //
        // All in Egypt, Anubis
        //
        // Deserted Tomb, OLD: 29, NEW: Various, Part of Tutorials
        // Smugglers Den, OLD: 33, NEW: 289
        // Prison,        OLD: 34, NEW: 292
        // Stone Pit,     OLD: 37, NEW: 293
        //
        let uidPRG = bgp.daGame.daUser.loc_prog;        

        if (self.mineValid(mine, false)) {
            
            if (mine.flt == 'test' || mine.nid == 'TEST' || mine.map == 86 || mine.map == 87 || mine.map == 88)
                return false;

            if (mine.rid == 1) {
                if (mine.nid == 'LONA203' || mine.lid == 1642 || mine.lid == 1643 || mine.lid == 29)
                    return false;
                if (mine.lid == 33 && uidPRG.hasOwnProperty(289))
                    return false;
                if (mine.lid == 289 && uidPRG.hasOwnProperty(33))
                    return false;
                if (mine.lid == 34 && uidPRG.hasOwnProperty(292))
                    return false;
                if (mine.lid == 292 && uidPRG.hasOwnProperty(34))
                    return false;
                if (mine.lid == 37 && uidPRG.hasOwnProperty(293))
                    return false;
                if (mine.lid == 293 && uidPRG.hasOwnProperty(37))
                    return false; 
            }
            return true;
        }
        return false;
    }
    
    function regionGroup(html, key, map, sVal, sMax, sQty, bt, et, dn) {
        if ((!skipComplete) || sVal < sMax) {
            html.push('<tr class="selectable" id="prog-', key, '-', map, '">');
        } else
            html.push('<tr>');
        html.push('<td>', self.mapImage(map), '</td>');
        html.push('<td class="left">', self.mapName(map), '</td>');
        html = progressHTML(html, sVal, sMax);

        if (showDates) {
            html.push('<td>', unixDate(bt, true), '</td>');
            html.push('<td>', ((et > 0 && sVal >= sMax) ? unixDate(et, true) : ''), '</td>');
            html.push('<td>', ((et > 0 && sVal >= sMax) ? self.duration(et - bt) : ''), '</td>');
        }

        html.push('</tr>');
        return html;
    }

    function regionSummary(html, val, max, qty, bt, et, dn, text = 'subTotal') {
        let trClass = (text == 'subTotal' ? ' group-footer' : '');
        html.push('<tr class="right', trClass, '">');
        html.push('<th colspan="2">', guiString(text), ' (', qty, ' ', guiString('Locations'), ') </th>');
        html = progressHTML(html, val, max, 'th');
        
        if (showDates) {
            html.push('<th>', unixDate(bt, true), '</th>');
            html.push('<th>', ((et > 0 && val >= max) ? unixDate(et, true) : ''), '</th>');
            html.push('<th>', ((et > 0 && val >= max) ? self.duration(et - bt) : ''), '</th>');
        }

        html.push('</tr>');
        return html;
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/