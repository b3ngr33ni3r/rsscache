var Rsscache = require('../index'),
    instance = new Rsscache(),
    uri = "http://www.theverge.com/rss/frontpage";

//take a look at index.js to see Rsscache options.

//add our feed
//note that this is the same as doing
//instance = new Rsscache({feeds:[uri]});
//on construction
instance.addFeed(uri);

//listen for updates constantly
//note that this is async
//todo: make this fire only when a diff doesn't match
//and fire for ALL elements if the diff doesn't match
instance.on('update', function (uri, items) {
    console.log(uri + " updated.");
    for (var i = 0 ; i < items.length; i++) {
        console.log("item[" + i + "] = " + items[i]);
    }
});

instance.on('error', function (err) {
    console.error("oh no! something went wrong: " + err);
});

//force an update
instance.updateFeed(uri, false);

var itemArray = instance.getFeed(uri);
console.log("item[] contains " + itemArray.length + " items");