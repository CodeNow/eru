'use strict';

// express related stuff
var express = require('express');
var app = express();
var session = require('express-session');

// other modules
var domain = process.env.ADMIN_DOMAIN;
var apiHost = process.env.API_HOST;
var runnableHost = process.env.RUNNABLE_HOST;
var fs = require('fs');
var path = require('path');

// authentication stuff
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
passport.serializeUser(function (user, done) {
  done(null, JSON.stringify(user));
});
passport.deserializeUser(function (user, done) {
  done(null, JSON.parse(user));
});
passport.use(new GitHubStrategy({
  clientID: process.env.ADMIN_GITHUB_ID,
  clientSecret: process.env.ADMIN_GITHUB_SECRET,
  callbackURL: 'https://' + domain + '/auth/github/callback'
}, function (accessToken, refreshProfile, profile, done) {
  var validUsers = [
    'anandkumarpatel',
    'forrestj',
    'bkendall',
    'sundippatel',
    'tjmehta',
    'prafulrana',
    'paulrduffy'
  ];
  if (validUsers.indexOf(profile.username) === -1) {
    return done(new Error('not permitted'));
  }
  done(null, profile);
}));

// https redirect
app.all('*', function (req, res, next) {
  if (!req.secure && req.headers['x-forwarded-protocol'] !== 'https') {
    return res.redirect('https://' + domain + req.originalUrl);
  }
  next();
});

app.use(session({
  name: 'radmin.sid',
  secret: 'secretsarenofun'
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/panel', function (req, res, next) {
  if (!req.user) {
    return next(new Error('unauthorized'));
  }
  next();
});

app.get('/', function (req, res, next) {
  var filename = path.join(__dirname, 'public', 'index.html');
  fs.readFile(filename, function (err, data) {
    if (err) { return next(err); }
    res.end(data);
  });
});
app.get('/panel', function (req, res) {
  var filename = path.join(__dirname, 'public', 'panel', 'index.html');
  var data = fs.readFileSync(filename, { encoding: 'utf-8' });
  data = data.replace(/{{ API_HOST }}/g, apiHost);
  data = data.replace(/{{ RUNNABLE_HOST }}/g, runnableHost);
  res.end(data);
});

app.get('/auth/github',
  passport.authenticate('github'));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/#failed' }),
  function (req, res) {
    res.redirect('/panel');
  });

app.use(function (err, req, res, next) {
  if (err) {
    console.error(err.stack);
    return res.status(500).end(err.message);
  }
  next();
});

var port = process.env.PORT || '8080';
app.listen(port, function () {
  console.log('listening on', port);
});

