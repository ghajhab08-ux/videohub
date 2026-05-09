console.log('--- BOOT START ---');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// SAFE MODE: Commenting out routes to isolate startup issues
// const publicRoutes = require('./routes/public');
// const adminRoutes = require('./routes/admin');

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;

console.log('--- ENV CHECK START ---');
console.log(`- PORT FROM ENV: ${process.env.PORT || 'UNDEFINED'}`);
console.log(`- PORT USED: ${PORT}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'UNDEFINED'}`);
console.log('--- ENV CHECK END ---');

app.use(cors({ origin: '*', credentials: true }));
app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));

// Mock routes for SAFE MODE
app.use('/api', (req, res) => res.json({ message: "SAFE MODE: Public API mocked" }));
app.use('/api/admin', (req, res) => res.json({ message: "SAFE MODE: Admin API mocked" }));

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('--- HEALTH CHECK HIT ---');
    res.status(200).json({
        status: "ok",
        port: PORT,
        uptime: process.uptime(),
        safeMode: true,
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.send('VideoHub API (SAFE MODE) is running.');
});

// Start server
console.log('--- SERVER ATTEMPTING TO START ---');
try {
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 SERVER LISTENING ON PORT: ${PORT}`);
        console.log(`📡 BINDING: 0.0.0.0`);
        console.log('--- BOOT COMPLETE ---');
    });

    server.on('error', (err) => {
        console.error('--- SERVER CRITICAL ERROR ---');
        console.error(err);
    });

    server.timeout = 0;
    server.keepAliveTimeout = 0;
} catch (err) {
    console.error('--- FATAL STARTUP ERROR ---');
    console.error(err);
}

