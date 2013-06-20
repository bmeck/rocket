var Connection = require('./connection.js');
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
Path.prototype.execute = function (transform) {
  var length = this.length;
  transform.call(this, this.keys.slice(0, length), this.values.slice(0, length));
}
Path.prototype.push = function (key, value) {
  var self = this;
  var length = this.length;
  this.keys[length] = key;
  this.values[length] = value;
  this.preconnections[length] = null;
  this.postconnections[length] = null;
  this.length++;
  for (var i = 0; i < length; i++) {
    var connections = this.preconnections[i];
    if (connections) {
      var deltaPath = self.keys.slice(i+1,self.length);
      connections.forEach(function (connection) {
        if (connection.matches(deltaPath)) {
           self.execute(connection.transform);
        } 
      });
    }
  }
}
Path.prototype.pop = function () {
  var self = this;
  var length = this.length;
  for (var i = 0; i < length; i++) {
    var connections = this.postconnections[i];
    if (connections) {
      var deltaPath = self.keys.slice(i+1,self.length);
      connections.forEach(function (connection) {
        if (connection.matches(deltaPath)) {
           self.execute(connection.transform);
        } 
      });
    }
  }
  this.length--;
}
module.exports = Path;
