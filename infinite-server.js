/* imports ----------- */

var sys = require('sys'),
    http = require('http'),
    fs = require('fs'),
    url = require('url'),
    io = require('socket.io'),
    redis = require('redis').createClient(),
    express = require('express');

var infinite = require(__dirname + '/public/infinite-common.js');

/* constants --------- */

var SALT = "grauchomarx";


/* application ------- */

var app = express.createServer();
app.configure(function() {
    app.use(express.static(__dirname + "/public"));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});
app.listen(8000);


/* dispatcher -------- */

dispatcher = infinite.createDispatcher();

dispatcher.register('draw', function(m, c) { 
    client_key = "client:" + c.sessionId;
    return redis.get(client_key, function(err, reply) {
        if(reply) {
            m.data.color = 'red';
        }
        return io.broadcast(m); 
    });
});

dispatcher.register('verify-email', function(m, c) {
    return redis.get(m.data, function(err, reply) {
        s = reply ? 'old' : 'new';
        c.send({'type' : 'verify-email-response', 'data' : s});
    });
}); 

dispatcher.register('register', function(m, c) {
    email = m.data.email;
    password = m.data.password;
    return redis.get(email, function(err, reply) {
        if(reply) {
            return c.send({'type' : 'register-failed'});
        }
        // TODO hash for real
        hash = SALT + password;
        redis.set(email, hash);
        return c.send({'type' : 'register-succeeded'});
    });
});

dispatcher.register('login', function(m, c) {
    email = m.data.email;
    password = m.data.password;
    return redis.get(email, function(err, reply) {
        // TODO hash for real
        hash = SALT + password;
        if(reply != hash) {
            return c.send({'type' : 'login-failed'});
        }
        client_key = "client:" + c.sessionId;
        redis.set(client_key, email);
        return c.send({'type' : 'login-succeeded'});
    });
});

/* socket server ----- */

var io = io.listen(app);
io.on('connection', function(c) {
    c.on('message', function(m) { dispatcher.dispatch(m, c); });
});
