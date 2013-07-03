var Path = require('./path.js');
var uuid = 0;
var state_AwaitingValue = ++uuid;
var state_AwaitingKeyOrObjectEnd = ++uuid;
var state_AwaitingKey = ++uuid;
var state_AwaitingCommaOrObjectEnd = ++uuid;
var state_AwaitingColon = ++uuid;
var state_AwaitingItemOrArrayEnd = ++uuid;
var state_AwaitingCommaOrArrayEnd = ++uuid;
var state_ReadingTrue1 = ++uuid;
var state_ReadingTrue2 = ++uuid;
var state_ReadingTrue3 = ++uuid;
var state_ReadingFalse1 = ++uuid;
var state_ReadingFalse2 = ++uuid;
var state_ReadingFalse3 = ++uuid;
var state_ReadingFalse4 = ++uuid;
var state_ReadingNull1 = ++uuid;
var state_ReadingNull2 = ++uuid;
var state_ReadingNull3 = ++uuid;
var state_ReadingString = ++uuid;
var state_ReadingStringQuote = ++uuid;
var state_ReadingStringUnicode0 = ++uuid;
var state_ReadingStringUnicode1 = ++uuid;
var state_ReadingStringUnicode2 = ++uuid;
var state_ReadingStringUnicode3 = ++uuid;
var state_ReadingNumberFirst = ++uuid;
var state_ReadingNumber = ++uuid;
var state_ReadingNumberDecimalFirst = ++uuid;
var state_ReadingNumberDecimalDot = ++uuid;
var state_ReadingNumberDecimal = ++uuid;
var state_ReadingNumberExponentOrSign = ++uuid;
var state_ReadingNumberExponentFirst = ++uuid;
var state_ReadingNumberExponent = ++uuid;
var state_Finished = ++uuid;
var state_Error = ++uuid;

function JSAXParser() {
  this.readingKey = false;
  this.state = state_AwaitingValue;
  this.unicode = '';
  this.valueBuffer = null;
  this.key = null;
  this.root = null;
  this.path = new Path();
  this.push = this.push.bind(this);
  this.pop = this.pop.bind(this);
  return this;
}
module.exports = JSAXParser;

JSAXParser.prototype.write = function (str, done) {
  var i = 0;
  var self = this;
  function next(err) {
    if (err) {
      if (done) done(err);
      return;
    }
    if (i === str.length) {
      if (done) done(null);
      return;
    }
    var c = str[i];
    ++i;
    var numeric_c = c.charCodeAt(0);
    self.consume(numeric_c, c, next) 
  }
  next(null);
}

var isWhitespace = function (numeric_c) {
  return numeric_c === 0x20 || numeric_c === 0x0a || numeric_c === 0x09 || numeric_c === 0x0d;
}

var isHex = function (numeric_c) {
  return (numeric_c >= 0x30 && numeric_c <= 0x39) ||
    (numeric_c >= 0x61 && numeric_c <= 0x7a) ||
    (numeric_c >= 0x41 && numeric_c <= 0x5a);
}

JSAXParser.prototype.err = function (err, done) {
  this.state = state_Error;
  done(err);
}

JSAXParser.prototype.push = function push(value, done) {
  var self = this;
  if (self.readingKey) {
    self.key = value;
    self.readingKey = false;
    self.state = state_AwaitingColon;
    done(null);
    return;
  }
  else if (self.path.length === 0) {
    self.root = value;
    if (self.onRoot) {
      self.path.push(self.key, value, function () {
        self.onRoot(function (err) {
          if (err) return self.err(err, done);
          done(null);
        });
      });
      return;
    }
    self.path.push(self.key, value, done);
    return;
  }

  var container = self.path.peekAtValue();
  if (Array.isArray(container)) {
    container[container.length] = value;
    self.path.push(container.length-1, value, done);
  }
  else {
    container[self.key] = value;
    self.path.push(self.key, value, done);
  }
}

JSAXParser.prototype.pop = function pop(done) {
  var self = this;
  var invocations = 0;
  self.path.pop(function (err) {
    if (err) return self.err(err, done);
    if (self.path.length === 0) {
      self.state = state_Finished;
      if (self.onFinish) {
        self.onFinish(done);
        return;
      }
      else {
        done(null);
        return;
      }
    }
    else if (Array.isArray(self.path.peekAtValue())) {
      self.state = state_AwaitingCommaOrArrayEnd;
      done(null);
      return;
    }
    else {
      self.state = state_AwaitingCommaOrObjectEnd;
      done(null);
      return;
    }
  });
}

JSAXParser.prototype.pushPop = function push(value, done) {
  var self = this;
  var skipPop = self.readingKey;
  self.push(value, function (err) {
    if (err) return self.err(err, done);
    if (skipPop) {
      done(null);
      return;
    }
    self.pop(done);
  });
}

JSAXParser.prototype.finish = function (done) {
  var self = this;
  switch(self.state) {
    case state_ReadingNumber:
    case state_ReadingNumberDecimal:
    case state_ReadingNumberDecimalDot:
    case state_ReadingNumberExponent:
      self.pushPop(+self.valueBuffer, function (err) {
        if (err) {
          done(err);
          return;
        }
        self.state = state_Finished;
        if (done) done(null);
      });
      return;
    case state_Finished:
      if (done) done(null);
      return;
    default:
      self.err(new Error('Unexpected end of input'), done);
  }
}

JSAXParser.prototype.readValueChar = function readValueChar(numeric_c, c, done) {
  switch (numeric_c) {
    case 0x22: // '"'
      this.valueBuffer = "";
      this.state = state_ReadingString;
      done(null);
      return;
    case 0x7b: // '{'
      this.state = state_AwaitingKeyOrObjectEnd;
      this.push({}, done);
      return;
    case 0x5b: // '['
      this.state = state_AwaitingItemOrArrayEnd;
      this.push([], done);
      return;
    case 0x66: // 'f'
      this.state = state_ReadingFalse1;
      done(null);
      return;
    case 0x74: // 't'
      this.state = state_ReadingTrue1;
      done(null);
      return;
    case 0x6e: // 'n'
      this.state = state_ReadingNull1;
      done(null);
      return;
    case 0x30: // '0'
      this.valueBuffer = '0';
      this.state = state_ReadingNumberDecimalDot;
      done(null);
      return;
    default:
      // '1' - '9'
      // '0' is not a valid prefix
      if (numeric_c >= 0x31 && numeric_c <= 0x39) {
        this.valueBuffer = c;
        this.state = state_ReadingNumber;
        done(null);
        return;
      }
      // '-'
      else if (numeric_c === 0x2d) {
        this.valueBuffer = c;
        this.state = state_ReadingNumberFirst;
        done(null);
        return;
      }
      // ' ' || '\n' || '\t' || '\r' 
      else if (isWhitespace(numeric_c)) {
        done(null);
        return;
      }
      done(new Error('Unexpected character while awaiting value'));
      return;
  }
}

JSAXParser.prototype.readColonChar = function readValueChar(numeric_c, c, done) {
  if (numeric_c === 0x3a) { // ':'
    this.state = state_AwaitingValue;
    done(null);
    return;
  }
  else if (isWhitespace(numeric_c)) {
    done(null);
    return;
  }
  done(new Error('Unexpected character while reading colon'));
}

JSAXParser.prototype.readTrue1Char = function readValueChar(numeric_c, c, done) {
  if (numeric_c === 0x72) { // 'r'
    this.state = state_ReadingTrue2;
    done(null);
    return;
  }
  done(new Error('Unexpected character while reading true'));
}

JSAXParser.prototype.readTrue2Char = function readValueChar(numeric_c, c, done) {
  if (numeric_c === 0x75) { // 'u'
    this.state = state_ReadingTrue3;
    done(null);
    return;
  }
  done(new Error('Unexpected character while reading true'));
}

JSAXParser.prototype.readTrue3Char = function readValueChar(numeric_c, c, done) {
  if (numeric_c === 0x65) { // 'e'
    this.pushPop(true, done);
    return;
  }
  done(new Error('Unexpected character while reading true'));
}

JSAXParser.prototype.readNull1Char = function readValueChar(numeric_c, c, done) {
  if (numeric_c === 0x75) { // 'u'
    this.state = state_ReadingNull2;
    done(null);
    return;
  }
  done(new Error('Unexpected character while reading null'));
}

JSAXParser.prototype.readNull2Char = function readValueChar(numeric_c, c, done) {
  if (numeric_c === 0x6c) { // 'l'
    this.state = state_ReadingNull3;
    done(null);
    return;
  }
  done(new Error('Unexpected character while reading null'));
}

JSAXParser.prototype.readNull3Char = function readValueChar(numeric_c, c, done) {
  if (numeric_c === 0x6c) { // 'l'
    this.pushPop(null, done);
    return;
  }
  done(new Error('Unexpected character while reading null'));
}

JSAXParser.prototype.readFalse1Char = function readValueChar(numeric_c, c, done) {
  if (numeric_c === 0x61) { // 'a'
    this.state = state_ReadingFalse2;
    done(null);
    return;
  }
  done(new Error('Unexpected character while reading false'));
}

JSAXParser.prototype.readFalse2Char = function readValueChar(numeric_c, c, done) {
  if (numeric_c === 0x6c) { // 'l'
    this.state = state_ReadingFalse3;
    done(null);
    return;
  }
  done(new Error('Unexpected character while reading false'));
}

JSAXParser.prototype.readFalse3Char = function readValueChar(numeric_c, c, done) {
  if (numeric_c === 0x73) { // 's'
    this.state = state_ReadingFalse4;
    done(null);
    return;
  }
  done(new Error('Unexpected character while reading false'));
}

JSAXParser.prototype.readFalse4Char = function readValueChar(numeric_c, c, done) {
  if (numeric_c === 0x65) { // 'e'
    this.pushPop(false, done);
    return;
  }
  done(new Error('Unexpected character while reading false'));
}

JSAXParser.prototype.readStringChar = function readValueChar(numeric_c, c, done) {
  if (numeric_c === 0x22) { // '"'
    this.pushPop(this.valueBuffer, done);
    return;
  }
  else if (numeric_c === 0x5c) {
    this.state = state_ReadingStringQuote;
    done(null);
    return;
  }
  else if (numeric_c < 0x20 || numeric_c === 0x7f) {
    done(new Error('Unexpected character while reading String'));
    return;
  }
  this.valueBuffer += c;
  done(null);
}

JSAXParser.prototype.readStringUnicode0Char = function readValueChar(numeric_c, c, done) {
  if (isHex(numeric_c)) {
    this.unicode += c;
    this.state = state_ReadingStringUnicode1;
    done(null);
    return;
  }
  done(new Error('Unexpected character while reading String unicode'));
}

JSAXParser.prototype.readStringUnicode1Char = function readValueChar(numeric_c, c, done) {
  if (isHex(numeric_c)) {
    this.unicode += c;
    this.state = state_ReadingStringUnicode2;
    done(null);
    return;
  }
  done(new Error('Unexpected character while reading String unicode'));
}

JSAXParser.prototype.readStringUnicode2Char = function readValueChar(numeric_c, c, done) {
  if (isHex(numeric_c)) {
    this.unicode += c;
    this.state = state_ReadingStringUnicode3;
    done(null);
    return;
  }
  done(new Error('Unexpected character while reading String unicode'));
}

JSAXParser.prototype.readStringUnicode3Char = function readValueChar(numeric_c, c, done) {
  if (isHex(numeric_c)) {
    this.valueBuffer += String.fromCharCode('0x' + this.unicode + c);
    this.state = state_ReadingString;
    done(null);
    return;
  }
  done(new Error('Unexpected character while reading String unicode'));
}

JSAXParser.prototype.readStringQuoteChar = function readValueChar(numeric_c, c, done) {
  if (numeric_c === 0x6e) {
    this.valueBuffer += '\n';
    this.state = state_ReadingString;
    done(null);
    return;
  }
  else if (numeric_c === 0x72) {
    this.valueBuffer += '\r';
    this.state = state_ReadingString;
    done(null);
    return;
  }
  else if (numeric_c === 0x22) {
    this.valueBuffer += '"';
    this.state = state_ReadingString;
    done(null);
    return;
  }
  else if (numeric_c === 0x5c) {
    this.valueBuffer += '\\';
    this.state = state_ReadingString;
    done(null);
    return;
  }
  else if (numeric_c === 0x75) {
    this.unicode = '';
    this.state = state_ReadingStringUnicode0;
    done(null);
    return;
  }
  else if (numeric_c === 0x74) {
    this.valueBuffer += '\t';
    this.state = state_ReadingString;
    done(null);
    return;
  }
  else if (numeric_c === 0x2f) {
    this.valueBuffer += '/';
    this.state = state_ReadingString;
    done(null);
    return;
  }
  else if (numeric_c === 0x66) {
    this.valueBuffer += '\f';
    this.state = state_ReadingString;
    done(null);
    return;
  }
  else if (numeric_c === 0x62) {
    this.valueBuffer += '\b';
    this.state = state_ReadingString;
    done(null);
    return;
  }
  done(new Error('Unexpected character while reading String quote'));
  return;
}

JSAXParser.prototype.readNumberChar = function readValueChar(numeric_c, c, done) {
  var self = this;
  if (c >= 0x30 && c <= 0x39) {
    self.valueBuffer += c;
    done(null);
    return;
  }
  else if (numeric_c === 0x45 || numeric_c === 0x65) {
    self.valueBuffer += 'e';
    self.state = state_ReadingNumberExponentOrSign;
    done(null);
    return;
  }
  else if (numeric_c === 0x2e) {
    self.valueBuffer += '.';
    self.state = state_ReadingNumberDecimalFirst;
    done(null);
    return;
  }
  self.pushPop(+self.valueBuffer, function (err) {
    if (err) {
      done(err);
      return;
    }
    self.consume(numeric_c, c, done);
  });
  return;
}

JSAXParser.prototype.readNumberFirstChar = function readValueChar(numeric_c, c, done) {
  if (numeric_c >= 0x30 || numeric_c <= 0x39) {
    this.valueBuffer += c;
    this.state = state_ReadingNumber;
    done(null);
    return;
  }
  done(new Error('Unexpected character while reading Number'));
  return;
}

JSAXParser.prototype.readNumberDecimalChar = function readValueChar(numeric_c, c, done) {
  var self = this;
  if (numeric_c >= 0x30 && numeric_c <= 0x39) {
    self.valueBuffer += c;
    done(null);
    return;
  }
  else if (numeric_c === 0x45 || numeric_c === 0x65) {
    self.valueBuffer += 'e';
    self.state = state_ReadingNumberExponentOrSign;
    done(null);
    return;
  }
  self.pushPop(+self.key, function (err) {
    if (err) {
      done(err);
      return;
    }
    self.consume(numeric_c, c, done);
  });
  return;
}

JSAXParser.prototype.readNumberDecimalFirstChar = function readValueChar(numeric_c, c, done) {
  var self = this;
  if (numeric_c >= 0x30 && numeric_c <= 0x39) {
    self.valueBuffer += c;
    self.state = state_ReadingNumberDecimal;
    done(null);
    return;
  }
  throw new Error('Unexpected character while reading Number');
  return;
}

JSAXParser.prototype.readNumberDecimalDotChar = function readValueChar(numeric_c, c, done) {
  var self = this;
  if (numeric_c === 0x2e) {
    self.valueBuffer += c;
    self.state = state_ReadingNumberDecimalFirst;
    done(null);
    return;
  }
  else if (numeric_c === 0x45 || numeric_c === 0x65) {
    self.valueBuffer += 'e';
    self.state = state_ReadingNumberExponentOrSign;
    done(null);
    return;
  }
  self.pushPop(+self.valueBuffer, function (err) {
    if (err) {
      done(err);
      return;
    }
    self.consume(numeric_c, c, done);
  });
  return;
}

JSAXParser.prototype.readNumberExponentChar = function readValueChar(numeric_c, c, done) {
  var self = this;
  if (numeric_c >= 0x30 && numeric_c <= 0x39) {
    self.valueBuffer += c;
    done(null);
    return;
  }
  self.pushPop(+self.valueBuffer, function (err) {
    if (err) {
      done(err);
      return;
    }
    self.consume(numeric_c, c, done);
  });
  return;
}

JSAXParser.prototype.readNumberExponentFirstChar = function readValueChar(numeric_c, c, done) {
  var self = this;
  if (numeric_c >= 0x30 && numeric_c <= 0x39) {
    self.valueBuffer += c;
    self.state = state_ReadingNumberExponent;
    done(null);
    return;
  }
  throw new Error('Unexpected character while reading Number');
  return;
}

JSAXParser.prototype.readNumberExponentOrSignChar = function readValueChar(numeric_c, c, done) {
  var self = this;
  if (numeric_c >= 0x30 && numeric_c <= 0x39) {
    self.valueBuffer += c;
    self.state = state_ReadingNumberExponent;
    done(null);
    return;
  }
  else if (numeric_c === 0x2b || numeric_c === 0x2d) {
    self.valueBuffer += c;
    self.state = state_ReadingNumberExponentFirst;
    done(null);
    return;
  }
  self.pushPop(+self.valueBuffer, function (err) {
    if (err) {
      done(err);
      return;
    }
    self.consume(numeric_c, c, done);
  });
  return;
}

JSAXParser.prototype.readKeyOrObjectEnd = function readValueChar(numeric_c, c, done) {
  if (isWhitespace(numeric_c)) {
    done(null);
    return;
  }
  else if (numeric_c === 0x7d) { // '}'
    this.pop(done);
    return;
  }
  else if (numeric_c === 0x22) { // '"'
    this.readingKey = true;
    this.valueBuffer = "";
    this.state = state_ReadingString;
    done(null);
    return;
  }
  done(new Error('Unexpected character while object key or end'));
  return;
}

JSAXParser.prototype.readUntilKey = function (numeric_c, c, done) {
  if (isWhitespace(numeric_c)) {
    done(null);
    return;
  }
  else if (numeric_c === 0x22) { // '"'
    this.valueBuffer = "";
    this.state = state_ReadingString;
    done(null);
    return;
  }
  done(new Error('Unexpected character while awaiting object key'));
  return;
}

JSAXParser.prototype.readCommaOrObjectEnd = function readValueChar(numeric_c, c, done) {
  if (isWhitespace(numeric_c)) {
    done(null);
    return;
  }
  else if (numeric_c === 0x7d) { // '}'
    this.pop(done);
    return;
  }
  else if (numeric_c === 0x2c) { // ','
    this.readingKey = true;
    this.state = state_AwaitingKey;
    done(null);
    return;
  }
  throw new Error('Unexpected character while object comma or end');
  return;
}

JSAXParser.prototype.readItemOrArrayEnd = function readValueChar(numeric_c, c, done) {
  if (isWhitespace(numeric_c)) {
    done(null);
    return;
  }
  else if (numeric_c === 0x5d) { // ']'
    this.pop(done);
    return;
  }
  else {
    this.readValueChar(numeric_c, c, done);
  }
}

JSAXParser.prototype.readCommaOrArrayEnd = function readValueChar(numeric_c, c, done) {
  if (isWhitespace(numeric_c)) {
    done(null);
    return;
  }
  else if (numeric_c === 0x5d) { // ']'
    this.pop(done);
    return;
  }
  else if (numeric_c === 0x2c) { // ','
    this.state = state_AwaitingValue;
    done(null);
    return;
  }
  throw new Error('Unexpected character while array comma or end');
  return;
}

JSAXParser.prototype.consume = function consume(numeric_c, c, done) {
  switch(this.state) {
    case state_AwaitingValue:
      this.readValueChar(numeric_c, c, done);
      return;
    case state_ReadingNull1:
      this.readNull1Char(numeric_c, c, done);
      return;
    case state_ReadingNull2:
      this.readNull2Char(numeric_c, c, done);
      return;
    case state_ReadingNull3:
      this.readNull3Char(numeric_c, c, done);
      return;
    case state_ReadingTrue1:
      this.readTrue1Char(numeric_c, c, done);
      return;
    case state_ReadingTrue2:
      this.readTrue2Char(numeric_c, c, done);
      return;
    case state_ReadingTrue3:
      this.readTrue3Char(numeric_c, c, done);
      return;
    case state_ReadingFalse1:
      this.readFalse1Char(numeric_c, c, done);
      return;
    case state_ReadingFalse2:
      this.readFalse2Char(numeric_c, c, done);
      return;
    case state_ReadingFalse3:
      this.readFalse3Char(numeric_c, c, done);
      return;
    case state_ReadingFalse4:
      this.readFalse4Char(numeric_c, c, done);
      return;
    case state_ReadingString:
      this.readStringChar(numeric_c, c, done);
      return;
    case state_ReadingStringQuote:
      this.readStringQuoteChar(numeric_c, c, done);
      return;
    case state_ReadingStringUnicode0:
      this.readStringUnicode0Char(numeric_c, c, done);
      return;
    case state_ReadingStringUnicode1:
      this.readStringUnicode1Char(numeric_c, c, done);
      return;
    case state_ReadingStringUnicode2:
      this.readStringUnicode2Char(numeric_c, c, done);
      return;
    case state_ReadingStringUnicode3:
      this.readStringUnicode3Char(numeric_c, c, done);
      return;
    case state_AwaitingColon:
      this.readColonChar(numeric_c, c, done);
      return;
    case state_ReadingNumberFirst:
      this.readNumberFirstChar(numeric_c, c, done);
      return;
    case state_ReadingNumber:
      this.readNumberChar(numeric_c, c, done);
      return;
    case state_ReadingNumberDecimalFirst:
      this.readNumberDecimalFirstChar(numeric_c, c, done);
      return;
    case state_ReadingNumberDecimalDot:
      this.readNumberDecimalDotChar(numeric_c, c, done);
      return;
    case state_ReadingNumberDecimal:
      this.readNumberDecimalChar(numeric_c, c, done);
      return;
    case state_ReadingNumberExponentOrSign:
      this.readNumberExponentOrSignChar(numeric_c, c, done);
      return;
    case state_ReadingNumberExponentFirst:
      this.readNumberExponentFirstChar(numeric_c, c, done);
      return;
    case state_ReadingNumberExponent:
      this.readNumberExponentChar(numeric_c, c, done);
      return;
    case state_AwaitingKey:
      this.readUntilKey(numeric_c, c, done);
      return;
    case state_AwaitingKeyOrObjectEnd:
      this.readKeyOrObjectEnd(numeric_c, c, done);
      return;
    case state_AwaitingCommaOrObjectEnd:
      this.readCommaOrObjectEnd(numeric_c, c, done);
      return;
    case state_AwaitingItemOrArrayEnd:
      this.readItemOrArrayEnd(numeric_c, c, done);
      return;
    case state_AwaitingCommaOrArrayEnd:
      this.readCommaOrArrayEnd(numeric_c, c, done);
      return;
    case state_Finished:
      if (isWhitespace(numeric_c)) {
        done(null);
        return;
      }
      this.err(new Error('Unexpected character after complete parse'), done);
      return;
  }
  this.err(new Error('Unexpected JSAXParser state'), done);
}
