# Google OAuth 登录集成指南

## 1. 准备工作

### 1.1 在 Google Cloud Console 配置
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 "Google Identity Services API"
4. 创建 OAuth 2.0 客户端 ID
5. 配置授权重定向 URI：
   ```
   http://43.162.82.13:3000/auth/google/callback
   ```

### 1.2 获取凭据
- **Client ID**: 从 Google Cloud Console 获取
- **Client Secret**: 从 Google Cloud Console 获取

## 2. 安装依赖

```bash
cd /root/.openclaw/workspace/image-background-remover
npm install passport passport-google-oauth20 express-session cookie-parser dotenv --save
```

## 3. 配置文件

### 3.1 创建 .env 文件
```bash
# Google OAuth 2.0 配置
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://43.162.82.13:3000/auth/google/callback

# 会话配置
SESSION_SECRET=change_this_to_a_random_secret_string

# Remove.bg API
REMOVE_BG_API_KEY=uRDGpJCnTetH4cwCJSQVUW2L
```

### 3.2 创建 auth.js
```javascript
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
  },
  function(accessToken, refreshToken, profile, done) {
    const user = {
      id: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      picture: profile.photos[0].value,
      provider: 'google'
    };
    return done(null, user);
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

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
```

## 4. 主要修改点

### 4.1 添加中间件到 server.js
```javascript
const session = require('express-session');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { passport, ensureAuthenticated, ensureNotAuthenticated } = require('./auth');

// 添加中间件
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());
```

### 4.2 添加认证路由
```javascript
// 登录页面
app.get('/login', ensureNotAuthenticated, (req, res) => {
  // 返回登录页面HTML
});

// Google OAuth 认证
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

// 登出
app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});
```

### 4.3 保护主页和API
```javascript
// 主页需要登录
app.get('/', ensureAuthenticated, (req, res) => {
  // 在HTML中显示用户信息
  const user = req.user;
  // ... 返回包含用户信息的页面
});

// API 需要登录
app.post('/process', ensureAuthenticated, upload.single('image'), async (req, res) => {
  // 处理图片，可以记录用户信息
  console.log(`用户 ${req.user.email} 上传了图片`);
});
```

## 5. 启动服务

```bash
# 设置环境变量
export GOOGLE_CLIENT_ID=your_client_id
export GOOGLE_CLIENT_SECRET=your_client_secret
export SESSION_SECRET=your_session_secret

# 启动服务器
node server-auth-complete.js
```

## 6. 测试流程

1. 访问 `http://43.162.82.13:3000/`
2. 自动重定向到登录页面
3. 点击 "使用 Google 账号登录"
4. 授权后重定向回主页
5. 显示用户信息，可以使用图片处理功能

## 7. 安全注意事项

1. **生产环境使用 HTTPS**: 重定向URI应该使用HTTPS
2. **会话安全**: 设置 `secure: true` 和 `httpOnly: true`
3. **环境变量**: 不要将敏感信息硬编码在代码中
4. **CSRF 保护**: 考虑添加CSRF保护
5. **权限控制**: 根据用户角色控制功能访问

## 8. 扩展功能建议

1. **用户数据库**: 将用户信息保存到数据库
2. **处理历史**: 记录用户的图片处理历史
3. **API 限制**: 根据用户等级限制API调用次数
4. **多提供商**: 支持GitHub、Facebook等其他OAuth提供商
5. **邮箱验证**: 添加邮箱验证功能