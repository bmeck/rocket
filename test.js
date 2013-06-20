var Path = require('./path.js');
var path = new Path();
var user = {name:"BOB"};
path.push(null, user);
path.preConnect(["name"], function () {
  console.log('PRE-XFORM', arguments);
});
path.postConnect(["name"], function () {
  console.log('POST-XFORM', arguments);
});
path.push("name", user.name);
path.pop();
console.log(path);
path.pop();
console.log(path);
