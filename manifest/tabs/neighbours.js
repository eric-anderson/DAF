/*
** DA Friends - tab_neighbours.js
*/
var guiTabs = (function(self)
{
   // Define this tab's details
   self.tabs.Neighbours = {
      title:      'Neighbours',
      image:      'neighbours.png',
      order:      1,
      onInit:     null,
      onUpdate:   function(id, reason) {
         console.log(id, reason);
         return true;
      },
   };

	return self;
}(guiTabs || {}));
/*
** End
*******************************************************************************/