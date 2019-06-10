const express = require('express')
const app = express()
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 8080;

var	_static = require('node-static'); // for serving files

// This will make all the files in the current folder
// accessible from the web
var fileServer = new _static.Server('./');
app.use(express.static('public'));
//
// // If the URL of the socket server is opened in a browser
// function handler (request, response) {
//
// 	request.addListener('end', function () {
//         fileServer.serve(request, response);
//     });
// }

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// Listen for incoming connections from clients
io.sockets.on('connection', function (socket) {

	// Start listening for mouse move events
	socket.on('mousemove', function (data) {

		// This line sends the event (broadcasts it)
		// to everyone except the originating client.
		socket.broadcast.emit('moving', data);
	});
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
