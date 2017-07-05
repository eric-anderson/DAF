/*
** DA Friends - gameDiggy.js
*/
(function() {
  'use strict';

   /*
   ** Initialization Method
   */
   var gameDiggy = function()
   {
      // Private
      var collect = exPrefs.autoData;
      var working = false;
      var handlers = {};

      /*
      ** Public Methods (and propertys)
      */
      var __public = {
         player_id: 0,
         site: null,
         init: function(parent) {
            parent.__public = this;
            this.callBack();
            // TODO - See syncData() below, may not need/want this
            //if (exPrefs.trackGift)
               //syncScript();
            delete this.init;
            return this;
         }
      };

      /*********************************************************************
      ** @Public - Set any user supplied callback
      */
      var callback = null;

      __public.callBack = function(callme = null)
      {
         if (typeof callme === 'function') {
            callback = callme;
         }else {
            callback = function(action = null, text = null, file = null) {
               if (exPrefs.debug) console.log("CB:", action, text, file);
               chrome.runtime.sendMessage({ cmd: action, text: text, file: file });
               switch(action) {
                  case 'gameLoading':
                     chrome.browserAction.setIcon({path:"/img/iconGrey.png"});
                     break;
                  case 'dataLoading':
                  case 'dataStart':
                     chrome.browserAction.setIcon({path:"/img/iconBlue.png"});
                     break;
                  case 'dataDone':
                     var icon;
                     switch(__public.daUser.result) {
                        case 'OK':     icon = 'iconGreen.png'; break;
                        case 'CACHED': icon = 'icon.png';      break;
                        case 'EMPTY':
                           icon = 'iconGrey.png';
                           break;
                        default:
                           icon = 'iconRed.png';
                           break;
                     }
                     chrome.browserAction.setIcon({path:"/img/" + icon});
                     break;
                  case 'dataError':
                     chrome.browserAction.setIcon({path:"/img/iconRed.png"});
                     break;
                  default:
                     break;
               }
            };
         }
      }

      /*********************************************************************
      ** @Public - Get i18n String
      */
      __public.i18n = function(string, subs = null)
      {
         var text = '';

         if (typeof string === 'string') {
            text = chrome.i18n.getMessage(string, subs);
            if (!text) {
               console.warn("Missing i18n", string);
               if (exPrefs.debug) console.trace();
               return string;
            }
         }
         return text;
      }

      /*********************************************************************
      ** @Public - Get a Game String
      */
      __public.string = function(string)
      {
         var lang = getLangKey();

         try {
            if ((__public.hasOwnProperty(lang)) && __public[lang] !== null)  {
               if (__public[lang].hasOwnProperty(string))
                  return __public[lang][string];
               console.warn("Missing Game String", lang, string);
               if (exPrefs.debug) console.trace();
            }
         }catch(e) {
            console.error(e);
         }
         if((lang = __public.i18n(string)))
            return lang;
         return string;
      }

      /*********************************************************************
      ** @Public - Force a game reload and data capture
      */
      __public.reload = function()
      {
         chrome.tabs.query({}, function(tabs)
         {
            var url, site, daSite, daTab = 0;

            for (var i = tabs.length - 1; i >= 0; i--) {
               url = tabs[i].url;
               if ((site = isGameURL(url))) {
                  daTab = tabs[i].id;
                  daSite = site;
                  if (site == exPrefs.gameSite) {
                     console.log("Found Prefered", exPrefs.gameSite);
                     break;
                  }
               }else if (exPrefs.gameSite == 'portal') {
                  url = urlObject({'url': url});
                  if (url.host == 'portal.pixelfederation.com') {
                     daTab = tabs[i].id;
                     daSite = false;
                     break;
                  }
               }
            }

            if (exPrefs.debug) console.log("Force Reload", daTab, daSite);

            gameData = true;  // Mark for forced data capture
            badgeStatus();
            if (!daTab) {
               chrome.tabs.create({active: true, url: reloadURL(exPrefs.gameSite)}, function(tab) {
                  gameData = true;
               });
            }else if (daTab && daSite) {
               chrome.tabs.reload(daTab);
            }else if (daTab)
               chrome.tabs.update(daTab, {active: true, url: reloadURL(exPrefs.gameSite)}, function(tab) {
                  gameData = true;
               });
         });
      }

      function reloadURL(site)
      {
         var location = gameUrls[site];
         location = location.replace("/*", "");
         location = location.replace("*", "");
         return location;
      }

      /*********************************************************************
      ** @Public - Send a notification to the GUI
      */
      __public.notification = function(action = null, text = null, file = null)
      {
         return callback.call(this, action, text, file);
      }

      /*********************************************************************
      ** @Public - Test Data
      */
      __public.testData = function()
      {
         if (!working) {
            __public.site = 'test';
            chrome.browserAction.setIcon({path:"/img/iconBlue.png"});
            http.get.xml(chrome.extension.getURL('test_data.xml'))
            .then(__public.processXml)
            .then(function(success) {
               if (exPrefs.debug) {
                  console.log("Test Data Success:", success);
                  chrome.storage.local.getBytesInUse(null, function(info) {
                     info = numberWithCommas(info);
                     if (exPrefs.debug) console.log("Storage Used", info, "out of", storageSpace);
                     chrome.storage.local.get(null, function(loaded) {
                         if (exPrefs.debug) console.log("storage.local", loaded, __public);
                     });
                  });
               }
            });
         }
      };

      /*********************************************************************
      ** @Public - Clear Cached Game Data
      */
      __public.cacheClear = function(all = false)
      {
         var langKey = 'daLang_' + exPrefs.gameLang.toUpperCase();
         chrome.storage.local.remove('daFiles');
         chrome.storage.local.remove(langKey);
         chrome.storage.local.remove(Object.keys(gameFiles));
         if (all) {
            chrome.storage.local.remove('daUser');
            __public.daUser = {
               result:  'EMPTY',
               desc:    'Cache Cleared',
               time:    new Date() / 1000,
               site:    __public.i18n('None'),
               lang:    exPrefs.gameLang.toUpperCase()
            };
         }
         callback.call(this, 'dataDone');
      }

      /*********************************************************************
      ** @Public - Get Cached Game User Data
      */
      __public.cachedData = function()
      {
         if (exPrefs.debug) console.groupCollapsed("Data Cache");
         if (exPrefs.debug) console.log("Load Cached Data");

         callback.call(this, 'dataStart', 'gameGetData');
         return chrome.storage.promise.local.get({ daUser: gameUser })
         .then(function(cachedUser) {
            __public.daUser = cachedUser.daUser;
            if (__public.daUser.result == 'OK') {
               __public.daUser.result = "CACHED";
               __public.site = __public.daUser.site;
               __public.player_id = 0;
               if (__public.daUser.player !== null)
                  __public.player_id = __public.daUser.player.uid;
               return loadGameFiles();
            }
            return false;
         }, function(error) {
            __public.daUser = gameUser;
            __public.daUser.result = "EMPTY";
            return false
         }).then(function(success) {
            if (success) {
               callback.call(this, 'dataDone');
            }else {
               __public.daUser.result = "EMPTY";
               callback.call(this, 'dataDone');
            }
            lockProperty(__public, "daUser");
            if (exPrefs.debug) {
               console.log("Cached Data", __public)
               chrome.storage.local.getBytesInUse(null, function(info) {
                  info = numberWithCommas(info);
                  if (exPrefs.debug) console.log("Storage Used", info, "out of", storageSpace);
               });
            }
            if (exPrefs.debug) console.groupEnd("Data Cache");
         });
      }

      /*********************************************************************
      ** @Public - getNeighbours
      */
       __public.getNeighbours = function()
       {
	   return __public.daUser.neighbours;
       }
       
      /*********************************************************************
      ** @Public - Load Game User (generator.php)
      */
      __public.gameData = function(url, form)
      {
         // Get from Web & Process it
         return http.post(url, 'text/xml', form).then(__public.processXml);
      }

      /*********************************************************************
      ** @Public - Game Sync Data (overridden by dynamic module)
      */
      __public.syncData = function(xml, webData)
      {
      }

      /*********************************************************************
      ** @Private - Load Sync Script
      */
      function syncScript(params = null)
      {
         let promise = new Promise((resolve, reject) =>
         {
            if (exPrefs.debug) console.log("Need Sync Script:", exPrefs.gameSync)
            if (exPrefs.gameSync && !window.hasOwnProperty('syncDiggy')) { try {
               if (exPrefs.debug) console.log("Load Sync Script")
               var script = document.createElement('script');
               script.onload = function () {
                  window.syncDiggy(__public);
                  resolve(params);
               };
               script.onerror = function (e) {
                  throw Error(e);
               };
               script.src = "syncDiggy.js";
               document.head.appendChild(script);
               script = null;
            } catch(e) {
               console.error(e);
               window['syncDiggy'] = false;
               delete window.SyncDiggy;
               resolve(params);
            }}else {
               if (exPrefs.debug) console.log("Got Sync Script")
               resolve(params);
            }
         });
         return promise;
      }

      /*********************************************************************
      ** @Private - Process Game User
      */
      var gameUser = {
         site: null,
         lang: exPrefs.gameLang,
         time: null,
         desc: null,
         result: "EMPTY",  // Don't change the order of these!

         access: null,
         name: null,
         surname: null,
         config_id: null,
         gender: null,
         country: null,
         region: null,
         loc_id: null,
         loc_floor: null,
         level: null,
         exp: null,
         camp_set: null,
         windmill_limit: null,
         login_count: null,
         //rated: null,
         //rated_date: null,
         dr_time: null,
         dr_tz_offset: null,
         static_root: null,
         cdn_root: null,

         //revenue: null,
         //currency: null,
         //payment_count: null,
         //last_payment: null,

         neighbours: null,
         un_gifts: null,   // This MUST follow the neighbours

         loc_prog: null,
         camp: null,
         materials: null,
         stored_windmills: null,
         stored_buildings: null,
         stored_decorations: null,
         anvils: null,
         alloys: null,
         caravans: null,
         destinations: null,
         children: null,
         pots: null,
         pot_recipes: null,
         events: null,
         tokens: null,
         file_changes: null,
         recipients: null,
         //equip: null,
         //f_actions: null,
      };

      /*
      ** @Public - Process generator.xml
      */
      __public.processXml = function(xml)
      {
         if (working)
            return false;
         working = true;

         let promise = new Promise((resolve, reject) =>
         {
            if (exPrefs.debug) console.groupCollapsed("Game Data");
            if (exPrefs.debug) console.log("Processing Started");
            callback.call(this, 'dataStart', 'gameParsing');

            if (!(__public.hasOwnProperty('daUser'))) {
               Object.defineProperty(__public, "daUser", {
                  value: {},
                  writable: false,
                  configurable: true
               });
            }

            parse(xml).then(chrome.storage.promise.local.set)
            .catch(function(error) {
               // Log but skip ahead
               if (exPrefs.debug) console.log("Caught Error", error);
               return false;
            })
            .then(function() {
               if (exPrefs.debug) console.log("Result:", __public.daUser.result, __public.daUser.desc);
               if (__public.daUser.result == 'OK') {
                  __public.daUser.site = __public.site;
                  if (__public.daUser.player === null) {
                     __public.daUser.result = 'ERROR';
                     __public.daUser.desc = __public.i18n('errorYou');
                     return false;
                  }
                  return loadGameFiles();
               }else
                  return false;
            })
            .catch(function(error) {
               // Log but skip ahead
               if (exPrefs.debug)console.log("Caught Error", error);
               return false;
            })
            .then(function(success) {
               Object.defineProperty(__public, "daUser", {
                  writable: false,
                  configurable: true
               });

               if (success && __public.daUser.result == 'OK') {
                  callback.call(this, 'dataDone');
               }else {
                  callback.call(this, 'dataError', 'gameError');
                  success = false;
               }

               if (exPrefs.debug) console.log("Processing Finished", success, __public.daUser);
               if (exPrefs.debug) console.groupEnd("Game Data");
               chrome.storage.local.getBytesInUse(null, function(info) {
                  info = numberWithCommas(info);
                  if (exPrefs.debug) console.log("Storage Used", info, "out of", storageSpace);
               });
               working = false;

               gameSniff = gameData = false;
               badgeStatus();

	       __public.injectGCTable();
	       resolve(success);
            })
            .then(syncScript);
         });

         return promise;
      }

      __public.injectGCTable = function(daTab) {
	  if (!daTab) {
	      chrome.tabs.query({}, function(tabs) {
		  var found = false;
		  for (var i = 0; i < tabs.length; i++) {
		      if (isGameURL(tabs[i].url)) {
			  console.log('Found tab', tabs[i].id, 'to inject GCTable');
			  __public.injectGCTable(tabs[i].id);
			  found = true;
			  break;
		      }
		  }
		  if (!found) {
		      console.error('did not find DA tab but asked to inject GCTable');
		  }
	      });

	      return;
	  }
	  if (exPrefs.debug) { console.log('injecting createGCTable into tab', daTab); }
	  chrome.webNavigation.getAllFrames({tabId: daTab}, function(frames) {
	      var frameId = 0;
	      for (var i = 0; i < frames.length; i++) {
		  if (frames[i].parentFrameId == 0 && frames[i].url.includes('/miner/')) {
		      if (frameId == 0) {
			  console.log('found frame', frames[i]);
			  frameId = frames[i].frameId;
		      } else {
			  console.error('Duplicate miner frame ids?', frameId, frames[i].frameId);
			  frameId = -1;
		      }
		  }
	      }
	      if (frameId <= 0) {
		  console.error('No unique miner frame id?');
	      } else {
		  console.log('Injecting gcTable js & css into ', daTab, '/', frameId);
		  chrome.tabs.executeScript(daTab, { file: 'manifest/gcTable.js',
						     allFrames: false, frameId: frameId },
					    function(results) { console.log('executeScript:', results); });
		  chrome.tabs.insertCSS(daTab, { file: 'manifest/gcTable.css',
						 allFrames: false, frameId: frameId },
					function(results) { console.log('insertCSS:', results); });
	      }
	  });
      }

      /*
      ** @Private - Parse generator.xml Document
      */
      function parse(xml)
      {
         let promise = new Promise((resolve, reject) =>
         {
            chrome.browserAction.setIcon({path:"/img/iconBlue.png"});
            if (exPrefs.debug) console.log("Parse", xml)
            try {
               if ((xml) && xml !== 'undefined' && xml !== null) {
                   if (xml.documentElement.hasChildNodes()) {

                     for (var tag in gameUser)
                     {
                        var dataFunc = '__gameUser_' + tag;
                        var tree = xml.getElementsByTagName(tag);
                        var node;

                        if ((typeof tree === "undefined") || tree.length == 0) {
                           switch(tag) {
                              case 'site':
                                 __public.daUser.site = __public.site;
                                 break;
                              case 'lang':
                                 __public.daUser.lang = __public.lang;
                                 break;
                              default:
                                 if (exPrefs.debug) console.log(tag, "Tag Not Found");
                                 __public.daUser[tag] = null;
                                 break;
                           }
                           continue;
                        }

                        if (tree.length == 1) {
                           node = tree[0];
                           if (typeof node === "undefined")
                              continue;

                           if (node.childNodes.length > 1) {
                              if (typeof handlers[dataFunc] === "function") {
                                 try {
                                    __public.daUser[tag] = handlers[dataFunc].call(this, tag, node);
                                 } catch(e) {
                                    throw Error(dataFunc + '() ' + e.message);
                                 }
                              }else {
                                 __public.daUser[tag] = XML2jsobj(node);
                                 if (__public.daUser[tag].hasOwnProperty('item'))
                                    __public.daUser[tag] = __public.daUser[tag].item;
                              }
                           }else {
                              if (typeof handlers[dataFunc] === "function") {
                                 try {
                                    __public.daUser[tag] = handlers[dataFunc].call(this, tag, node);
                                 } catch(e) {
                                    throw Error(dataFunc + '() ' + e.message);
                                 }
                              }else
                                 __public.daUser[tag] = node.textContent;
                           }
                        }else {
                           __public.daUser[tag] = null;

                           for (var n = 0; n < tree.length; n++) {
                              if ((tree[n].parentNode === null) || tree[n].parentNode.nodeName != 'xml')
                                 continue;

                              if (tree[n].childElementCount != 0) {
                                 node = XML2jsobj(tree[n]);
                              }else
                                 node = tree[n].textContent;

                              if (typeof handlers[dataFunc] === "function") {
                                 try {
                                    handlers[dataFunc].call(this, tag, node);
                                 } catch(e) {
                                    throw Error(dataFunc + '() ' + e.message);
                                 }
                              }else if (__public.daUser[tag] !== null) {
                                 if (__public.daUser[tag].constructor != Array)
               				         __public.daUser[tag] = [__public.daUser[tag]];
                                 __public.daUser[tag].push(node);
                              }else
                                 __public.daUser[tag] = node;
                           }
                        }
                     }

                     if (__public.daUser.result != 'ERROR') {
                        // Basic sanity check on the data
                        if ((__public.daUser.cdn_root !== null
                        && __public.daUser.neighbours !== null)
                        ) // Then OK
                           __public.daUser.result = 'OK';
                        else
                           throw Error(__public.i18n("gameBadData"));
                     }

                     chrome.storage.local.remove('daUser');
                     resolve({ daUser: __public.daUser });
                     return;
                   }
               }

               throw Error(__public.i18n("gameBadData"));
            }catch(error) {
               __public.daUser.result = 'ERROR';
               __public.daUser.desc = error.message;
               reject(error);
            }
         });
         return promise;
      }

      /*
      ** @Private - Parse Game User Backpack
      */
      handlers['__gameUser_tokens'] = __itemQtys;
      handlers['__gameUser_materials'] = __itemQtys;
      handlers['__gameUser_stored_windmills'] = __itemQtys;
      handlers['__gameUser_stored_buildings'] = __itemQtys;
      handlers['__gameUser_stored_decorations'] = __itemQtys;
      function __itemQtys(tag, node)
      {
         var data = {};

         node = XML2jsobj(node);
         if ((typeof node === 'object') && node.hasOwnProperty('item')) {
            for (var i = 0; i < node.item.length; i++) {
                  data[node.item[i].def_id] = node.item[i].amount;
            }
         }
         
         return data;
      }

      /*
      ** @Private - Parse Game File Changes
      */
      handlers['__gameUser_file_changes'] = function(tag, node)
      {
         var j = JSON.parse(node.textContent).file_changes;
         var data = {};
         setLangFile();

         for (var f in j) {
            for (var k in gameFiles) {
               if (gameFiles[k] == j[f].file_path) {
                  data[k] = {
                     changed : Date.parse(j[f].file_modified),
                     expires : Date.parse(j[f].expire)
                  };

                  if (exPrefs.debug && 0) {
                     console.log(k, "changed", j[f].file_modified);
                     console.log(k, "expires", j[f].file_expire);
                  }
                  break;
               }
            }
         }
         return data;
      }

      /*
      ** @Private - Parse Game User Gifts
      */
      handlers['__gameUser_un_gifts'] = function(tag, node)
      {
         var data = {};

         node = XML2jsobj(node).item;
         if (node.hasOwnProperty('item')) 
         {
            node = node.item;

            for (var n = 0; n < node.length; n++) {
                  var uid = node[n].sender_id;

                  if (__public.daUser.neighbours.hasOwnProperty(uid)) {
                  if ((exPrefs.trackGift)
                  && __public.daUser.neighbours[uid].lastGift == 0
                  && __public.daUser.neighbours[uid].rec_gift == 0) {
                        if (exPrefs.debug) console.log("Force lastGift", __public.daUser.neighbours[uid]);
                        __public.daUser.neighbours[uid].lastGift = __public.daUser.time;
                  }else {
                        if (exPrefs.debug) console.log("Gift Waiting", __public.daUser.neighbours[uid]);
                  }
                  }else {
                  if (exPrefs.debug) console.log("Unexpected Gift", uid);
                  }

                  data[uid] = {};
                  data[uid].def_id = node[n].def_id;
                  data[uid].gift_id = node[n].gift_id;
            }
         }
      
         return data;
      }

      /*
      ** @Private - Parse Game Users Neighbours
      */
      handlers['__gameUser_neighbours'] = function(tag, node)
      {
         var data = {}, cache = __public.daUser.neighbours;
         if (cache === null || typeof cache !== 'object')
            cache = {};

         node = XML2jsobj(node).item;
         __public.daUser.neighbours = {};
         __public.daUser.newNeighbours = 0;
         __public.daUser.gotNeighbours = 0;
         __public.daUser.oldNeighbours = 0;
         __public.daUser.player = null;
         for (var n = 0; n < node.length; n++) {
            var save = {}, uid = node[n].uid, fid = node[n].fb_id;

            if ((!__public.daUser.player)
            && (__public.player_id == uid
            || (__public.daUser.name == node[n].name
            && __public.daUser.surname == node[n].surname)))
            {
               if(exPrefs.debug) console.log("Found Me", node[n]);
               __public.daUser.player = node[n];
               delete __public.daUser.name;
               delete __public.daUser.surname;
               continue;
            }else if (cache.hasOwnProperty(uid)) {
               __public.daUser.gotNeighbours = __public.daUser.gotNeighbours + 1;
               save = cache[uid];
               delete cache[uid];
               if (save.level != node[n].level) {
                  save.lastLevel = node[n].level;
                  save.timeLevel = __public.daUser.time;
               }
            
               // Recent game outage led to all r_gift fields being zeroed
               // so we will hold a copy of the last good r_gift field
               var rec_gift = node[n].rec_gift = intOrZero(node[n].rec_gift);
               if (rec_gift > save.lastGift)
                  save.lastGift = rec_gift;
            }else {
               __public.daUser.newNeighbours = __public.daUser.newNeighbours + 1;
               save = {
                   timeCreated:  __public.daUser.time,
                   lastGift:     intOrZero(node[n].rec_gift),
                   lastLevel:    node[n].level,
                   timeLevel:  __public.daUser.time
               };
            }

            data[uid] = Object.assign(save, node[n]);
            data[uid].timeUpdated = __public.daUser.time;
	    data[uid].neighbourIndex = n;
         }

         // Find any old Neighbours
         for (var n in cache) {
            __public.daUser.oldNeighbours = __public.daUser.oldNeighbours + 1;
         }
         // We will expose any old neighbours for the GUI, but not save/cache them
         // Once they are gone, they are gone, othrweise we keep building up storage
         // space. Myabe look at this again in the future - TODO
         //
         __public.daOldNeighbours = cache;
         if (exPrefs.debug) console.log("Old Neighbours!", __public.daUser.oldNeighbours, cache);

         return data;
      }

      function intOrZero(value)
      {
         value = parseInt(value);
         if (isNaN(value))
            return 0;
         return value;
      }

      /*
      ** @Private - Parse Game User Events
      */
      handlers['__gameUser_events'] = function(tag, event)
      {
         var data = {};

         if (__public.daUser[tag] === null)
            __public.daUser[tag] = new Object();
         event = event.event;
         var eid = event.def_id;
         delete event['def_id'];
         __public.daUser[tag][eid] = event;
         // No return value
      }

      /*
      ** @Private - Parse Game Users Location Progress
      */
      handlers['__gameUser_loc_prog'] = function(tag, node)
      {
         if (__public.daUser[tag] === null)
            __public.daUser[tag] = new Object();
         __public.daUser[tag][node.id] = node;
         // No return value
      }

      /*********************************************************************
      ** Game Files
      */
      var gameFiles = {
         daConfig    :   "xml/configs.xml",
         daRegion1   :   "xml/locations/locations_1.xml",
         daRegion2   :   "xml/locations/locations_2.xml",
         daRegion3   :   "xml/locations/locations_3.xml",
         daRegion4   :   "xml/locations/locations_4.xml",
         daRegion5   :   "xml/locations/locations_5.xml",
         daRegion0   :   "xml/locations/locations_0.xml",
         daFilters   :   "xml/map_filters.xml",
         daEvents    :   "xml/events.xml",
         daLevels    :   "xml/levelups.xml",
         daMaterials :   "xml/materials.xml",
         daRecipes   :   "xml/recipes.xml",
         //daBuildings :   "xml/buildings.xml"
      };

      function getLangKey()
      {
         var lang = __public.daUser.lang;
         if (!lang)
            lang = __public.daUser.lang = exPrefs.gameLang;
         return 'daLang_' + lang.toUpperCase();
      }

      function setLangFile()
      {
         // Make sure we only have one lang file
         for (var key in gameFiles) {
            if (key.indexOf("daLang") == 0)
               delete gameFiles[key];
         }

         // Set Locale file for daUser.lang
         var lang = __public.daUser.lang;
         var langKey = null;
         var langURL = "localization/XML/$LANG$/localization.xml";
         //var langURL = "localization/CSV/$LANG$/localization.csv";

         if (!lang)
            lang = __public.daUser.lang = exPrefs.gameLang;
         langKey = 'daLang_' + lang.toUpperCase();
         gameFiles[langKey] = langURL.replace(/\$LANG\$/g, lang);
      }

      function loadGameFiles()
      {
         let promise = new Promise((resolve, reject) =>
         {
            if (__public.daUser.result == 'CACHED')
               setLangFile();

            chrome.storage.promise.local.get({ daFiles: {}})
            .then(function(lastSaved) {
               return Promise.all(
                  Object.keys(gameFiles).map(function(key) {
                     var root = ((0) ? __public.daUser.static_root : __public.daUser.cdn_root);
                     var fileTimes = __public.daUser.file_changes;
                     var thisChanged = 0, thisExpires = 0;

                     if ((fileTimes) && fileTimes.hasOwnProperty(key)) {
                        thisChanged = fileTimes[key].changed;
                        thisExpires = fileTimes[key].expires;
                     }else
                        thisChanged = 1;

                     return loadFile(root, key, lastSaved.daFiles[key], thisChanged, thisExpires);
                  })
               );
            })
            .then(function(files) {
               // Iterate through and save to main object
               // Also build list of cache times and save
               //
               var cacheTimes = { daFiles: {}};
               var changed = false;

               files.forEach(function(file) {
                  cacheTimes.daFiles[file.key] = file.time;
                  if (file.changed)
                     changed = true;
                  Object.defineProperty(__public, file.key, {
                     value: file.data,
                     writable: false,
                     configurable: true
                  });
               });

               // We had some changes so re-build indexes
               if (exPrefs.debug )console.log("File Changes", changed);
               if (changed) {
                  // TODO
               }

               Object.defineProperty(__public, 'daFiles', {
                  value: cacheTimes.daFiles,
                  writable: false,
                  configurable: true
               });

               return cacheTimes;
            })
            .then(chrome.storage.promise.local.set)
            .then(function() {
               resolve(true);
            }).catch(function(error) {
               reject(error);
            });
         });

         return promise;
      }

      function loadFile(root, key, lastChanged, thisChanged, thisExpires)
      {
         let promise = new Promise((resolve, reject) =>
         {
            // Check the timings to see if we get from web or load from cache
            // Need to do more to figure out the mecahnics, but this for now
            // will ensure we try and keep upto date without hitting PF
            // servers every time. Really do not want to upset them!
            //
            var webGet = false;
            if (typeof lastChanged === 'undefined') lastChanged = 1;
            if (typeof thisChanged === 'undefined') thisChanged = lastChanged;

            if ((!exPrefs.cacheFiles) || thisChanged != lastChanged)
               webGet = true;

            // Load from cache?
            if (!webGet) {
               chrome.storage.promise.local.get(key)
               .then(function(loaded) {
                  if ((loaded) && loaded.hasOwnProperty(key)) {
                     if (exPrefs.debug) console.log(key, 'Cache Hit', loaded);
                     resolve({key: key, changed: false, time: lastChanged, data: loaded[key]});
                  }else
                     throw Error("Cache Miss");
               })
               .catch(function(error) {
                  if (exPrefs.debug) console.log(key, error.message);
                  getFile(root, key, lastChanged, thisChanged)
                  .then(resolve)
                  .catch(function(error) {
                     // Throw or Resolve? - Resolve for now, empty data set
                     resolve({key: key, changed: true, time: 0, data: null});
                  });
               });
            }else {
               if (exPrefs.debug && exPrefs.cacheFiles) console.log(key, 'Cache Stale (this/last)', thisChanged, lastChanged);
               getFile(root, key, lastChanged, thisChanged)
               .then(resolve)
               .catch(function(error) {
                  // Throw or Resolve? - Resolve for now, empty data set
                  resolve({key: key, changed: true, time: 0, data: null});
               });
            }
         });
         return promise;
      }

      function getFile(root, key, lastChanged, thisChanged)
      {
         //console.log(key, lastChanged, thisChanged, root);
         let promise = new Promise((resolve, reject) =>
         {
            var url = root + gameFiles[key] + '?ver=' + thisChanged;

            // Go get it
            http.get.xml(url).then(function(xml) {
               // Extra, Extra! Read All About It! :-)
               callback.call(this, 'dataParsing', 'gameParsing', url);

               // Parse the files XML
               var i, data = null;
               var dataFunc = '__gameFile_';

               if ((i = key.indexOf('_')) !== -1) {
                  dataFunc += key.substring(0, i);
               }else
                  dataFunc += key;

               if (typeof handlers[dataFunc] === "function") {
                  try {
                     data = handlers[dataFunc].call(this, key, xml);
                  } catch(e) {
                     throw Error(dataFunc + '() ' + e.message);
                  }
               }else if (typeof xml === 'object'){
                   data = XML2jsobj(xml.firstElementChild);
                   xml = null;
                   var k = Object.keys(data);
                   if ((k.length == 1) && typeof data[k[0]] === 'object')
                     data = data[k[0]];
               }

               // Cache the file data
               var cache = {};
               cache[key] = data;
               if (exPrefs.cacheFiles) {
                  chrome.storage.promise.local.set(cache).then(function() {
                     cache = null;
                     resolve({key: key, changed: true, time: thisChanged, data: data});
                  });
               }else
                  resolve({key: key, changed: true, time: thisChanged, data: data});
            }).catch(function(error) {
               console.error('getFile()', error.message, url);
               reject('getFile() ' + error.message + ' ' + url);
            });
         });
         return promise;
      }

      /*
      ** Extract Current Game Config
      */
      handlers['__gameFile_daConfig'] = function(key, xml)
      {
         var data = XML2jsobj(xml).configs;
         xml = null;

         if (data.hasOwnProperty('config')) {
            var id = 1;
            if (typeof __public.daUser === 'object') {
               if (__public.daUser.hasOwnProperty('config_id'))
                  id = __public.daUser.config_id;
            }
            for (var c in data.config) {
               if (data.config[c].def_id == id) {
                  data = data.config[c];
                  break;
               }
            }

            return data;
         }

         return {};
      }

      /*
      ** Extract Game Buildings - TODO
      */
      //handlers['__gameFile_daBuildings'] = function(key, xml)
      //{
      //}

      /*
      ** Extract Game Location Information
      */
      handlers['__gameFile_daRegion5'] = function(key, xml) { return __gameFile_daRegion(key, xml); }
      handlers['__gameFile_daRegion4'] = function(key, xml) { return __gameFile_daRegion(key, xml); }
      handlers['__gameFile_daRegion3'] = function(key, xml) { return __gameFile_daRegion(key, xml); }
      handlers['__gameFile_daRegion2'] = function(key, xml) { return __gameFile_daRegion(key, xml); }
      handlers['__gameFile_daRegion1'] = function(key, xml) { return __gameFile_daRegion(key, xml); }
      handlers['__gameFile_daRegion0'] = function(key, xml) { return __gameFile_daRegion(key, xml); }
      function __gameFile_daRegion(key, xml)
      {
         var loc = XML2jsobj(xml.firstElementChild).location;
         var data = {};

         xml = null;
         for (var l in loc) {
            var keys = [
               'name_loc',
               'def_id',
               'event_id',
               'region_id',
               'order_id',
               'filter',
               'floors',
               'progress',
               'reward_xp',
               'test',
               'name'
            ];

            if (!loc[l].hasOwnProperty('def_id'))
              continue;

            // Hmmm, if its a test location lets skip it. ;-)
            if ((loc[l].hasOwnProperty('test')) && loc[l].test) {
              if (localStorage.installType != 'development')
                 continue;
            }

             // Go save what fields we want to keep handy!
            var id = loc[l].def_id;

            data[id] = loc[l]; // have everything for now

            /**
            data[id] = {};
            for (p in keys) {
              if (!loc[l].hasOwnProperty(keys[p]))
                 continue;
                 data[id][keys[p]] = loc[l][keys[p]];
            }
            **/
         }

         loc = null;
         return data;
      }

      /*
      ** Extract Game Level Ups
      */
      handlers['__gameFile_daLevels'] = function(key, xml)
      {
         var want = [
            'xp',
            'fb_points'
         ];
         var items = xml.getElementsByTagName('levelup');
         var data = {};

         for (var i = 0; i < items.length; i++) {
            var id = items[i].attributes.id.textContent;
            var item = XML2jsobj(items[i]);
            data[id] = { level: id};
            for (var k in item) {
               if (k == 'reward') {
                  var o = item[k].object;
                  if (!Array.isArray(o))
                     o = [o];
                  o.forEach(function(v, i, a) {
                     if (v.type == 'system')
                        data[id]['boost'] = v.amount;
                  });
               }else if (want.indexOf(k) !== -1)
                  data[id][k] = item[k];
            }
         }
         return data;
      }

      /*
      ** Extract Game Map Filters
      */
      handlers['__gameFile_daFilters'] = function(key, xml)
      {
         var want = [
            //'name',
            'name_loc',
            'def_id',
            'order_id',
            'event_id',
            'region_id',
            'filter',
            'test'
         ];
         var items = xml.getElementsByTagName('map_filter');
         var data = {};

         for (var i = 0; i < items.length; i++) {
            var id = items[i].attributes.id.textContent;
            var item = XML2jsobj(items[i]);

            // Hmmm, if its a test event lets skip it. ;-)
            if (item.hasOwnProperty('test')) {
              if (localStorage.installType != 'development')
                 continue;
            }

            data[id] = {};
            for (var k in item) {
               if (want.indexOf(k) !== -1)
                  data[id][k] = item[k];
            }
         }
         return data;
      }

      /*
      ** Extract Game Materials
      */
      handlers['__gameFile_daMaterials'] = function(key, xml)
      {
         var want = [
            'name_loc',
            'desc',
            'def_id',
            'order_id',
         ];
         var items = xml.getElementsByTagName('material');
         var data = {};

         for (var i = 0; i < items.length; i++) {
            var id = items[i].attributes.id.textContent;
            var item = XML2jsobj(items[i]);
            data[id] = {};
            for (var k in item) {
               if (want.indexOf(k) !== -1)
                  data[id][k] = item[k];
            }
         }
         return data;
      }

      /*
      ** Extract Game Events
      */
      handlers['__gameFile_daEvents'] = function(key, xml)
      {
         var want = [
            'name',
            'name_loc',
            'desc',
            'def_id',
            'order_id',
            'start',
            'sleep',
            'end',
            'level',
            'loot',
            'premium',
            'achievements',
            'collections',
            'usables',
         ];
         var items = xml.getElementsByTagName('event');
         var data = {};

         for (var i = 0; i < items.length; i++) {
            var id = items[i].attributes.id.textContent;
            var item = XML2jsobj(items[i]);
            data[id] = {};
            for (var k in item) {
               switch(k) {
                  case 'reward':
                     var rewards = {}, o = item[k].object;
                     if (!Array.isArray(o))
                        o = [o];
                     o.forEach(function(v, i, a) {
                        var oid = v.object_id;
                        delete v['object_id'];
                        rewards[oid] = v;
                     });
                     data[id][k] = rewards;
                     break;
                  case 'tokens':
                  case 'locations':
                  case 'extended_locations':
                     if (typeof item[k] === 'string')
                        data[id][k] = item[k].split(',');
                     break;
                  default:
                     if (want.indexOf(k) !== -1)
                        data[id][k] = item[k];
                     break;
               }
            }
         }
         return data;
      }

      /*
      ** Extract Game Recipes
      */
      handlers['__gameFile_daRecipes'] = function(key, xml)
      {
         var items = xml.getElementsByTagName('recipe');
         var data = {};
         for (var i = 0; i < items.length; i++) {
            var id = items[i].attributes.id.textContent;
            data[id] = XML2jsobj(items[i]);
         }
         return data;
      }

      /*
      ** Extract Game Localization Strings
      */
      handlers['__gameFile_daLang'] = function(key, xml)
      {
         var want = [
            'ABNA','ACNA','BUNA','CAOV','DENA','EVN', 'GIP', 'JOST',
            'LONA','MANA','MAP', 'NPCN','QINA','TRNA','USNA','WINA',
            //'MOB'
         ];
         var data = {};

         // XML Format
         if (typeof xml !== 'string') {
            var items = xml.getElementsByTagName('item');
            for (var i = 0; i < items.length; i++) {
               if (items[i].attributes.length != 1)
                  continue;
               var id = items[i].attributes.index.textContent;
               var c = id.substr(0, id.substring(0).search(/[^A-Za-z]/));
               if (want.indexOf(c) !== -1)
                  data[id] = items[i].textContent.replace('@@@', ' ');
            }
            items = xml = null;
            return data;
         }

         // CSV format?
         xml = xml.split(/[\n\u0085\u2028\u2029]|\r\n?/g);
         xml.forEach(function(v, i, a) {
            var s = v.indexOf('*#*');
            var n = v.substr(0, s);
            var c = n.substr(0, v.substring(0).search(/[^A-Za-z]/));

            if (want.indexOf(c) !== -1)
               data[n] = v.substr(s + 3);
         });

         return data;
      }

      /*********************************************************************
      ** @Public Methods (and propertys)
      */
      return __public.init(this);
   };

   /*
   ** Attach to global namespace
   */
   window.gameDiggy = gameDiggy;
})();
/*
** END
*******************************************************************************/
