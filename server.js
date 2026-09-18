const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const pool = require('./config/database');
const authRoutes = require('./routes/auth');
const feedbackRoutes = require('./routes/feedback');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session configuration — stored in Postgres so it survives across
// Vercel's serverless instances instead of living in server RAM
app.use(session({
    store: new pgSession({
        pool: pool,                // reuse your existing Postgres pool
        tableName: 'session',      // table it will create/use for sessions
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS-only cookie in prod
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

//serve static assets only 
app.use(express.static('public'));
//Mount auth routes at the ROOT
app.use('/', require('./routes/auth'));
app.use('/api', require('./routes/api'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/products', require('./routes/products'));
app.use('/member', require('./routes/productsPage'));
app.use('/feedback', require('./routes/feedback'));
app.use('/member', require('./routes/feedbackPage'));
app.use('/response', require('./routes/response'));
app.use('/member', require('./routes/responsePage'));
app.use('/cart', require('./routes/cart'));
app.use('/member', require('./routes/cartPage'));
app.use('/checkout', require('./routes/checkout'));       
app.use('/member', require('./routes/checkoutPage'));
app.use('/orders', require('./routes/order'));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;