require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4000;

// Middleware
const corsOptions = {
    origin: process.env.CLIENT_URL,
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Authorization middleware for admin routes
const authMiddleware = require('./middleware/auth');

// Routes
app.use('/api', publicRoutes);              // public routes (no auth)
app.use('/api/admin', adminRoutes); // admin.js handles its own auth internally

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'VideoHub API',
        timestamp: new Date()
    });
});
app.get('/', (req, res) => {
    res.send('VideoHub API Running');
});
// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Environment Variables Check:');
    console.log(`- ADMIN_USERNAME: ${process.env.ADMIN_USERNAME ? 'DEFINED' : 'MISSING'}`);
    console.log(`- ADMIN_PASSWORD: ${process.env.ADMIN_PASSWORD ? 'DEFINED' : 'MISSING'}`);
    console.log(`- JWT_SECRET: ${process.env.JWT_SECRET ? 'DEFINED' : 'MISSING'}`);
    console.log(`- CLIENT_URL: ${process.env.CLIENT_URL || 'NOT SET (allowing all origins)'}`);
    
    console.log(`Public APIs: http://localhost:${PORT}/api/videos`);
    console.log(`Admin APIs (require token): http://localhost:${PORT}/api/admin`);
});

// Disable timeout for large uploads
server.timeout = 0;
server.keepAliveTimeout = 0;

