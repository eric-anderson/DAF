/*
 ** DA Friends Calculator = repeat.js
 */
var guiTabs = (function(self) {
    let tabID, tab, div, rmStats, rm1Loot, rm2Loot;
    let mapRID = 0,
        mapFLT = 0,
        mapLID = 0,
        mapMine = {},
        mapLoot = {};
    let showLoot = 'all',
        showEvents = false,
        showTokens = true,
        onlyRepeat = true;

    /*
     ** Define this Menu Item details
     */
    self.tabs.Calculators.menu.repeat = {
        title: 'Repeatables',
        image: 'loot.png',
        html: true,
        onInit: onInit,
        onAction: onAction,
        onUpdate: onUpdate,
    };

    /*
     ** @Private - Initialise the tab
     */
    function onInit(tid, cel) {
        tab = self.tabs.Calculators.menu[tid];
        tabID = tid;
        div = tab.html;
        rmStats = document.getElementById("repeatStats");
        rmFloor = document.getElementById("repeatFloor");
        rm1Loot = document.getElementById("repeatLoot1");
        rm2Loot = document.getElementById("repeatLoot2");
        showEvents = self.isDev();
        onlyRepeat = !self.isDev();
        buildFilters();
    }

    /*
     ** @Private - Sync Action
     */
    let actRow,
        actCol,
        actLoot = null,
        actMine = null,
        actFloor = null;

    function onAction(id, action, data) {
        //console.log(id, "onAction", action, data);
        if (action == 'enter_mine' || action == 'change_level') {
            bgp.daGame.mineDetails(data.id, true).then(function(mine) {
                actMine = mine;
                actFloor = mine.floors[data.level_id];
                console.log("Entered", data.id, data.level_id, mine);
            });
        } else if (action == 'leave_mine') {
            actMine = null;
            actFloor = null;
        } else if (action == 'mine') {
            pos = data.row + ',' + data.column;
            if (actFloor !== null) {
                actLoot = [];
                Object.keys(actFloor.loot).forEach(function(aid) {
                    let loot = actFloor.loot[aid];
                    if (loot.tle.indexOf(pos) !== -1) {
                        let rnd = getRandomIntInclusive(loot.min, loot.max); 

                        let avg = Math.ceil((parseInt(loot.min) + parseInt(loot.max)) / 2);
                        avg = Math.min(Math.max(parseInt(avg), 0), parseInt(loot.max));

                        console.log(pos, loot.oid, self.objectName(loot.typ, loot.oid), loot, rnd, avg);
                        actLoot.push(loot);
                    }
                });
            }
        }
    }

    function getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min; 
      }

    /*
     ** @Private - Update the tab
     */
    function onUpdate(id, reason) {
        rmStats.innerHTML = '<hr />' + guiString('gameGetData');
        document.getElementById("repeatWrapper").style.display = 'none';
        return bgp.daGame.mineDetails(mapLID, true).catch(function(error) {
            rmStats.innerHTML = '<hr />' + error;
            return null;
        }).then(doUpdate);
    }

    /*
     ** @Private - Update Mine Loot Display
     */
    function doUpdate(mine = mapMine) {
        if (mine === null)
            return true;
        document.getElementById("repeatWrapper").style.display = '';
        rmStats.innerHTML = '';
        rmFloor.innerHTML = '';
        mapMine = mine;
        mapLoot = self.lootMine(mapMine, bgp.daGame.daUser.region, bgp.daGame.daUser.level, floorDisplay);
        console.log('mapLoot', mapLoot);
        lootDisplay(mapLoot.total);
        return true;
    }

    /*
     ** @Private - floorDisplay
     */
    function floorDisplay(mine, vnt, fid, fLoot) {
        console.log('floorDisplay', vnt, fid, fLoot, mine);
        let html = [];

        html.push('<tr>');
        if (fid == 1) {
            let tdrs = '<td rowspan="' + mine.flr + '">';

            html.push('<td id="rmine-', mine.lid, '-all', '" rowspan="', mine.flr,
                '" class="', ((mine.cdn == 0 && mine.flr > 1) ? 'selectable' : ''),
                '">', mine.name, '</td>');
            html.push(tdrs, ((mine.rql > 0) ? numberWithCommas(mine.rql) : '-'), '</td>');
            html.push(tdrs, ((mine.cdn > 0) ? self.duration(mine.cdn) : '-'), '</td>');
            html.push(tdrs, ((mine.cdn > 0) ? numberWithCommas(mine.gem) : '-'), '</td>');
            html.push(tdrs, numberWithCommas(mine.rxp), '</td>');
        }

        html.push('<td id="rmine-', mine.lid, '-', fid, '" class="', ((mine.flr > 1) ? 'selectable' : ''), '">', fid, '</td>');
        html.push('<td class="right">', numberWithCommas(mine.floors[fid].prg), '</td>');
        html.push('<td class="right">', numberWithCommas(fLoot.chance, 0), '%</td>');
        html.push('</tr>');
        rmFloor.innerHTML += html.join('');
    }

    /*
     ** @Private - lootDisplay
     */
    function lootDisplay(count) {
        rm1Loot.innerHTML = '';
        rm2Loot.innerHTML = '';

        console.log('lootDisplay - count', count);

        if (count) {
            let order = self.objectOrder();

            //console.log(showTokens, name, count);
            Object.keys(count).sort(function(a, b) {
                return order.indexOf(a) - order.indexOf(b);
            }).forEach(function(typ) {
                Object.keys(count[typ]).sort(function(a, b) {
                    let ta = count[typ][a];
                    let tb = count[typ][b];
                    let rank = 0;

                    if ((rank = self.objectRank(typ, a, 0) - self.objectRank(typ, b, 0)) != 0)
                        return rank;
                    return tb.avg - ta.avg;
                }).forEach(function(s_oid) {
                    if ((showTokens) || typ != 'token' && typ != 'artifact') {
                        let loot = count[typ][s_oid];
                        let oid = loot.oid;
                        let html = [];


                        if (loot.name) {
                            html.push('<tr data-oid="', oid, '">');
                            html.push('<td>', self.objectImage(typ, oid, 24), '</td>');
                            html.push('<td>', loot.name, '</td>');
                            if (loot.min != loot.max) {
                                html.push('<td>', numberWithCommas(loot.min), '</td>');
                                html.push('<td>', numberWithCommas(loot.avg), '</td>');
                                html.push('<td>', numberWithCommas(loot.max), '</td>');
                            } else if (loot.avg != 0) {
                                html.push('<td></td><td>', numberWithCommas(loot.avg), '</td><td></td>');
                            } else
                                html.push('<td></td>', '<td></td>', '<td></td>');
                            html.push('<td>', (loot.qty > 0 ? numberWithCommas(loot.qty) : ''));
                            if (loot.rnd)
                                html.push('<img src="/img/dice.png" />', '[', loot.rnd, ']');
                            html.push('</td>');
                            html.push('</tr>');

                            let eid = 0
                            if (typeof bgp.daGame.daMaterials[oid] !== 'undefined')
                                eid = bgp.daGame.daMaterials[oid].eid;

                            if ((typ == 'material') && eid == 0) {
                                //console.log(loot.name, bgp.daGame.daMaterials[oid]);
                                rm1Loot.innerHTML += html.join('');
                            } else
                                rm2Loot.innerHTML += html.join('');
                        }
                    }
                });
            });
        }
    }

    /*
     ** @Private - Build Filters
     */
    function buildFilters() {
        // Region Filter
        let max = Math.min(bgp.daGame.daUser.region, bgp.daGame.maxRegions());
        let select = document.getElementById('repeatRID');
        select.innerHTML = '';

        for (let rid = (showEvents ? 0 : 1); rid <= max; rid++) {
            let option = document.createElement('option');
            let name = self.regionName(rid, showEvents);
            select.appendChild(option);
            option.innerText = (name ? name : rid);
            option.value = rid;
        }

        if ((!bgp.exPrefs.repeatRID) || bgp.exPrefs.repeatRID > max)
            bgp.exPrefs.repeatRID = max;
        select.value = mapRID = bgp.exPrefs.repeatRID;

        select.addEventListener('change', function(e) {
            mapRID = self.setPref(e.target.id, e.target.value);
            mapFilter();
            mineFilter();
            self.update();
        });

        select.dispatchEvent(new Event('change', {
            'bubbles': true
        }));
    }

    function mapFilter() {
        let select = document.getElementById('repeatFLT');
        select.innerHTML = '';
        select.parentElement.style.display = (onlyRepeat ? 'none' : '');

        if (!bgp.daGame.daFilters)
            return;

        let list = Object.keys(bgp.daGame.daFilters).reduce(function(items, fid) {
            let map = bgp.daGame.daFilters[fid];
            if (map.rid == mapRID) {
                let isRepeat = map.flt.endsWith('refresh');
                if ((isRepeat) || !onlyRepeat)
                    items.push(fid);
            }
            return items;
        }, []).sort(function(a, b) {
            let ta = bgp.daGame.daFilters[a];
            let tb = bgp.daGame.daFilters[b];
            return ta.ord - tb.ord;
        });

        list.forEach(function(fid) {
            let map = bgp.daGame.daFilters[fid];
            let option = document.createElement('option');
            select.appendChild(option);
            option.innerText = bgp.daGame.string(map.nid);
            option.value = fid;
        });

        if ((!bgp.exPrefs.repeatFLT) || list.indexOf(bgp.exPrefs.repeatFLT) === -1) {
            bgp.exPrefs.repeatFLT = list[0];
        }
        select.value = mapFLT = bgp.exPrefs.repeatFLT;

        select.addEventListener('change', function(e) {
            mapFLT = self.setPref(e.target.id, e.target.value);
            mineFilter();
            self.update();
        });
    }

    function mineFilter() {
        let select = document.getElementById('repeatLID');
        let minesKey = 'daRegion' + mapRID;
        select.innerHTML = '';

        if (!bgp.daGame.hasOwnProperty(minesKey) || !bgp.daGame.daFilters)
            return;

        let map = bgp.daGame.daFilters[mapFLT];
        let list = Object.keys(bgp.daGame[minesKey]).reduce(function(items, lid) {
            let mine = bgp.daGame[minesKey][lid];
            if (mine.flt == map.flt && !isBool(mine.tst))
                items.push(lid);
            return items;
        }, []).sort(function(a, b) {
            let ta = bgp.daGame[minesKey][a];
            let tb = bgp.daGame[minesKey][b];
            return ta.ord - tb.ord;
        });

        list.forEach(function(lid) {
            let mine = bgp.daGame[minesKey][lid];
            let option = document.createElement('option');
            select.appendChild(option);
            option.innerText = bgp.daGame.string(mine.nid);
            option.value = lid;
        });

        if ((!bgp.exPrefs.repeatLID) || list.indexOf(bgp.exPrefs.repeatLID) === -1)
            bgp.exPrefs.repeatLID = list[0];
        select.value = mapLID = bgp.exPrefs.repeatLID;

        select.addEventListener('change', function(e) {
            mapLID = self.setPref(e.target.id, e.target.value);
            self.update();
        });
    }

    return self;
}(guiTabs || {}));
/*
 ** End
 *******************************************************************************/