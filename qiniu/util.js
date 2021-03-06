var fs = require('fs');
var url = require('url');
var path = require('path');
var crypto = require('crypto');
var conf = require('./conf');

// ------------------------------------------------------------------------------------------
// func encode

exports.urlsafeBase64Encode = function(jsonFlags) {
  var encoded = new Buffer(jsonFlags).toString('base64');
  return exports.base64ToUrlSafe(encoded);
}

exports.base64ToUrlSafe = function(v) {
  return v.replace(/\//g, '_').replace(/\+/g, '-');
}

exports.hmacSha1 = function(encodedFlags, secretKey) {
  /*
   *return value already encoded with base64
  * */
  var hmac = crypto.createHmac('sha1', secretKey);
  hmac.update(encodedFlags);
  return hmac.digest('base64');
}

// ------------------------------------------------------------------------------------------
// func readAll

exports.readAll = function(strm, ondata) {
    var out = [];
    var total = 0;
    strm.on('data', function(chunk) {
        out.push(chunk);
        total += chunk.length;
    });
    strm.on('end', function() {
        var data;
        switch (out.length) {
        case 0:
            data = new Buffer(0);
            break;
        case 1:
            data = out[0];
            break;
        default:
            data = new Buffer(total);
            var pos = 0;
            for (var i = 0; i < out.length; i++) {
                var chunk = out[i];
                chunk.copy(data, pos);
                pos += chunk.length;
            }
        }
        ondata(data);
    });
};

// ------------------------------------------------------------------------------------------
// func generateAccessToken

exports.generateAccessToken = function(uri, body) {
  var u = url.parse(uri);
  var path = u.path;
  var access = path + '\n';

  if (body) {
    access += body;
  }

  var digest = exports.hmacSha1(access, conf.SECRET_KEY);
  var safeDigest = exports.base64ToUrlSafe(digest);
  return 'QBox ' + conf.ACCESS_KEY + ':' + safeDigest;
}

// --------------------
// getResp

exports.getResp = function(onret) {
  var onresp = function(res) {
    exports.readAll(res, function(data) {
      var err, ret;

      if (Math.floor(res.statusCode/100) === 2) {
        if (data.length !== 0) {
          try {
            ret = JSON.parse(data);
          } catch (e) {
            err = {code: res.statusCode, err: e.toString()};
          }
        }
      } else {
        err = {code: res.statusCode, error: data.toString()};
      }
      onret(err, ret);
    })
  };
  
  return onresp;
}
