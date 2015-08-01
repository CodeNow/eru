'use strict';
// express related stuff
var express = require('express');
var app = express();
var session = require('express-session');

// other modules
var path = require('path');
var domain = process.env.ADMIN_DOMAIN;

// authentication stuff
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
passport.use(new GitHubStrategy({
  clientID: process.env.ADMIN_GITHUB_ID,
  clientSecret: process.env.ADMIN_GITHUB_SECRET,
  callbackURL: 'https://' + domain + '/auth/github/callback'
}, function (accessToken, refreshProfile, profile, done) {
  if (profile.login !== 'bkendall') {
    return done(new Error('unauthorized'));
  }
  done();
}));

app.all(function (req, res, next) {
  if (!req.secure) {
    return res.redirect('https://' + domain + req.originalUrl);
  }
  next();
});

app.use(session({
  cookie: {
    secure: true
  },
  name: 'radmin.sid',
  secret: 'secretsarenofun'
}));

app.use(express.static(path.join(__dirname, '/public')));

app.get('/auth/github',
  passport.authenticate('github'));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  function (req, res) {
    res.redirect('/panel');
  });

var port = process.env.PORT || '8080';
app.listen(port, function () {
  console.log('listening on', port);
});
