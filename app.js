const express = require('express')
const app = express()
var http = require('http').Server(app);
var io = require('socket.io')(http);
var probe = require('probe-image-size');
const { createCanvas, loadImage } = require('canvas')
const fs = require('fs')
var port = process.env.PORT || 8080;
var line_history = [];
var lastSave = 0;
var saveInterval = 3000;
var saveScheduled = false;

var	_static = require('node-static'); // for serving files


var fileServer = new _static.Server('./');
app.use(express.static('public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

saveCanvas();

// Listen for incoming connections from clients
io.origins('*:*');
io.sockets.on('connection', function (socket) {

  console.log("client connected: " + socket.id);

  for (var i in line_history) {
    socket.emit('drawline', { line: line_history[i] } );
  }

  socket.on("pointer", function(data) {
    console.log("client " + socket.id + " is a pointer :)");
  });

  socket.on('drawline', function (data) {
    line_history.push(data.line);
    trySaveCanvas();
    io.emit('drawline', { line: data.line });
  });

  socket.on('clearall', function (data) {
    line_history = [];
    trySaveCanvas();
    io.emit('clearall');
  });
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});

// taking care that canvas gets saved minimally each x milliseconds (x = saveInterval)
function trySaveCanvas() {
  if(saveScheduled) return;
  if(new Date().getTime() - lastSave > saveInterval) {
    saveCanvas();
    lastSave = new Date().getTime();
  } else {
    if(!saveScheduled) {
      saveScheduled = true;
      setTimeout(scheduledSaveCanvas, 500);
    }
  }
}

function scheduledSaveCanvas() {
  saveScheduled = false;
  trySaveCanvas();
}

function saveCanvas() {
  var data = probe.sync(fs.readFileSync(__dirname + '/public/img/segmentationinput.png'));
  var w = data.width;
  var h = data.height;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  //background
  ctx.fillStyle = 'black';
  ctx.fillRect(0,0,w,h);
  for (var i in line_history) {
    drawLine(ctx, line_history[i]);
  }
  const out = fs.createWriteStream(__dirname + '/public/img/labeling.png');
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on('finish', () =>  console.log('saved /public/img/labeling.png'));
}

function drawLine(context, line) {
  context.beginPath();
  context.strokeStyle = line.strokeStyle;
  context.lineWidth = line.lineWidth;
  context.moveTo(line.p1[0], line.p1[1]);
  context.lineTo(line.p2[0], line.p2[1]);
  context.stroke();
}
