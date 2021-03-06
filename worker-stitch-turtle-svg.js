// Turtle Embroidery to SVG

// This works very much like the lazer turtle
// but it generates three SVGs at the same time
// One original path, and two stippled paths
// The stippled paths correspond to the thread showing
// up on the front and reverse side of the fabric

//////////////////////////////////////////////////////////////////////////
//
// seedrandom.js version 2.0.
// Author: David Bau 4/2/2011
//
// Put on Github by Matt Glazar;
// https://github.com/strager/seedrandom
//
// Defines a method Math.seedrandom() that, when called, substitutes
// an explicitly seeded RC4-based algorithm for Math.random().  Also
// supports automatic seeding from local or network sources of entropy.
//
// Usage:
//
//   <script src=http://davidbau.com/encode/seedrandom-min.js></script>
//
//   Math.seedrandom('yipee'); Sets Math.random to a function that is
//                             initialized using the given explicit seed.
//
//   Math.seedrandom();        Sets Math.random to a function that is
//                             seeded using the current time, dom state,
//                             and other accumulated local entropy.
//                             The generated seed string is returned.
//
//   Math.seedrandom('yowza', true);
//                             Seeds using the given explicit seed mixed
//                             together with accumulated entropy.
//
//   <script src="http://bit.ly/srandom-512"></script>
//                             Seeds using physical random bits downloaded
//                             from random.org.
//
//   <script src="https://jsonlib.appspot.com/urandom?callback=Math.seedrandom">
//   </script>                 Seeds using urandom bits from call.jsonlib.com,
//                             which is faster than random.org.
//
// Examples:
//
//   Math.seedrandom("hello");            // Use "hello" as the seed.
//   document.write(Math.random());       // Always 0.5463663768140734
//   document.write(Math.random());       // Always 0.43973793770592234
//   var rng1 = Math.random;              // Remember the current prng.
//
//   var autoseed = Math.seedrandom();    // New prng with an automatic seed.
//   document.write(Math.random());       // Pretty much unpredictable.
//
//   Math.random = rng1;                  // Continue "hello" prng sequence.
//   document.write(Math.random());       // Always 0.554769432473455
//
//   Math.seedrandom(autoseed);           // Restart at the previous seed.
//   document.write(Math.random());       // Repeat the 'unpredictable' value.
//
// Notes:
//
// Each time seedrandom('arg') is called, entropy from the passed seed
// is accumulated in a pool to help generate future seeds for the
// zero-argument form of Math.seedrandom, so entropy can be injected over
// time by calling seedrandom with explicit data repeatedly.
//
// On speed - This javascript implementation of Math.random() is about
// 3-10x slower than the built-in Math.random() because it is not native
// code, but this is typically fast enough anyway.  Seeding is more expensive,
// especially if you use auto-seeding.  Some details (timings on Chrome 4):
//
// Our Math.random()            - avg less than 0.002 milliseconds per call
// seedrandom('explicit')       - avg less than 0.5 milliseconds per call
// seedrandom('explicit', true) - avg less than 2 milliseconds per call
// seedrandom()                 - avg about 38 milliseconds per call
//
// LICENSE (BSD):
//
// Copyright 2010 David Bau, all rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
// 
//   1. Redistributions of source code must retain the above copyright
//      notice, this list of conditions and the following disclaimer.
//
//   2. Redistributions in binary form must reproduce the above copyright
//      notice, this list of conditions and the following disclaimer in the
//      documentation and/or other materials provided with the distribution.
// 
//   3. Neither the name of this module nor the names of its contributors may
//      be used to endorse or promote products derived from this software
//      without specific prior written permission.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
/**
 * All code is in an anonymous closure to keep the global namespace clean.
 *
 * @param {number=} overflow 
 * @param {number=} startdenom
 */
(function (factory) {
  function call_factory(exports) {
    factory(
      [],      // pool: entropy pool starts empty
      exports, // exports: package on which to export properties
      Math,    // math: package containing random, pow
      256,     // width: each RC4 output is 0 <= x < 256
      6,       // chunks: at least six RC4 outputs for each double
      52       // significance: there are 52 significant digits in a double
    );
  }

  if(typeof exports !== 'undefined') {
    // Node.js
    call_factory(exports);
  } else if(typeof define === 'function') {
    // AMD
    define([], function() {
      var ret = {};
      call_factory(ret);
      return ret;
    });
  } else {
    // Browser
    call_factory(Math);
  }
}(function (pool, exports, math, width, chunks, significance, overflow, startdenom) {


//
// create_rng()
// Creates an mutable random number generator.
//
function create_rng(seed, use_entropy) {
  var key = [];
  var arc4;

  // Flatten the seed string or build one from local entropy if needed.
  seed = mixkey(flatten(
    use_entropy ? [seed, pool] :
    typeof seed !== 'undefined' ? seed :
    [new Date().getTime(), pool, window], 3), key);

  // Use the seed to initialize an ARC4 generator.
  arc4 = new ARC4(key);

  // Mix the randomness into accumulated entropy.
  mixkey(arc4.S, pool);

  // This function returns a random double in [0, 1) that contains
  // randomness in every bit of the mantissa of the IEEE 754 value.

  function random() {                   // Closure to return a random double:
    var n = arc4.g(chunks);             // Start with a numerator n < 2 ^ 48
    var d = startdenom;                 //   and denominator d = 2 ^ 48.
    var x = 0;                          //   and no 'extra last byte'.
    while (n < significance) {          // Fill up all significant digits by
      n = (n + x) * width;              //   shifting numerator and
      d *= width;                       //   denominator and generating a
      x = arc4.g(1);                    //   new least-significant-byte.
    }
    while (n >= overflow) {             // To avoid rounding up, before adding
      n /= 2;                           //   last byte, shift everything
      d /= 2;                           //   right using integer math until
      x >>>= 1;                         //   we have exactly the desired bits.
    }
    return (n + x) / d;                 // Form the number within [0, 1).
  }

  return {
    'seed': seed,
    'random': random
  };
}

exports['create_rng'] = create_rng;

//
// seedrandom()
// This is the seedrandom function described above.
//
exports['seedrandom'] = function seedrandom(seed, use_entropy) {
  var rng = create_rng(seed, use_entropy);

  exports['random'] = rng['random'];

  return rng['seed'];
};

//
// ARC4
//
// An ARC4 implementation.  The constructor takes a key in the form of
// an array of at most (width) integers that should be 0 <= x < (width).
//
// The g(count) method returns a pseudorandom integer that concatenates
// the next (count) outputs from ARC4.  Its return value is a number x
// that is in the range 0 <= x < (width ^ count).
//
/** @constructor */
function ARC4(key) {
  var t, u, me = this, keylen = key.length;
  var i = 0, j = me.i = me.j = me.m = 0;
  me.S = [];
  me.c = [];

  // The empty key [] is treated as [0].
  if (!keylen) { key = [keylen++]; }

  // Set up S using the standard key scheduling algorithm.
  while (i < width) { me.S[i] = i++; }
  for (i = 0; i < width; i++) {
    t = me.S[i];
    j = lowbits(j + t + key[i % keylen]);
    u = me.S[j];
    me.S[i] = u;
    me.S[j] = t;
  }

  // The "g" method returns the next (count) outputs as one number.
  me.g = function getnext(count) {
    var s = me.S;
    var i = lowbits(me.i + 1); var t = s[i];
    var j = lowbits(me.j + t); var u = s[j];
    s[i] = u;
    s[j] = t;
    var r = s[lowbits(t + u)];
    while (--count) {
      i = lowbits(i + 1); t = s[i];
      j = lowbits(j + t); u = s[j];
      s[i] = u;
      s[j] = t;
      r = r * width + s[lowbits(t + u)];
    }
    me.i = i;
    me.j = j;
    return r;
  };
  // For robust unpredictability discard an initial batch of values.
  // See http://www.rsa.com/rsalabs/node.asp?id=2009
  me.g(width);
}

//
// flatten()
// Converts an object tree to nested arrays of strings.
//
/** @param {Object=} result 
  * @param {string=} prop
  * @param {string=} typ */
function flatten(obj, depth, result, prop, typ) {
  result = [];
  typ = typeof(obj);
  if (depth && typ == 'object') {
    for (prop in obj) {
      if (prop.indexOf('S') < 5) {    // Avoid FF3 bug (local/sessionStorage)
        try { result.push(flatten(obj[prop], depth - 1)); } catch (e) {}
      }
    }
  }
  return (result.length ? result : obj + (typ != 'string' ? '\0' : ''));
}

//
// mixkey()
// Mixes a string seed into a key that is an array of integers, and
// returns a shortened string seed that is equivalent to the result key.
//
/** @param {number=} smear 
  * @param {number=} j */
function mixkey(seed, key, smear, j) {
  seed += '';                         // Ensure the seed is a string
  smear = 0;
  for (j = 0; j < seed.length; j++) {
    key[lowbits(j)] =
      lowbits((smear ^= key[lowbits(j)] * 19) + seed.charCodeAt(j));
  }
  seed = '';
  for (j in key) { seed += String.fromCharCode(key[j]); }
  return seed;
}

//
// lowbits()
// A quick "n mod width" for width a power of 2.
//
function lowbits(n) { return n & (width - 1); }

//
// The following constants are related to IEEE 754 limits.
//
startdenom = math.pow(width, chunks);
significance = math.pow(2, significance);
overflow = significance * 2;

//
// When seedrandom.js is loaded, we immediately mix a few bits
// from the built-in RNG into the entropy pool.  Because we do
// not want to intefere with determinstic PRNG state later,
// seedrandom will not call math.random on its own again after
// initialization.
//
var builtinRandom = math.random;
mixkey(builtinRandom(), pool);

exports['random'] = builtinRandom;

}));

//////////////////////////////////////////////////////////////////////////

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

var turnRight, right, r;
turnRight = right = r =  function(angle){
  if (isNaN(angle)) { return; }

  turnLeft(-angle);
};
var turnLeft, left, l;
turnLeft = left = l = function(angle){
  if (isNaN(angle)) { return; }

  _currentAngle += angle;
  _currentAngle = _currentAngle%1;
  _turn();
};

// Absolute turn
var turnTo, turn, t;
turnTo = turn = t = function(angle){
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
var moveForward, f, forward;
moveForward = forward = f = function (distance) {
  if (isNaN(distance)) { return; }
  var x = distance * _vector.x / _accuracy;
  var y = distance * _vector.y / _accuracy;
  _currentPath.rel(x, y, _pen);

}

// Absolute moves
var goTo, goto, g;
goTo = goto = function (x, y) {
  if (isNaN(x) || isNaN(y)) { return; }
  _currentPath.abs(x, y, _pen);
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
