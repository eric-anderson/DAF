/*
** DA Friends - friendship.js
*/
var guiTabs = (function(self)
{
   var tabID;

   /*
   ** @Private - Initialise the tab
   */
   function onInit(id, cel)
   {
      // Do any one time initialisation stuff in here
      tabID = id;
   }

   /*
   ** @Private - Update the tab
   */
   function onUpdate(id, reason)
   {
      // We ignore an activated tab condition.
      if (reason == 'active')
         return true;

      // Called everytime the page is/needs updating
      
      
      return true;
   }

   /*
   ** Define this tab's details
   */
   self.tabs.Friendship = {
      title:      'Friendship',
      image:      'friends.png',
      order:      2,
      html:       true,
      onInit:     onInit,
      onUpdate:   onUpdate
   };

	return self;
}(guiTabs || {}));
/*
** End
*******************************************************************************/