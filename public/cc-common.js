/*
 * CANVAS CITY CLIENT
 * Jacob Andreas
 *
 * This code for Canvas City shared between client and server
 */

/* DISPATCHER *****************************************/
/* (clean event management) */

this.createDispatcher = function() {

    return new function() {

        this.listeners = {};

        // register a callback to receive events of a given type
        this.register = function(mtype, callback) {
            // create a listener list for events of this type, if one doesn't
            // exist
            if(!this.listeners[mtype]) {
                this.listeners[mtype] = [];
            }
            // add the new listener to the list
            this.listeners[mtype].push(callback);
        }

        // send a message to all registered listeners
        this.dispatch = function(message, client) {
            if(!this.listeners[message.type]) {
                return;
            }
            this.listeners[message.type].every(function(callback) {
                callback(message, client);
            });
        }
    }
}

/* CONSTANTS ******************************************/

// how wide (in degrees lat or lng) each cell is
this.MAP_PRECISION = 0.01;

// how many pixels per cell
this.CELL_ROWS = 25;
this.CELL_COLS = 25;

// map boundaries
this.MAP_SOUTH = 40.71;
this.MAP_WEST = -74.03;
this.MAP_NORTH = 40.88;
this.MAP_EAST = -73.91;


/* HELPERS ********************************************/

// gets cell coords associated with any lat/lng
this.round = function(val) {
    prec = this.MAP_PRECISION;
    nval = Math.floor(val / prec) * prec;
    nval = Math.round(nval * 100000) / 100000;
    return nval;
}

// 2D pixel position to 1D cell index
this.toIndex = function(x, y) {
    return x + y * this.CELL_COLS;
}

// dummy methods: if necessary to cut down on bandwidth, these can be fleshed
// out
this.compress = function(data) { return data; }
this.decompress = function(data) { return data; }
