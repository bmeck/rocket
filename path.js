var async = require('async'); 
var Connection = require('./connection.js');
//
function Path() {
  this.keys=[];
  this.values=[];
  this.preconnections=[];
  this.postconnections=[];
  this.length=0;
  return this;
}
Path.prototype.preConnect = function (pathFromCurrent, transform) {
  var length = this.length-1;
  this.preconnections[length]=this.preconnections[length]||[];
  this.preconnections[length].push(new Connection(pathFromCurrent, transform));
}
Path.prototype.postConnect = function (pathFromCurrent, transform) {
  var length = this.length-1;
  this.postconnections[length]=this.postconnections[length]||[];
  this.postconnections[length].push(new Connection(pathFromCurrent, transform));
}
Path.prototype.execute = function (transform, next) {
  var length = this.length;
  transform.call(this, this.keys.slice(0, length), this.values.slice(0, length), next);
}
Path.prototype.peekAtValue = function () {
  if (this.length === 0) {
    throw new Error('Cannot peek, no values found');
  }
  return this.values[this.length - 1];
}
Path.prototype.push = function (key, value, done) {
  var self = this;
  var length = this.length;
  this.keys[length] = key;
  this.values[length] = value;
  this.preconnections[length] = null;
  this.postconnections[length] = null;
  this.length++;
  var i = 0;
  async.whilst(
    function () {return i < length;},
    function (next) {
      var connections = self.preconnections[i];
      i++;
      if (connections) {
      	var deltaPath = self.keys.slice(i, self.length);
      	async.forEach(connections, function (connection, next) {
      	  if (connection.matches(deltaPath)) {
      	     self.execute(connection.transform, next);
      	  } 
          else {
            next(null);
          }
      	}, next);
      }
      else {
        next(null);
      }
    },
    done
  );
}
Path.prototype.pop = function (done) {
  var self = this;
  var length = this.length;
  var i = 0;
  async.whilst(
    function () {return i < length;},
    function (next) {
      var connections = self.postconnections[i];
      i++;
      if (connections) {
      	var deltaPath = self.keys.slice(i,self.length);
        console.log(deltaPath)
      	async.forEach(connections, function (connection, step) {
      	  if (connection.matches(deltaPath)) {
      	     self.execute(connection.transform, step);
      	  }
          else {
            step(null);
          }
      	}, next);
        return;
      }
      next(null);
    },
    function (err) {
      self.length--;
      done.apply(self, arguments);
    }
  );
}
module.exports = Path;
