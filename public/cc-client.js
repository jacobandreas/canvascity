/*
 * CANVAS CITY CLIENT
 * Jacob Andreas
 *
 * The browser client for Canvas City.
 */

/* SOCKET.IO SETUP ************************************/

var socket = new io.Socket('localhost', {'port' : 8000});
socket.on('message', function(message) { dispatcher.dispatch(message); });


/* DISPATCHER SETUP ***********************************/

var dispatcher = createDispatcher();

dispatcher.register('draw', function(m) { draw(m.data); });
dispatcher.register('clear', function(m) { clear(m.data); });
dispatcher.register('load', function(m) { load(m.data); });


/* GENERAL ENVIRONMENT CONFIG *************************/

var CELL_WIDTH = 480 / CELL_COLS;
var CELL_HEIGHT = 480 / CELL_ROWS;

var cX, cY;
var g; 
var cLat, cLng;

var statusTimeout;
var drawMode = true;


/* EVENT SETUP ****************************************/

$(document).ready(function() {

    // connect to socket.io server
    socket.connect();

    // listen for position changes
    navigator.geolocation.watchPosition(positionChanged);

    // get canvas offset
    cX = $('#wrapper').offset().left;
    cY = $('#wrapper').offset().top;

    // get graphics context
    g = $('canvas')[0].getContext('2d');

    // listen for click & drag events
    $('canvas').mousedown(trackDrawing);
    $('#drawbutton').click(function() { 
        drawMode = true; 
        $('#drawbutton').addClass('pressed');
        $('#clearbutton').removeClass('pressed');
    });

    // listen for button presses
    $('#clearbutton').click(function() { 
        drawMode = false; 
        $('#drawbutton').removeClass('pressed');
        $('#clearbutton').addClass('pressed');
    });

});

// listen for window resizes
$(window).resize(function() {
    cX = $('#wrapper').offset().left;
    cY = $('#wrapper').offset().top;
});


/* GEOLOCATION EVENT DELEGATES ************************/

function positionChanged(pos) {

    // get new cell coordinates
    ncLat = round(pos.coords.latitude);
    ncLng = round(pos.coords.longitude);

    // if we've changed cells
    if(ncLat != cLat || ncLng != cLng) {

        // update current cell coordinates
        cLat = ncLat;
        cLng = ncLng;

        // get a new map background from Google
        url = "http://maps.google.com/maps/api/staticmap";
        url += "?center=" + (cLat + MAP_PRECISION / 2) + "," + (cLng + MAP_PRECISION / 2);
        url += "&sensor=true";
        url += "&zoom=16";
        url += "&size=480x480";
        url += "&maptype=satellite";
        url += "&markers=color:blue";
        //url += "|" + pos.coords.latitude + "," + pos.coords.longitude;
        //url += "|" + cLat + "," + cLng;

        $('#map').attr("src", url);

        // send a moved event to the server
        socket.send({
            'type' : 'moved', 
            'data' : {
                'cLat' : cLat, 
                'cLng' : cLng
            }
        });

    }

}


/* JQUERY EVENT DELEGATES *****************************/

function trackDrawing(evt) {
    // listen for mousemotion
    $('canvas').bind('mousemove', sendCoords);
    sendCoords(evt);
    // until the user stops dragging
    $('body').mouseup(function() {
        $('canvas').unbind('mousemove');
    });

}

function sendCoords(evt) {

    // get canvas-relative coordinates
    var px = evt.pageX - cX - 0;
    var py = evt.pageY - cY - 5;
    
    // get cell-grid-relative coordinates
    var x = Math.floor(px / CELL_WIDTH);
    var y = Math.floor(py / CELL_HEIGHT);

    // get the current painted state of the chosen pixel
    var isPainted = g.getImageData(px, py, 1, 1).data[3] > 0;

    // if we're not changing the state, do nothing
    if(drawMode && isPainted || !drawMode && !isPainted) {
        return;
    }

    // prepare a message for the server
    message = {
        'data' : {
            'x' : x, 
            'y' : y,
        }
    };

    // make it of the appropriate type
    message.type = drawMode ? 'draw' : 'clear';

    // pass it along
    socket.send(message);

    // draw the pixel locally
    if(drawMode) {
        message.data.color = 'rgba(0,0,100,' + (0.7 + 0.3 * Math.random()) + ')';
        draw(message.data);
    } else {
        clear(message.data);
    }

}

/* drawing -------------- */

function draw(data) {
    // erase whatever was there before (to keep opacity "pure")
    clear(data);
    // color the brush, if appropriate (otherwise make it black)'
    if(data.color) {
        g.fillStyle = data.color;
    } else {
        g.fillStyle = 'rgba(0,0,0,' + (0.7 + 0.3 * Math.random()) + ')';
    }
    // draw on the canvas
    g.fillRect(data.x * CELL_WIDTH, data.y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
}

function clear(data) {
    g.clearRect(data.x * CELL_WIDTH, data.y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
}

function load(data) {
    data = decompress(data);
    for(i = 0; i < data.length; i++) {
        if(data[i] == 1) {
            // convert from 1D to 2D
            draw({'x' : i % CELL_COLS, 'y' : Math.floor(i / CELL_ROWS)});
        } else {
            clear({'x' : i % CELL_COLS, 'y' : Math.floor(i / CELL_ROWS)});
        }
    }
}
