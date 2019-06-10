var moving = true;

$(function(){

	// This demo depends on the canvas element
	if(!('getContext' in document.createElement('canvas'))){
		alert('Sorry, it looks like your browser does not support canvas!');
		return false;
	}

	// The URL of your web server (the port is set in app.js)
	var url = 'http://localhost:8080';

	var doc = $(document),
		win = $(window),
		canvas = $('#paper'),
		ctx = canvas[0].getContext('2d'),
		instructions = $('#instructions');

	fitToContainer(document.querySelector('canvas'));
	registerTouchEvents(document.querySelector('canvas'));

	$("button#fg").click(function(e){
  	e.preventDefault();
		$("button#bg").removeClass("active");
		$(this).addClass("active");
	});

	$("button#bg").click(function(e){
  	e.preventDefault();
		$("button#fg").removeClass("active");
		$(this).addClass("active");
	});

	$("button#move").click(function(e){
  	e.preventDefault();
		$("button#draw").removeClass("active");
		$(this).addClass("active");
		moving = true;
	});
	$("button#draw").click(function(e){
  	e.preventDefault();
		$("button#move").removeClass("active");
		$(this).addClass("active");
		moving = false;
	});

	// Generate an unique ID
	var id = Math.round($.now()*Math.random());

	// A flag for drawing activity
	var drawing = false;

	var clients = {};
	var cursors = {};

	var socket = io.connect(url);

	socket.on('moving', function (data) {

		if(! (data.id in clients)){
			// a new user has come online. create a cursor for them
			cursors[data.id] = $('<div class="cursor">').appendTo('#cursors');
		}

		// Move the mouse pointer
		cursors[data.id].css({
			'left' : data.x,
			'top' : data.y
		});

		// Is the user drawing?
		if(data.drawing && clients[data.id]){

			// Draw a line on the canvas. clients[data.id] holds
			// the previous position of this user's mouse pointer

			drawLine(clients[data.id].x, clients[data.id].y, data.x, data.y);
		}

		// Saving the current client state
		clients[data.id] = data;
		clients[data.id].updated = $.now();

	});

	var prev = {};

	canvas.on('mousedown',function(e){
		e.preventDefault();
		drawing = true;
		prev.x = e.pageX;
		prev.y = e.pageY;

		// Hide the instructions
		instructions.fadeOut();
	});

	canvas.bind('mouseup mouseleave',function(){
		drawing = false;
	});

	var lastEmit = $.now();

	canvas.on('mousemove',function(e){
		if($.now() - lastEmit > 30){
			socket.emit('mousemove',{
				'x': e.pageX,
				'y': e.pageY,
				'drawing': drawing,
				'id': id
			});
			lastEmit = $.now();
		}

		// Draw a line for the current user's movement, as it is
		// not received in the socket.on('moving') event above

		if(drawing){

			drawLine(prev.x, prev.y, e.pageX, e.pageY);

			prev.x = e.pageX;
			prev.y = e.pageY;
		}
	});

	// Remove inactive clients after 10 seconds of inactivity
	setInterval(function(){

		for(ident in clients){
			if($.now() - clients[ident].updated > 10000){

				// Last update was more than 10 seconds ago.
				// This user has probably closed the page

				cursors[ident].remove();
				delete clients[ident];
				delete cursors[ident];
			}
		}

	},10000);

	function drawLine(fromx, fromy, tox, toy){
		if($("button#bg").hasClass("active")) {
			ctx.strokeStyle = "#0076e4";
		} else {
			ctx.strokeStyle = "#00f662";
		}
		ctx.beginPath();
		ctx.moveTo(fromx, fromy);
		ctx.lineTo(tox, toy);
		ctx.stroke();
		ctx.closePath();
	}

});

function fitToContainer(canvas){
	var img = document.getElementById('img');
	var width = img.clientWidth;
	var height = img.clientHeight;
	canvas.style.width=width;
	canvas.style.height=height;
	canvas.width  = width;
	canvas.height = height;
}

function registerTouchEvents(canvas) {
	// Set up touch events for mobile, etc
canvas.addEventListener("touchstart", function (e) {
	if(moving) return;
  mousePos = getTouchPos(canvas, e);
  var touch = e.touches[0];
  var mouseEvent = new MouseEvent("mousedown", {
    clientX: touch.clientX,
    clientY: touch.clientY
  }, { passive: false });
  canvas.dispatchEvent(mouseEvent);
	}, { passive: false });
	canvas.addEventListener("touchend", function (e) {
		if(moving) return;
	  var mouseEvent = new MouseEvent("mouseup", {});
	  canvas.dispatchEvent(mouseEvent);
	}, { passive: false });
	canvas.addEventListener("touchmove", function (e) {
		if(moving) return;
	  var touch = e.touches[0];
	  var mouseEvent = new MouseEvent("mousemove", {
	    clientX: touch.clientX,
	    clientY: touch.clientY
	  });
	  canvas.dispatchEvent(mouseEvent);
	}, { passive: false });
	// Prevent scrolling when touching the canvas
	document.body.addEventListener("touchstart", function (e) {
		if(moving) return;
		if (e.target == canvas) {
	    e.preventDefault();
	  }
	}, { passive: false });
	document.body.addEventListener("touchend", function (e) {
		if(moving) return;
		if (e.target == canvas) {
	    e.preventDefault();
	  }
	}, { passive: false });
	document.body.addEventListener("touchmove", function (e) {
		if(moving) return;
	  if (e.target == canvas) {
	    e.preventDefault();
	  }
	}, { passive: false });
}

// Get the position of a touch relative to the canvas
function getTouchPos(canvasDom, touchEvent) {
  var rect = canvasDom.getBoundingClientRect();
  return {
    x: touchEvent.touches[0].clientX - rect.left,
    y: touchEvent.touches[0].clientY - rect.top
  };
}
