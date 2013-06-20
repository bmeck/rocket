function Connection(path, transform) {
  this.path = path;
  this.transform = transform;
  return this;
}
Connection.prototype.matches = function (keys) {
  return this.path.every(function(pathKey,i) {
    if (pathKey == null) {
      return true;
    }
    if (pathKey instanceof RegExp) {
      return pathKey.test(keys[i]);
    }
    return pathKey === keys[i];
  });
}
module.exports = Connection;
