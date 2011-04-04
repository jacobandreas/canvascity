/*
 * CANVAS CITY SERVER
 * Jacob Andreas
 *
 * Populates a Redis database for use with Canvas City.
 *
 * THIS WILL FLUSH THE DATABASE!
 */

var redis = require('redis').createClient();
var cc = require(__dirname + '/public/cc-common.js');

cells = [];

// create keys for all the map cells in the world
for(lat = cc.MAP_SOUTH; lat <= cc.MAP_NORTH; lat += cc.MAP_PRECISION) {
    for(lng = cc.MAP_WEST; lng < cc.MAP_EAST; lng += cc.MAP_PRECISION) {
        key = 'cell:' + cc.round(lat) + ':' + cc.round(lng);
        cells.push(key);
    }
}

// clear the datastore
redis.flushall();

// create lists of zeroes for every cell in the world
multi = redis.multi();
cells.forEach(function(cell) {
    for(x = 0; x < cc.CELL_COLS; x++) {
        for(y = 0; y < cc.CELL_ROWS; y++) {
            multi.lpush(cell, 0);
        }
    }
});
multi.exec(function() {
    process.exit();
});
