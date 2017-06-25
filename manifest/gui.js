/*
** DA Friends - gui.js
*/
'use strict';
/*
 <div id="tabs" class="c-tabs no-jsx">
        <div class="c-tabs-nav">
          <a id="tabNeighbours" href="#" class="c-tabs-nav__link is-active"><i class="fa"></i>
            <img src="img/neighbours.png"/><span></span>
          </a>
          <a id="tabFriendship" href="#" class="c-tabs-nav__link"><i class="fa"></i>
            <img src="img/friends.png"/><span></span>
          </a>
          <a id="tabCamp" href="#" class="c-tabs-nav__link"><i class="fa"></i>
            <img src="img/camp.png"/><span></span>
          </a>
          <a id="tabCrowns" href="#" class="c-tabs-nav__link"><i class="fa"></i>
            <img src="img/crowns.png"/><span></span>
          </a>
          <a id="tabOptions" href="#" class="c-tabs-nav__link">
            <i class="fa"></i><img src="img/options.png"/><span></span>
          </a>
        </div>
*/

/*
** Master Tab Handler
*/
var guiTabs = (function (self) {

   /*
   ** @Private function
   */
   self.p1 = function()
   {
      console.log("ID", id);
   }

	return self;
}(guiTabs || {}));

/*
** Tab - Options
*/
var guiTabs = (function(self) {
   var id = 'tabOptions';
   self.tabOptions = function()
   {
		// added method...
	};
   self.p1();
	return self;
}(guiTabs || {}));

var guiTabs = (function(self) {
   var id = 'tabNeighbours';
   self.tabNeighbours = function()
   {
		// added method...
	};
   self.p1();
	return self;
}(guiTabs || {}));

console.log(guiTabs);
/*
** END
*******************************************************************************/