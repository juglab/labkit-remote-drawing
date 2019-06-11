// The URL of your web server (the port is set in app.js)
var url = 'http://localhost:8080/';

var moving = true;
var ctxImg;
var inputImg;
var strokeStyle;
var prev = [0,0];
var lineWidth = 4;
var dCtx;

$(function(){

	if(!('getContext' in document.createElement('canvas'))){
		alert('Sorry, it looks like your browser does not support canvas!');
		return false;
	}

	var socket = io.connect(url);

	const canvas = document.getElementById("paper");

	socket.on('drawline', function (data) {
		var line = data.line;
		dCtx.beginPath();
		dCtx.strokeStyle = line.strokeStyle;
		dCtx.lineWidth = line.lineWidth;
		dCtx.moveTo(line.p1[0], line.p1[1]);
		dCtx.lineTo(line.p2[0], line.p2[1]);
		dCtx.stroke();
		dCtx.closePath();
	});

// the following code is mostly copied from https://stackoverflow.com/a/45122001/5325168

	const U = undefined;
	const doFor = (count, callback) => {var i = 0; while (i < count && callback(i ++) !== true ); };
	const drawModeDelay = 8; // number of frames to delay drawing just incase the pinch touch is
	// slow on the second finger
	const worldPoint = {x : 0, y : 0}; // worldf point is in the coordinates system of the drawing
	const ctx = canvas.getContext("2d");
	var drawMode = false;    // true while drawing
	var pinchMode = false;   // true while pinching
	var startup = true;  // will call init when true

	// the drawing image
	const drawing = document.createElement("canvas");
	const W = drawing.width = imgWidth();
	const H = drawing.height = imgHeight();
	dCtx = drawing.getContext("2d");

	// pointer is the interface to the touch
	const pointer = setupPointingDevice(canvas);
	if(pointer === undefined){
		ctx.font = "16px arial.";
		ctx.fillText("Did not detect pointing device. Use your phone / tablet.", 20,20);
		$("#menu").hide();
		throw new Error("App Error : No touch found");
	} else {
		socket.emit("pointer");
	}

	// drawing functions and data
	const drawnPoints = [];  // array of draw points
	function drawOnDrawing(){  // draw all points on drawingPoint array
		dCtx.strokeStyle = strokeStyle;
		dCtx.lineWidth = lineWidth;
		while(drawnPoints.length > 0){
			point = drawnPoints.shift();
			if(prev[0] == 0) {
				prev[0] = point.x;
				prev[1] = point.y;
				continue;
			} else {
				dCtx.beginPath();
				dCtx.moveTo(prev[0], prev[1]);
				dCtx.lineTo(point.x, point.y);
				dCtx.stroke();
				dCtx.closePath();
				socket.emit('drawline', { line: {
					p1: prev,
					p2: [point.x, point.y],
					strokeStyle: strokeStyle,
					lineWidth: lineWidth}
				});
				prev[0] = point.x;
				prev[1] = point.y;
			}
		}
	}
	// called once at start
	function init(){
		startup = false;
		view.setContext(ctx);
	}
	// standard vars
	var w = canvas.width;
	var h = canvas.height;
	var cw = w / 2;  // center
	var ch = h / 2;
	var globalTime;

	// main update function
	function update(timer){
		if(startup){ init() };
		if(typeof pointer === 'undefined') return;
		globalTime = timer;
		ctx.setTransform(1,0,0,1,0,0); // reset transform
		ctxImg.setTransform(1,0,0,1,0,0); // reset transform
		ctx.globalAlpha = 1;           // reset alpha
		ctxImg.globalAlpha = 1;           // reset alpha
		ctx.globalCompositeOperation = "source-over";
		ctxImg.globalCompositeOperation = "source-over";
		if(w !== innerWidth || h !== innerHeight){
			cw = (w = canvas.width = innerWidth) / 2;
			ch = (h = canvas.height = innerHeight) / 2;
		}
		// clear main canvas and draw the draw image with shadows and make it look nice
		ctx.clearRect(0,0,w,h);
		ctxImg.clearRect(0,0,w,h);
		view.apply();
		ctx.fillStyle = "black";
		ctx.globalAlpha = 0.4;
		ctx.fillRect(5,H,W-5,5)
		ctx.fillRect(W,5,5,H);
		ctx.globalAlpha = 1;
		ctx.drawImage(drawing,0,0);
		ctxImg.drawImage(inputImg,0,0);
		ctx.setTransform(1,0,0,1,0,0);
		ctxImg.setTransform(1,0,0,1,0,0);
		// handle touch.
		// If single point then draw
		if((pointer.count === 1 || drawMode) && ! pinchMode){
			if(pointer.count === 0){
				drawMode = false;
				drawOnDrawing();
			}else{
				view.toWorld(pointer,worldPoint);
				drawnPoints.push({x : worldPoint.x, y : worldPoint.y})
				if(drawMode){
					drawOnDrawing();
				}else if(drawnPoints.length > drawModeDelay){
					drawMode = true;
				}
			}
			// if two point then pinch.
		}else if(pointer.count === 2 || pinchMode){
			drawnPoints.length = 0; // dump any draw points
			if(pointer.count === 0){
				pinchMode = false;
			}else if(!pinchMode && pointer.count === 2){
				pinchMode = true;
				view.setPinch(pointer.points[0],pointer.points[1]);
			}else{
				view.movePinch(pointer.points[0],pointer.points[1]);
			}
		}else{
			pinchMode = false;
			drawMode = false;
		}
		requestAnimationFrame(update);
	}
	requestAnimationFrame(update);


	function touch(element){
		const touch = {
			points : [],
			x : 0, y : 0,
			//isTouch : true, // use to determine the IO type.
			count : 0,
			w : 0, rx : 0, ry : 0,

		}
		var m = touch;
		var t = touch.points;
		function newTouch () { for(var j = 0; j < m.pCount; j ++) { if (t[j].id === -1) { return t[j] } } }
		function getTouch(id) { for(var j = 0; j < m.pCount; j ++) { if (t[j].id === id) { return t[j] } } }

		function setTouch(touchPoint,point,start,down){
			if(touchPoint === undefined){ return }
			if(start) {
				touchPoint.oy = point.pageX;
				touchPoint.ox = point.pageY;
				touchPoint.id = point.identifier;
			} else {
				touchPoint.ox = touchPoint.x;
				touchPoint.oy = touchPoint.y;
			}
			touchPoint.x = point.pageX;
			touchPoint.y = point.pageY;
			touchPoint.down = down;
			if(!down) { touchPoint.id = -1 }
		}
		function mouseEmulator(){
			var tCount = 0;
			for(var j = 0; j < m.pCount; j ++){
				if(t[j].id !== -1){
					if(tCount === 0){
						m.x = t[j].x;
						m.y = t[j].y;
					}
					tCount += 1;
				}
			}
			m.count= tCount;
		}
		function touchEvent(e){
			var i, p;
			p = e.changedTouches;
			if (e.type === "touchstart") {
				prev[0]=0; prev[1]=0;
				for (i = 0; i < p.length; i ++) { setTouch(newTouch(), p[i], true, true) }
			} else if (e.type === "touchmove") {
				for (i = 0; i < p.length; i ++) { setTouch(getTouch(p[i].identifier), p[i], false, true) }
			} else if (e.type === "touchend") {
				for (i = 0; i < p.length; i ++) { setTouch(getTouch(p[i].identifier), p[i], false, false) }
			}
			mouseEmulator();
			e.preventDefault();
			return false;
		}
		touch.pCount = navigator.maxTouchPoints;
		element = element === undefined ? document : element;
		doFor(navigator.maxTouchPoints, () => touch.points.push({x : 0, y : 0, dx : 0, dy : 0, down : false, id : -1}));
		["touchstart","touchmove","touchend"].forEach(name => element.addEventListener(name, touchEvent) );
		return touch;
	}
	function setupPointingDevice(element){
		if(navigator.maxTouchPoints === undefined){
			if(navigator.appVersion.indexOf("Android") > -1  ||
			navigator.appVersion.indexOf("iPhone") > -1 ||
			navigator.appVersion.indexOf("iPad") > -1 ){
				navigator.maxTouchPoints = 5;
			}
		}
		if(navigator.maxTouchPoints > 0){
			return touch(element);
		}else{
			//return mouse(); // does not take an element defaults to the page.
		}
	}

	const view = (()=>{
		const matrix = [1,0,0,1,0,0]; // current view transform
		const invMatrix = [1,0,0,1,0,0]; // current inverse view transform
		var m = matrix;  // alias
		var im = invMatrix; // alias
		var scale = 1;   // current scale
		var rotate = 0;
		var maxScale = 1;
		const pinch1 = {x :0, y : 0}; // holds the pinch origin used to pan zoom and rotate with two touch points
		const pinch1R = {x :0, y : 0};
		var pinchDist = 0;
		var pinchScale = 1;
		var pinchAngle = 0;
		var pinchStartAngle = 0;
		const workPoint1 = {x :0, y : 0};
		const workPoint2 = {x :0, y : 0};
		const wp1 = workPoint1; // alias
		const wp2 = workPoint2; // alias
		var ctx;
		const pos = {x : 0,y : 0};      // current position of origin
		var dirty = true;
		const API = {
			canvasDefault () { ctx.setTransform(1, 0, 0, 1, 0, 0) },
			apply(){
				if(dirty){
					this.update();
				}
				ctxImg.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
				ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
			},
			reset() {
				scale = 1;
				rotate = 0;
				pos.x = 0;
				pos.y = 0;
				dirty = true;
			},
			matrix,
			invMatrix,
			update () {
				dirty = false;
				m[3] = m[0] = Math.cos(rotate) * scale;
				m[2] = -(m[1] = Math.sin(rotate) * scale);
				m[4] = pos.x;
				m[5] = pos.y;
				this.invScale = 1 / scale;
				var cross = m[0] * m[3] - m[1] * m[2];
				im[0] =  m[3] / cross;
				im[1] = -m[1] / cross;
				im[2] = -m[2] / cross;
				im[3] =  m[0] / cross;
			},
			toWorld (from,point = {}) {  // convert screen to world coords
				var xx, yy;
				if (dirty) { this.update() }
				xx = from.x - m[4];
				yy = from.y - m[5];
				point.x = xx * im[0] + yy * im[2];
				point.y = xx * im[1] + yy * im[3];
				return point;
			},
			toScreen (from,point = {}) {  // convert world coords to screen coords
				if (dirty) { this.update() }
				point.x =  from.x * m[0] + from.y * m[2] + m[4];
				point.y = from.x * m[1] + from.y * m[3] + m[5];
				return point;
			},
			setPinch(p1,p2){ // for pinch zoom rotate pan set start of pinch screen coords
				if (dirty) { this.update() }
				pinch1.x = p1.x;
				pinch1.y = p1.y;
				var x = (p2.x - pinch1.x);
				var y = (p2.y - pinch1.y);
				pinchDist = Math.sqrt(x * x + y * y);
				pinchStartAngle = Math.atan2(y, x);
				pinchScale = scale;
				pinchAngle = rotate;
				this.toWorld(pinch1, pinch1R)
			},
			movePinch(p1,p2,dontRotate){
				if (dirty) { this.update() }
				var x = (p2.x - p1.x);
				var y = (p2.y - p1.y);
				var pDist = Math.sqrt(x * x + y * y);
				scale = pinchScale * (pDist / pinchDist);
				if(!dontRotate){
					var ang = Math.atan2(y, x);
					rotate = pinchAngle + (ang - pinchStartAngle);
				}
				this.update();
				pos.x = p1.x - pinch1R.x * m[0] - pinch1R.y * m[2];
				pos.y = p1.y - pinch1R.x * m[1] - pinch1R.y * m[3];
				dirty = true;
			},
			setContext (context) {ctx = context; dirty = true },
		};
		return API;
	})();

	var imgc = document.getElementById("imgcanvas");
	ctxImg = imgc.getContext("2d");
	inputImg = document.getElementById("img");
	fitToImg(imgc);
	// registerTouchEvents(document.querySelector('canvas'));

	$("button#fg").click(function(e){
		e.preventDefault();
		$("button#bg").removeClass("active");
		$(this).addClass("active");
		updateStrokeStyle();
	});

	$("button#bg").click(function(e){
		e.preventDefault();
		$("button#fg").removeClass("active");
		$(this).addClass("active");
		updateStrokeStyle();
	});

	$("button#clearall").click(function(e){
		e.preventDefault();
		socket.emit("clearall");
		dCtx.clearRect(0, 0, imgWidth(), imgHeight());
	});

	socket.on('clearall', function (data) {
		dCtx.clearRect(0, 0, imgWidth(), imgHeight());
  });

	updateStrokeStyle();

	// Generate an unique ID
	var id = Math.round($.now()*Math.random());

});

function drawLine(context, fromx, fromy, tox, toy){
	updateStrokeStyle();
	context.beginPath();
	context.moveTo(fromx, fromy);
	context.lineTo(tox, toy);
	context.stroke();
	context.closePath();
}

function updateStrokeStyle() {
	if($("button#bg").hasClass("active")) {
		strokeStyle = "#0076e4";
	} else {
		strokeStyle = "#e47600";
	}
}

function fitToImg(canvas){
	var img = document.getElementById('img');
	var width = img.clientWidth;
	var height = img.clientHeight;
	canvas.style.width=width;
	canvas.style.height=height;
	canvas.width  = width;
	canvas.height = height;
}

function imgWidth() {
	var img = document.getElementById('img');
	return img.clientWidth;
}

function imgHeight() {
	var img = document.getElementById('img');
	return img.clientHeight;
}
