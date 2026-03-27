const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

// 配置Passport Google策略
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
  },
  function(accessToken, refreshToken, profile, done) {
    // 这里可以保存用户信息到数据库
    // 暂时先返回用户信息
    const user = {
      id: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      picture: profile.photos[0].value,
      provider: 'google'
    };
    
    console.log('Google用户登录:', user.email);
    return done(null, user);
  }
));

// 序列化用户信息到session
passport.serializeUser(function(user, done) {
  done(null, user);
});

// 反序列化用户信息
passport.deserializeUser(function(user, done) {
  done(null, user);
});

// 中间件：检查用户是否已登录
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// 中间件：检查用户是否未登录
function ensureNotAuthenticated(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

module.exports = {
  passport,
  ensureAuthenticated,
  ensureNotAuthenticated
};