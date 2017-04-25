# Diggy's Adventure Tools

Tools to help with the 
[Diggy's Adventure](https://portal.pixelfederation.com/en/diggysadventure/) game.

* chrome_extension: Google Chrome extension that generates a table of friends
  for tracking non-gifting.  The tool also generates a table of pictures of
  friends with spawned God Children to make it easier to find them.

# TODO

## chrome_extension

* Make GC list horizontally scroll.
* Inject the GC list into the app page.
* Add button to force refreshing
* Do the processing from XML to friends object in the background script and message tabs to refresh.
* Add inputs to let people select the min time since last gift and min gifts/time (once added)
* Track when friends first appeared.
* Track gifts given over time. Either conservatively assuming if we didn't get data that there were gifts, or by ignoring days when user didn't play.
* Update specified facebook lists with diggy friends and with complete friends list without union of some set of lists.

## Camp equipment simulator

* Take the equipment tradeoff [sheet](https://docs.google.com/spreadsheets/d/1Pdx0UYMxA5nSCzcvZmv78OcLwnE46F2K3l-Gdgqt2Bc/edit#gid=1110978116)
  and turn it into a web page that simulates the progression of a camp.  Makes it more accurate and
  makes it more understandable.
