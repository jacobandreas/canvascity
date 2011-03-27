
/* socket setup ---------- */

var dispatcher = createDispatcher();

dispatcher.register('draw', function(m) { draw(m.data); });
dispatcher.register('verify-email-response', function(m) {
    verifyEmailResponse(m.data); 
});
dispatcher.register('register-failed', function(m) { registerFailed(m.data); });
dispatcher.register('register-succeeded', function(m) { registerSucceeded(m.data); });
dispatcher.register('login-failed', function(m) { loginFailed(m.data); });
dispatcher.register('login-succeeded', function(m) { loginSucceeded(m.data); });

var socket = new io.Socket('localhost', {'port' : 8000});
socket.on('message', function(message) { dispatcher.dispatch(message); });
socket.connect();

/* general setup --------- */

var cX, cY;
var g; 

var statusTimeout;

$(document).ready(function() {
    cX = $('#canvas').offset().left;
    cY = $('#canvas').offset().top;
    g = $('#canvas canvas')[0].getContext('2d');
    $('#canvas').mousedown(sendCoords);
    $('#email').keyup(checkEmail);
    $('#register').click(register);
    $('#login').click(login);
});

$(window).resize(function() {
    cX = $('#canvas').offset().left;
    cY = $('#canvas').offset().top;
});

/* form setup ----------- */

function checkEmail() {
    socket.send({'type' : 'verify-email', 'data' : $('#email').val()});
}

function verifyEmailResponse(data) {
    if(data == 'new') {
        flashStatus("That email address is not in use.");
        $('#register').show();
        $('#login').hide();
    } else {
        flashStatus("Found email address in our database.");
        $('#login').show();
        $('#register').hide();
    }
}

function register() {
    socket.send({
        'type' : 'register', 
        'data' : { 
            'email' : $('#email').val(),
            'password' : $('#password').val()
        }
    });
}

function registerFailed(data) {
    flashStatus("Registration failed.");
}

function registerSucceeded(data) {
    login();
    flashStatus("Registration succeeded.");
}

function login() {
    socket.send({
        'type' : 'login',
        'data' : {
            'email' : $('#email').val(),
            'password' : $('#password').val()
        }
    });
}

function loginFailed() {
    flashStatus("Login failed.");
}

function loginSucceeded(data) {
    flashStatus("Login succeeded.");
    $('#logout').show();
    $('#login').hide();
    $('#register').hide();
    $('#password').hide();
    $('#email').hide();
    $('#email-indicator').text($('#email').val());
    $('#email-indicator').show();
}

/* helpers -------------- */

function sendCoords(evt) {
    x = evt.pageX - cX - 2;
    y = evt.pageY - cY - 13;
    x = Math.floor(x / 8);
    y = Math.floor(y / 8);

    message = {
        'type' : 'draw', 
        'data' : {
            'x' : x, 
            'y' : y
        }
    };

    socket.send(message);

}

function flashStatus(msg) {
    clearTimeout(statusTimeout);
    $('#status').text(msg);
    statusTimeout = setTimeout(function() {
        $('#status').text("");
    }, 3000);
}

/* drawing -------------- */

function draw(data) {
    if(data.color) {
        g.fillStyle = data.color;
    } else {
        g.fillStyle = 'black';
    }
    g.fillRect(data.x * 8, data.y * 8, 8, 8);
}
