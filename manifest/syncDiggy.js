/*
 ** DA Friends - syncDiggy.js
 */
(function () {
    'use strict';

    var syncDiggy = function (__public) {
        /*********************************************************************
         ** @Public - Test Data
         */
        __public.syncData = function (xml, webData) {
            badgeFlasher(__public.i18n('Sync'), 2, 50, 'green');
            badgeStatus();
            xml = XML2jsobj(xml);
            if (exPrefs.debug) console.log("Sync", xml);
        }

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