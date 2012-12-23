module.exports = function(config) {


  
  return {
    auth: function auth(req, res, next) {
      if(req.headers.authorization && req.headers.authorization.search('Basic ') === 0) {
        if(config.accounts.indexOf(new Buffer(req.headers.authorization.split(' ')[1], 'base64').toString()) !== -1) {
          next();
          return;
        }
      }

      res.header('WWW-Authenticate', 'Basic realm="'+config.name+'"');

      var timeout = 0;
      if(req.headers.authorization) {
        timeout = 4000;
      }

      setTimeout(function() {
        res.send('Authentication required', 401);
      }, timeout);
    }
  }
}