// Turtle Embroidery to SVG

// This works very much like the lazer turtle
// but it generates three SVGs at the same time
// One original path, and two stippled paths
// The stippled paths correspond to the thread showing
// up on the front and reverse side of the fabric

var TAU = 2 * Math.PI;
var _accuracy = 1000000000;

// Reset turtle
var _moveCount, _pen, _position, _vector, _currentAngle;
var _paths, _currentPath, _frontPath, _backPath, _max, _defaultUsed;
var resetTurtle = function(){
  _moveCount = 0;
  _pen = true;
  _position = {
    x: 250,
    y: 250
  };
  _vector = {
    x: 0 * _accuracy,
    y: 1 * _accuracy
  };
  _max = {
    x: 480,
    y: 480
  };
  _currentAngle = 0;
  _paths = [];

  // Start default path
  color("rgba(0,0,0,0.75)");
  _defaultUsed = false;
};

// Relative turns, angles are 0.0 to 1.0
var _turn = function(){
  // Using * _accuracy because otherwise we get some stupid tiny numbers
  _vector.x = Math.round( Math.sin(TAU*_currentAngle) * _accuracy );
  _vector.y = Math.round( Math.cos(TAU*_currentAngle) * _accuracy );
};

var turnRight, r;
turnRight = r =  function(angle){
  if (isNaN(angle)) { return; }

  turnLeft(-angle);
};
var turnLeft, l;
turnLeft = l = function(angle){
  if (isNaN(angle)) { return; }

  _currentAngle += angle;
  _currentAngle = _currentAngle%1;
  _turn();
};

// Absolute turn
var turnTo, t;
turnTo = t = function(angle){
  if (isNaN(angle)) { return; }

  _currentAngle = angle;
  _turn();
};

// Tool up/down
var penUp, u;
penUp = u = function(){
  _pen = false;
};
var penDown, d;
penDown = d = function(){
  _pen = true;
};


// SVG Path object
var Path = function() {
  this.data = "";
  this.abs(_position.x, _position.y, false);
};

Path.prototype.rel = function(x, y, pen) {
  this.data += (pen ? "l" : "m") + " " + x + " " + y + " ";
};

Path.prototype.abs = function(x, y, pen)  {
  this.data += (pen ? "L" : "M") + " " + x + " " + y + " ";
};

// Track object - A collection of 3 Paths
var Track = function(color) {
  var _color = color.replace(/\"|\'|\>|\</g, " ");
  this.color = _color;
  this.d = new Path(); // default path
  this.f = new Path(); // front-side path
  this.b = new Path(); // back-side path
}

Track.prototype.rel = function(x, y, pen) {
  _positionBy(x, y);
  this.add("rel", x, y, pen);
};

Track.prototype.abs = function(x, y, pen) {
  _positionTo(x, y);
  this.add("abs", x, y, pen);
};

Track.prototype.add = function(fn, x, y, pen) {
  var active = _moveCount % 2;
  this.d[fn](x, y, pen);
  this.f[fn](x, y, pen && active);
  this.b[fn](x, y, pen && !active);
  if(pen) {
    _moveCount++;
  }
}

// Set color and make a new path
var color = function(color) {
  if (!_defaultUsed){
    _paths = [];
  }
  var newPath = new Track(color);
  _paths.push(newPath);
  _currentPath = newPath;
};

// Keeping track of the position
var _positionTo = function(x, y) {
  _position.x = x;
  _position.y = y;
  _max.x = Math.max(_max.x, _position.x);
  _max.y = Math.max(_max.y, _position.y);
  _defaultUsed = true;
}
var _positionBy = function(x, y) {
  _positionTo(_position.x+x, _position.y+y);
}

// Relative moves
var moveForward, f;
moveForward = f = function (distance) {
  if (isNaN(distance)) { return; }
  var x = distance * _vector.x / _accuracy;
  var y = distance * _vector.y / _accuracy;
  _currentPath.rel(x, y, _pen);

}

// SVG path 
// Absolute move
var moveTo = function (x, y) {
  if (isNaN(x) || isNaN(y)) { return; }
  _currentPath.abs(x, y, false);
}
// Relative move
var moveBy = function (x, y) {
  if (isNaN(x) || isNaN(y)) { return; }
  _currentPath.rel(x , y, false);
}
// Absolute line
var lineTo = function (x, y) {
  if (isNaN(x) || isNaN(y)) { return; }
  _currentPath.abs(x, y, true);
}
// Relative line
var lineBy = function (x, y) {
  if (isNaN(x) || isNaN(y)) { return; }
  _currentPath.rel(x, y, true);
}

// Worker setup
self.onmessage = function(e) {

  resetTurtle();

  try {
    eval(e.data);

    var createSVG = function(id) {
      // Build SVG string
      var svg = '<svg id="turtle-svg" xmlns="http://www.w3.org/2000/svg" version="1.1" width="'+
        Math.ceil(_max.x + 20) + '" height="' +
        Math.ceil(_max.y + 20) +'">'+"\n";
      for (var i=0; i<_paths.length; i++) {
        var path = _paths[i];
        svg += '  <path id="turtle-path-'+ i +'" '+
          'stroke="' + path.color + '" '+
          'd="' + path[id].data + '" '+
          'fill="none" vector-effect="non-scaling-stroke" />' + "\n";
      }
      svg += '</svg>';
      return svg;
    }

    self.postMessage({
      svg: {
        both: createSVG("d"),
        back: createSVG("f"),
        front: createSVG("b")
      },
      code: e.data
    });

  } catch (error) {
    // err
    self.postMessage("");
  }
};
