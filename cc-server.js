/*
 * CANVAS CITY SERVER
 * Jacob Andreas
 *
 * The main node.js server for Canvas City.
 */

/* IMPORTS ********************************************/

/* standard libraries */
var sys = require('sys'),
    io = require('socket.io'),
    redis = require('redis').createClient(),
    express = require('express');

/* CC common library */
var cc = require(__dirname + '/public/cc-common.js');


/* EXPRESS SERVER *************************************/

var app = express.createServer();
app.configure(function() {
    // serve files in /public statically
    app.use(express.static(__dirname + "/public"));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});
app.listen(8000, cc.HOSTNAME);

/* SOCKET.IO SERVER ***********************************/

var io = io.listen(app);
io.on('connection', function(c) {
    c.on('message', function(m) { dispatcher.dispatch(m, c); });
    c.on('disconnect', function() { unregisterClient(c); });
});


/* EVENT DISPATCHER ***********************************/

var dispatcher = cc.createDispatcher();
dispatcher.register('moved', moveClient);
dispatcher.register('draw', paint);
dispatcher.register('clear', paint);


/* EVENT DELEGATES ************************************/

// when a client disconnects, remove them from their current map cell
function unregisterClient(c) {
    var clientKey = makeClientKey(c);
    return redis.get(clientKey, function(err, cellKey) {
        redis.srem(makeCellClientsKey(cellKey), c.sessionId);
        redis.del(clientKey);
    });
}

// move a client to the correct map cell
function moveClient(m, c) {

    var clientKey = makeClientKey(c);

    // get the client's old cell
    return redis.get(clientKey, function(err, cellKey) {

        // get the client's new cell
        var newCellKey = makeCellKey(m.data.cLat, m.data.cLng);

        // check if the client is trying to move to a valid cell
        return redis.exists(newCellKey, function(err, key) {

            // if it isn't, send an error message and give up
            if(!key) {
                c.send({'type' : 'invalid-cell'})
                return;
            }

            // only make a change if the new cell is different
            if(newCellKey != cellKey) {

                // if the client is known, remove it from its current cell
                // (cellKey will be null for new clients)
                if(cellKey) {
                    redis.srem(makeCellClientsKey(cellKey), c.sessionId);
                }

                // associate the client with its new cell
                redis.set(clientKey, newCellKey);
                redis.sadd(makeCellClientsKey(newCellKey), c.sessionId);

                // send the contents of this cell to the client
                return redis.lrange(newCellKey, 0, -1, function(err, data) {
                    c.send({'type' : 'load', 'data' : cc.compress(data)});
                });
            }

        });
    });
}

function paint(m, c) {

    // get the (1D) index being drawn to
    var index = cc.toIndex(m.data.x, m.data.y);

    // if it's invalid, give up
    if(index < 0 || index >= cc.CELL_ROWS * cc.CELL_COLS) {
        return;
    }

    clientKey = makeClientKey(c);

    // get the client's current cell
    return redis.get(clientKey, function(err, cellKey) {

        // if this client isn't yet registered, give up
        if(!cellKey) {
            return;
        }

        // toggle the appropriate pixel in this cell
        redis.lset(cellKey, index, m.type == 'draw' ? 1 : 0);

        // push the change out to all the clients in this cell
        return redis.smembers(makeCellClientsKey(cellKey), function(err, clients) {

            return clients.forEach(function(client) {

                // except for the client who drew the pixel in the first place
                if(client != c.sessionId) {
                    return io.clients[client].send(m);
                }
            });
        });
    });

}

/* HELPER METHODS *************************************/

// create a redis key for a cell
function makeCellKey(lat, lng) {
    return 'cell:' + lat + ':' + lng;
}

// create a redis key for a socket.io client
function makeClientKey(client) {
    return 'client:' + client.sessionId;
}

// create a redis key for all the clients in a given cell
function makeCellClientsKey(cellKey) {
    return cellKey + ':clients';
}
