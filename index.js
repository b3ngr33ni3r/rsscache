var util = require('util'),
    merge = require('merge'),
    request = require('request'),
    FeedParser = require('feedparser'),
    lru = require('lru-cache'),
    EventEmitter = require('events').EventEmitter;

//returns a ctor for RssCache
module.exports = (function () {

    //returns an object : EventEmitter
    //that provides access to cached rss data
    //and emits 'update' events when they get updated
    //you can also '.addFeed(url)' to have it track more feeds
    //options :
    // cacheSize : int
    // refreshRateInMs : int
    //feeds : string[]
    function Rsscache(options) {

        //parse options from the user
        //or use default
        var opts = merge({
            cacheSize: 500,
            feeds: [],
            refreshRateInMs: 10000
        }, options),
            _feeds = [],
            _cache = lru(opts.cacheSize);

        var self = this;

        //add a feed to be tracked and fire off an update
        self.addFeed = function (uri) {
            var fResult = _feeds.push(uri);
            self.updateFeed(uri);
            return fResult;
        };

        //gets a feeds item[] if it's in cache
        //otherwise return an empty array
        self.getFeed = function (uri) {
            if (_cache.has(uri))
                return _cache.get(uri);
            else
                return [];
        };

        //updates a feed, if not in cache (unless ignoreCache == true)
        //returns false if cache entry found
        self.updateFeed = function (uri, ignoreCache) {
            if (typeof (ignoreCache) == "undefined" || !ignoreCache)
                if (_cache.has(uri))
                    return false; //no updating occurred - cache hit

            var req = request(uri),
                feedparser = new FeedParser({ feedurl: uri });

            req.on('error', function (error) {
                self.emit('error', error);
            });
            req.on('response', function (res) {
                var stream = this;

                if (res.statusCode != 200) return self.emit('error', new Error('Bad status code for '+uri));

                stream.pipe(feedparser);
            });


            feedparser.on('error', function (error) {
                self.emit('error', err);
            });
            feedparser.on('readable', function () {
                // This is where the action is!
                var stream = this,
                  meta = this.meta, // **NOTE** the "meta" is always available in the context of the feedparser instance
                  item,
                  items = [];

                while (item = stream.read()) {
                    items.push(item);
                }
                //set the cached instance to the new data
                _cache.set(uri, items);

                //and emit the update for anyone whos listening
                self.emit('update', uri, items);

            });
        };

        //expose our internal cache in case you need it
        self.cache = _cache;

        //expose our internal feeds in case you need it
        self.feeds = _feeds;

        //add and track any opts.feeds
        for (var i = 0 ; i < opts.feeds.length; i++) {
            self.addFeed(opts.feeds[i]);
        }

        
        //set our timeout for updating feeds on schedule [ignoring cache]
        var _timeout = setTimeout(function () {
            for (var i = 0 ; i < _feeds.length; i++) {
                self.updateFeed(_feeds[i], true);
            }
        }, opts.refreshRateInMs);
    };

    //make Rsscache an EventEmitter
    util.inherits(Rsscache, EventEmitter);

    return Rsscache;
})();