/*
** DA Friends - index.js
*/
var bgp = chrome.extension.getBackgroundPage();
var wikiLink = "https://wiki.diggysadventure.com";
var wikiVars = "/index.php?title=";

// Add Property value as a Message Key in _locales/xx/messages.json
// So the user gets a nice description of the theme/alarm sound.
var pageThemes = {
    'default':  'cssDefault',
    'minty':    'cssMinty',
    'rose':     'cssRose'
};

/** Not used yet
var alarmSounds = {
    'rooster':  'sndRooster'
};
**/

/*
** On Page load Handler
*/
document.addEventListener('DOMContentLoaded', function()
{
   guiTheme();
   document.getElementById('tabStatus').style.display = 'none';
   document.getElementsByTagName('html')[0].setAttribute('lang', bgp.exPrefs.gameLang.toLowerCase());
   document.getElementById('extTitle').innerHTML = guiString('extTitle');
   document.getElementById('disclaimer').innerHTML = guiString('disclaimer');
   document.getElementById('gameURL').title = guiString('gameURL');
   document.getElementById('gameURL').addEventListener('click', function(e) {
      e.preventDefault();
      bgp.daGame.reload();
      return false;
   });

   // Add Entry for each tab to be loaded
   //
   // Property value: true for production, false = tab
   // only loaded if running in development environment
   //
   guiTabs.initialise({
      Neighbours: true,
      Crowns:     true,
      Kitchen:    false,
      Camp:       false,
      Events:     true,
      Options:    true     // Last Entry
   }).then(function() {
      //guiTabs.update();
      guiWikiLinks();
      guiText_i18n();
   });

   // Extension message handler
   //
   chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
   {
      var status = "ok", results = null;

      switch(request.cmd) {
         case 'exPrefs':
            if (request.name == 'cssTheme')
               guiTheme(request.changes.newValue);
            if (request.name == 'capCrowns')
               guiTabs.refresh('Crowns')
            if (request.name == 'hidePastEvents')
               guiTabs.refresh('Events')
            break;
         case 'gameLoading':
         case 'dataLoading':
         case 'dataStart':
            guiStatus(request.text, null, 'download');
            break;

         case 'gameMaintenance':
         case 'userMaintenance':
            guiStatus(request.text, 'Warning', 'warning');
            guiTabs.update();
            break;

         case 'dataDone':
            guiStatus();
            guiTabs.update();
            break;

         case 'dataError':
            guiStatus(request.text, 'Error', 'error');
            guiTabs.update();
            break;

         default:
            if (bgp.exPrefs.debug) console.log("chrome.extension.onMessage", request);
            sendResponse({ status: "error", result: `Invalid 'cmd'` });
            break;
      }

      sendResponse({ status: status, result: results });
      return true;    // MUST return true; here!
   });
});

/*
** Master Tab Handler
*/
var guiTabs = (function ()
{
   // @Private
   var tabElement = '#tabs';
   var tabNavigationLinks = '.c-tabs-nav';
   var tabContentWrapper = '.c-tabs-wrapper';
   var tabContentContainers = '.c-tab';
   var tabWrapper;
   var tabOrder = [];
   var locked = false;
   var active;
   var handlers = {};

   // @Public - Tab Array
   self.tabs = {};

   // @Public - Options Tab
   self.tabs.Options = {
      title: 'Options',
      image: 'options.png',
      order: 9999,
      html: true,
      onInit: tabOptionsInit,
      onUpdate: tabOptionsUpdate
   };

   /*
   ** @Public - Initialise Tabs
   */
   self.initialise = function(loadTabs = {})
   {
      return Promise.all(Object.keys(loadTabs).reduce(function(tabs, key) {
         if ((loadTabs[key] === true) || localStorage.installType == 'development') {
            if (key != 'Options') {
               tabs.push(new Promise((resolve, reject) => {
                  var script = document.createElement('script');
                  script.onerror = function () {
                     resolve({key: key, script: false, html: null});
                  };
                  script.onload = function () {
                     resolve(tabHTML(key));
                  };
                  script.type = "text/javascript";
                  script.src = "/manifest/tabs/" + key.toLowerCase() + ".js";
                  document.head.appendChild(script);
                  script = null;
               }));
            }else
               tabs.push(tabHTML(key));
         }
         return tabs;
      }, [])).then(function(loaded) {

         // Sort what we loaded, so we display in a prefered order
         tabOrder = loaded.reduce(function(keep, tab, idx) {
            if (tab.script)
               keep.push(tab.key);
            self.tabs[tab.key].html = tab.html;
            return keep;
         }, []).sort(function(a, b) {
            return self.tabs[a].order > self.tabs[b].order;
         });
         //console.log("tabOrder", tabOrder);

         // Create HTML for each tab entry
         var nav, e = document.querySelector(tabElement);
         if (e) {
            nav = e.querySelectorAll(tabContentWrapper);

            if ((nav) && nav.length == 1) {
               tabWrapper = nav[0];
            }else {
               tabWrapper = document.createElement('div');
               tabWrapper.className = 'c-tabs-wrapper';
               e.appendChild(tabWrapper);
            }

            nav = e.querySelectorAll(tabNavigationLinks);
            if ((nav) && nav.length == 1) {
               tabOrder.forEach(function(tab, idx) {
                  var id = self.tabs[tab].id = ('' + tab);
                  var a = document.createElement('a');
                  var img = document.createElement('img')
                  var span = document.createElement('span')

                  a.id = id;
                  a.className = 'c-tabs-nav__link';
                  a.setAttribute('href', '#');
                  a.addEventListener('click', tabClicked);
                  a.appendChild(img);
                  a.appendChild(span);
                  img.setAttribute('src', '/img/' + self.tabs[tab].image);
                  span.innerHTML = guiString(self.tabs[tab].title);
                  nav[0].appendChild(a);
                  self.tabs[tab].nav = a;

                  var d1 = document.createElement('div');
                  var d2 = document.createElement('div');
                  d1.setAttribute('data-c-tab-id', id);
                  d1.className = 'c-tab';
                  d1.innerHTML = '<br />';
                  d1.appendChild(d2);
                  d2.setAttribute('data-c-tab-id', id);
                  d2.className = 'c-tab-content';
                  tabWrapper.appendChild(d1);
                  self.tabs[tab].container = d1;
                  self.tabs[tab].content = d2;

                  //console.log(tab, "HTML", self.tabs[tab].html);
                  if (typeof self.tabs[tab].html === 'string') {
                     d2.innerHTML = self.tabs[tab].html;
                  }else if ((self.tabs[tab].html !== null) && typeof self.tabs[tab].html === 'object') try {
                     d2.appendChild(self.tabs[tab].html);
                  }catch(e) {}

                  /** Pain!!!
                  Array.prototype.forEach.call(d2.getElementsByTagName('script'), function(script) {
                     var script2 = document.createElement('script');
                     script2.src = script.src;
                     document.head.appendChild(script2);
                     script.remove();
                  });
                  **/

                  // Do any tab specific initialisation
                  if (self.tabs[id].hasOwnProperty('onInit')) {
                     if (typeof self.tabs[id].onInit === 'function')
                        self.tabs[id].onInit(id);
                     delete self.tabs[id].onInit;
                  }
               });

               tabActive(bgp.exPrefs.tabIndex);
            }
         }

         // Were done initialising so leave the building
         delete self.initialise;
      }).catch(function(error) {
         console.error(error);
      });
   }

   /*
   ** @Private fetch Tabs HTML content
   */
   function tabHTML(key)
   {
      if (self.tabs[key].hasOwnProperty('html') === true) {
         if (self.tabs[key].html === true) {
            return http.get.html("/manifest/tabs/" + key.toLowerCase() + ".html")
               .then(function(html) {
                  return {key: key, script: true, html: html};
               }).catch(function(error) {
                  return {key: key, script: true, html: null};
            });
         }else
            return {key: key, script: true, html: self.tabs[key].html};
      }
      return {key: key, script: true, html: null};
   }

   /*
   ** @Public - Update links to open in a new tab
   */
   self.linkTabs = function(parent)
   {
       var links = parent.getElementsByTagName("a");

       for (var i = 0; i < links.length; i++) {
           (function () {
               var ln = links[i];
               var location = ln.href;
               ln.onclick = function () {
                   chrome.tabs.create({active: true, url: location});
                   return false;
               };
           })();
       }
   }

   /*
   ** @Public - Update preference value
   */
   self.setPref = function(name, value)
   {
      save = {};
      save[name] = value;
      chrome.storage.sync.set(save);
   }

   /*
   ** @Public - Hide Tab Content
   */
   self.hideContent = function(state)
   {
      tabWrapper.style.display = (state ? 'none' : 'block');
   }

   /*
   ** @Public - Lock Tabs
   */
   self.lock = function(state)
   {
      locked = (state ? true : false);
   }

   /*
   ** @Public - Update (Active) Tab
   */
   self.update = function()
   {
      tabUpdate(active, 'update');
   }

   /*
   ** @Public - Refresh (Active) Tab
   */
   self.refresh = function(id = active)
   {
      if (id !== null) {
         if (self.tabs.hasOwnProperty(id)) {
            self.tabs[id].time = null;
         }else
            return;
      }else tabSorted.forEach(function(id, idx, ary) {
         self.tabs[id].time = null;
      });
      tabUpdate(id, 'update');
   }

   /*
   ** @Private tabClicked
   */
   function tabClicked(e)
   {
      var id = e.target.id;
      if (!id)
         id = e.target.parentElement.id;
      e.preventDefault();
      if ((!locked) && active != id) {
         id = tabActive(id);
         chrome.storage.sync.set({ tabIndex: id});
      }
   }

   /*
   ** @Private tabActive
   */
   function tabActive(id)
   {
      if (!self.tabs.hasOwnProperty(id))
         id = tabOrder[0];
      if (self.tabs.hasOwnProperty(active)) {
         self.tabs[active].nav.classList.remove('is-active');
         self.tabs[active].container.classList.remove('is-active');
      }
      self.tabs[id].nav.classList.add('is-active');
//    self.tabs[id].container.classList.add('is-active');

      if (active != id) {
         active = id;
         tabUpdate(id, 'active');
      }

      return active;
   }

   /*
   ** @Private tabUpdate
   */
   function tabUpdate(id, reason)
   {
      document.getElementById('subTitle').innerHTML = guiString("subTitle",
        [ localStorage.versionName, bgp.daGame.daUser.site, unixDate(bgp.daGame.daUser.time, true) ]
      );

      if (bgp.exPrefs.debug) console.log(id, reason, self.tabs[id].time, bgp.daGame.daUser.time);
      if (reason == 'active' && self.tabs[id].time != bgp.daGame.daUser.time)
         reason = 'update';

      switch(bgp.daGame.daUser.result) {
         case 'OK':
         case 'CACHED':
            if (reason != 'active')
               guiStatus('dataProcessing', null, 'busy');
            break;
         case 'ERROR':
            guiStatus(guiString('gameError',
               [bgp.daGame.daUser.desc])
               , "Error", 'error'
            );
            self.lock(false);
            if (active == 'Options')
               break;
            return false;
         default:
         case 'EMPTY':
            guiStatus('noGameData', "Warning", 'warning');
            self.lock(false);
            if (active == 'Options')
               break;
            return false;
      }

      let promise = new Promise((resolve, reject) => {
         if ((reason != 'active')
         || self.tabs[id].time != bgp.daGame.daUser.time) {
            if (self.tabs.hasOwnProperty(id)) {
               if (self.tabs[id].hasOwnProperty('onUpdate')) {
                  setTimeout(function() {
                     if (typeof self.tabs[id].onUpdate === 'function') try {
                        resolve(self.tabs[id].onUpdate(id, reason));
                     } catch(e) {
                        console.error(e);
                        guiStatus(guiString('errorException', [e]), "Error", 'error');
                        resolve(false);
                     }
                  }, 0);
               }
            }
         }else {
            if (bgp.exPrefs.debug) console.log(id, "Skipping Update?");
            document.getElementById('tabStatus').style.display = 'none';
            self.hideContent(false);
            setTimeout(function() {
               resolve(true);
            }, 0);
         }
      }).then(function(ok) {
         if (ok) {
            document.getElementById('tabStatus').style.display = 'none';
            if (!self.tabs[id].time)
               guiWikiLinks();
            self.tabs[id].time = bgp.daGame.daUser.time;
            if (id == active)
               self.tabs[id].container.classList.add('is-active');
            self.hideContent(false);
         }
         self.lock(false);
         return ok;
      });

      return promise;
   }

   /*
   ** @Private Initialise the options tab
   */
   function tabOptionsInit(id)
   {
      var form = document.getElementById('optForm');
      var list, forInput, forType, callback, disable;

      document.getElementById('optGeneral').innerHTML = guiString('General');

      list = form.getElementsByTagName("SPAN");
      for (var e = 0; e < list.length; e++) {
          list[e].innerHTML = guiString(list[e].id);
      }

      list = form.getElementsByTagName("LABEL");
      for (var e = 0; e < list.length; e++) {
         list[e].innerHTML = guiString(list[e].id);

         if (!(forInput = list[e].control))
             continue;
         if (!(forType = forInput.getAttribute("TYPE")))
             forType = forInput.nodeName;

         callback = '__' + forInput.id + '_' + forType;
         disable = true;

         if (bgp.exPrefs.hasOwnProperty(forInput.id)) {
             disable = false;
             if (typeof handlers[callback] === "function")
                 disable = handlers[callback].call(this, forInput, list[e]);

             if (!forInput.onchange) {
                 switch (forType.toLowerCase()) {
                     case 'select':
                         forInput.onchange = (e) => {
                           self.setPref(e.target.id, e.target.value);
                         }
                         break;
                     case 'checkbox':
                         forInput.checked = bgp.exPrefs[forInput.id];
                         forInput.onchange = (e) => {
                           self.setPref(e.target.id, e.target.checked);
                         };
                         break;
                     default:
                         disable = true;
                         break;
                 }
             }
         }

         if (!forInput.disabled)
             forInput.disabled = disable;
      }
   }

   /*
   ** @Private Update the options tab
   */
   function tabOptionsUpdate(id, reason)
   {
      return true;
   }

   /*
   ** @Private Handlers
   */
   handlers['__gameSite_SELECT'] = function(p)
   {
      for (key in bgp.gameUrls) {
          var e = document.createElement("option");
          e.text = guiString(key);
          e.value = key;
          p.add(e);
          if (bgp.exPrefs.gameSite == key) {
              p.selectedIndex = p.length - 1;
              document.getElementById('autoPortal').disabled = ((key == 'portal') ? false : true);
          }
      }
      p.onchange = (e) => {
          document.getElementById('autoPortal').disabled = ((e.target.value == 'portal') ? false : true);
          self.setPref(e.target.id, e.target.value);
      }
      return false;   // Not Disabled
   }

   handlers['__cssTheme_SELECT'] = function(p)
   {
      for (key in pageThemes) {
         var e = document.createElement("option");
         e.text = guiString(pageThemes[key]);
         e.value = key;
         p.add(e);
         if (bgp.exPrefs.cssTheme == key)
            p.selectedIndex = p.length - 1;
      }
      return false;   // Not Disabled
   }

   handlers['__gameSync_checkbox'] = (p, l) => { return __devOnly(p, l, false); };
   handlers['__gameDebug_checkbox'] = __devOnly;
   handlers['__cacheFiles_checkbox'] = __devOnly;
   handlers['__debug_checkbox'] = __devOnly;
   function __devOnly(p, l, disable = false)
   {
      if (localStorage.installType != 'development') {
         p.style.display = 'none';
         l.style.display = 'none';
         return !disable;
      }
      return disable;
   }

	return self;
}());

/*
** Set theme
*/
function guiTheme(name = null)
{
   if (name === null)
      name = bgp.exPrefs.cssTheme;
   if (!pageThemes.hasOwnProperty(name))
       name = 'default';

   var filename = "/manifest/css/themes/" + name + ".css";
   var className = 'themeStylesheet';
   var css = document.getElementById(className);

   if (!css) {
      css = document.createElement('link');
      css.id = className;
      css.setAttribute('rel', "stylesheet")
      css.setAttribute('type', "text/css")
      document.getElementsByTagName('head')[0].appendChild(css);
   }

   css.setAttribute('href', filename)

   return name;
}

/*
** Set status message
*/
function guiStatus(text = null, title = null, style = null, hideTabs = true)
{
   if (text !== null)
   {
      if (title == null)
         title = 'pleaseWait';
      guiTabs.lock(true);
      document.getElementById('tabStatus').style.display = 'block';
      if (hideTabs)
         guiTabs.hideContent(true);
      document.getElementById('statusText').innerHTML = guiString(text);
      if (title !== null)
         document.getElementById('statusTitle').innerHTML = guiString(title);
      if (style !== null)
         document.getElementById('statusAlert').className = style;
   }else {
      guiTabs.lock(false);
      guiTabs.hideContent(false);
      document.getElementById('tabStatus').style.display = 'none';
   }
}

/*
** Get a GUI string
*/
function guiString(message, subs = null)
{
   return bgp.daGame.i18n(message, subs);
}

/*
** Set GUI Text
*/
function guiText_i18n(parent = document)
{
    parent.querySelectorAll("[data-i18n-title]").forEach(function (e)
    {
       var string = e.getAttribute('data-i18n-title');
       e.removeAttribute('data-i18n-title');
       e.title = bgp.daGame.i18n(string);
    });
    parent.querySelectorAll("[data-i18n-text]").forEach(function (e)
    {
       var string = e.getAttribute('data-i18n-text');
       e.removeAttribute('data-i18n-text');
       e.innerHTML = bgp.daGame.i18n(string);
    });
    parent.querySelectorAll("[data-game-text]").forEach(function (e)
    {
       var string = e.getAttribute('data-game-text');
       e.removeAttribute('data-game-text');
       e.innerHTML = bgp.daGame.string(string);
    });
}

/*
** Set Wiki Links
*/
function guiWikiLinks()
{
    document.querySelectorAll('[data-wiki-page]').forEach(function (e)
    {
        var title = e.getAttribute('data-wiki-title') || 'clickWiki';
        e.removeAttribute('data-wiki-title');

        e.title = bgp.daGame.i18n(title);
        e.onmouseenter = function(e) {
            e.target.classList.toggle('wiki-hover', true);
            return true;
        };
        e.onmouseleave = function(e) {
            e.target.classList.toggle('wiki-hover', false);
            return true;
        };
        e.onclick = function(e) {
            var wikiPage = e.target.getAttribute('data-wiki-page');
            var wikiUrl;

            if (wikiPage.indexOf('http') == 0) {
                wikiUrl = wikiPage;
            }else
                wikiUrl = bgp.wikiLink + ((wikiPage) ? bgp.wikiVars + wikiPage : '/');

            chrome.tabs.query({}, function(tabs)
            {
                var wUrl = urlObject({'url': bgp.wikiLink});
                var wkTab = 0;

                tabs.forEach(function (tab) {
                   var tUrl = urlObject({'url': tab.url});
                   if ((!wkTab) && (tUrl.host == wUrl.host || tab.url == wikiUrl)) {
                     chrome.windows.update(tab.windowId, {focused: true, drawAttention: true});
                     wkTab = tab.id;
                   }
                });

                if (!wkTab) {
                    var maxWidth = Math.round(((window.screen.availWidth * 72) / 100));
                    var maxHeight = Math.round(((window.screen.availHeight * 80) / 100));
                    var top = Math.round((window.screen.availHeight - maxHeight) / 2);
                    var left = Math.round((window.screen.availWidth - maxWidth) / 2);

                    chrome.windows.create({
                        url: wikiUrl,
                        left: left,
                        top: top,
                        width: maxWidth,
                        height: maxHeight,
                        focused: true,
                        type: 'popup'
                    }, function(w) {
                    });
                }else {
                    chrome.tabs.update(wkTab, {url: wikiUrl, active: true});
                }
            });

            return false;
        };
    });
}
/*
** END
*******************************************************************************/