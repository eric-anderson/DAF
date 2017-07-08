/*
 ** DA Friends - syncDiggy.js
 */
(function() {
    'use strict';
    var handlers = {};

    var syncDiggy = function(__public) {
        /*********************************************************************
         ** @Public - Sync Data
         */
        __public.syncData = function(xml, webData) {
            // Only sync on good game data (also means we ignore if cached data too)
            if (__public.daUser.result != "OK")
                return;

            if ((xml = XML2jsobj(xml)) && xml.hasOwnProperty('xml')) {
                var didSomething = false;
                xml = xml.xml;
                if (exPrefs.debug) console.log("Sync", xml);
                if (!Array.isArray(xml.task)) {
                    didSomething = action(xml.task, webData.tabId);
                } else
                    for (key in xml.task) {
                        if (action(xml.task[key], webData.tabId))
                            didSomething = true;
                    }

                if (didSomething) {
                    badgeFlasher(__public.i18n('Sync'), 2, 250, 'green');
                    badgeStatus();
                }
            }
        }

        /*
         ** @Private - Call sync action
         */
        function action(task, tab) {
            var msg = null,
                taskFunc = '__gameSync_' + task.action;
            if (typeof handlers[taskFunc] === "function") {
                try {
                    msg = handlers[taskFunc].call(this, task);
                } catch (e) {
                    console.error(taskFunc + '() ' + e.message);
                    return false;
                }
            } else {
                if (exPrefs.debug) console.log(taskFunc, task);
                return false;
            }

            if (msg) {
                console.log("action message: ", task.action, msg);
                // Message the GUI
                chrome.extension.sendMessage({
                    cmd: 'gameSync',
                    action: task.action,
                    data: msg
                });
                // Message the content script(s)
                chrome.tabs.sendMessage(tab, {
                    cmd: 'gameSync',
                    action: task.action,
                    data: msg
                });

                return true;
            }

            return false;
        }

        /*
         ** friend_child_charge
         */
        handlers['__gameSync_friend_child_charge'] = function(task) {
            var uid = task.neigh_id;
            if (__public.daUser.neighbours.hasOwnProperty(uid)) {
                if (__public.daUser.neighbours[uid].spawned != "0") {
                    if (!__public.daUser.neighbours[uid].hasOwnProperty('gcCount'))
                        __public.daUser.neighbours[uid].gcCount = parseInt(__public.daConfig.child_count);
                    if (!(--__public.daUser.neighbours[uid].gcCount)) {
                        // Collected all of them!
                        __public.daUser.neighbours[uid].spawned = "0";

                        // Should really update the cache, but what a pain!!!

                        return {
                            uid: uid
                        };
                    }
                }
            } else if (exPrefs.debug)
                console.log("friend_child_charge", uid, "cannot find neighbour?");
            return null;
        }

        /*********************************************************************
         ** @Public Methods (and propertys)
         */
        return __public;
    }

    /*
     ** Attach to global namespace
     */
    window.syncDiggy = syncDiggy;
})();


/**

function gameSync()
{
    //if (exPrefs.debug) console.log("gameSync", sniffData.requestForm);
    flashBadge("Sync", 2, 50);
    statusSniffing();

    for (key in sniffData.requestForm.task) {
        var action = sniffData.requestForm.task[key].action;
        var time = sniffData.requestForm.task[key].time;

        switch(action)
        {
            case 'enter_mine':              // loc_id
            case 'change_level':            // exit_id, direction
                syncLocation(sniffData.requestForm.task[key]);
                break;

            case 'leave_mine':              // loc_id, cur_row, cur_column, level
            case 'mine':                    // stamina, row, column, cur_row, cur_column

            case 'unload_anvil_alloy':      // anvil_id
            case 'start_anvil_alloy':       // anvil_id, alloy_id
            case 'unload_pot_recipe':       // pot_id
            case 'start_pot_recipe':        // pot_id, pot_recipe_id
            case 'prod_unload_caravan':     // caravan_id, debug_timer, unique_id
            case 'prod_send_caravan':       // caravan_id, dest_id
            case 'use_beacon':              // row, column, cur_row, cur_column
            case 'talk_to_npc':             // npc_id
            case 'accept_quest':            // quest_id
            case 'complete_quest_step':     // quest_id, step_id
            case 'send_gift':               // neighbour_id (CSV List of ID's), gift_id
            case 'accept_gift':             // gift_id (CSV List of ID's)
            case 'camp_switch':             // No fields
            case 'visit_camp':              // neigh_id
            case 'place_windmill':          // neigh_id, pos_x, def_id, line_id
            case 'friend_child_charge':     // neigh_id, def_id
            case 'place_building':          // building_id, line_id, slot
            case 'remove_building':         // building_id
            case 'sale':
            case 'track_loading':
            default:
                if (exPrefs.debug) console.log(key, time, action, sniffData.requestForm.task[key]);
                break;
        }
    }

    if (exTab)
        chrome.tabs.sendMessage(exTab, { cmd: "gameSync", data: sniffData.requestForm });
}

function syncLocation(task = null)
{
    var loc = {
        id:     0,
        lvl:    1,
        prog:   0,
        lock:   0,
        reset:  0,
        cmpl:   0,
        crtd:   0
    };

    if (!daData.loc_prog.hasOwnProperty(daData.loc_id)) {
        if (exPrefs.debug) console.log("Current Location, No Progress Found!", daData.loc_id);
        loc.id = daData.loc_id;
        daData.loc_prog[daData.loc_id] = loc;
    }else
        loc = daData.loc_prog[daData.loc_id];

    if (task) {
        if (task.action == 'enter_mine') {
            if (exPrefs.debug) console.log("Current Location: ", daData.loc_id, " Floor: ", daData.loc_floor, loc);
            if (!daData.loc_prog.hasOwnProperty(task.loc_id)) {
                if (exPrefs.debug) console.log("New Location, No Progress Found!", task.loc_id);
            }else {
                loc = daData.loc_prog[task.loc_id];
                daData.loc_level = loc.lvl;
            }
            daData.loc_id = task.loc_id;
        }else if(task.action == 'change_level') {
            if (task.direction == 'up')     daData.loc_floor = (daData.loc_floor - 1);
            if (task.direction == 'down')   daData.loc_floor = (daData.loc_floor + 1);
        }
        if (exPrefs.debug) console.log("Location: ", daData.loc_id, " Floor: ", daData.loc_floor, task, loc);
        return;
    }
    if (exPrefs.debug) console.log("Location: ", daData.loc_id, " Floor: ", daData.loc_floor, loc);
}

**/

/*
 ** END
 *******************************************************************************/