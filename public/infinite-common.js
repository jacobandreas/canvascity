this.createDispatcher = function() {

    return new function() {

        this.listeners = {};

        this.register = function(mtype, callback) {
            if(!this.listeners[mtype]) {
                this.listeners[mtype] = [];
            }
            this.listeners[mtype].push(callback);
        }

        this.dispatch = function(message, client) {
            this.listeners[message.type].every(function(callback) {
                callback(message, client);
            });
        }
        
    }

}

this.randomString = function(len) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
