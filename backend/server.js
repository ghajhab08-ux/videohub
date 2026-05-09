require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();

// Railway trust proxy
app.set('trust proxy', 1);

// Ensure required directories exist
const dirs = ['uploads', 'data'];
dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// Health check (Simple for Railway proxy)
app.get('/health', (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.get('/', (req, res) => {
    res.send('VideoHub API is running and healthy.');
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Use PORT provided in environment or default to 3000
const PORT = process.env.PORT || 3000;

// Listen on `PORT` and 0.0.0.0
app.listen(PORT, "0.0.0.0", function () {
    console.log(`=========================================`);
    console.log(`🚀 SERVER RUNNING ON PORT: ${PORT}`);
    console.log(`📡 BINDING TO: 0.0.0.0`);
    console.log(`=========================================`);
});

// Prevent immediate crash on uncaught errors
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});
