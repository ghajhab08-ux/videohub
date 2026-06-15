const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
// const authMiddleware = require('../middleware/auth'); // Removed old import

const VIDEOS_FILE = path.join(__dirname, '../data/videos.json');
const USERS_FILE = path.join(__dirname, '../data/users.json');

const supabase = require('../utils/supabase');

const { uploadToBunnyStorage } = require('../utils/bunnyStorage');
const multer = require('multer');

// Configure multer for temporary file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'))
    },
    filename: function (req, file, cb) {
        cb(null, uuidv4() + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });

// Local storage helpers removed - now using Supabase

/**
 * POST /api/admin/login
 * Unified login for both Admin and Users
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    // 1. Check if it's the Admin
    if (
        trimmedUsername === process.env.ADMIN_USERNAME &&
        trimmedPassword === process.env.ADMIN_PASSWORD
    ) {
        if (!process.env.JWT_SECRET) {
            console.error('CRITICAL: JWT_SECRET is not defined in environment');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const token = jwt.sign(
            { username: trimmedUsername, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('Admin login successful');
        return res.json({ 
            success: true,
            message: 'Login successful',
            token, 
            role: 'admin' 
        });
    }

    // 2. Proceed with normal user authentication via Supabase
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', trimmedUsername)
            .eq('password', trimmedPassword)
            .single();

        if (error || !user) {
            console.log('Login failed: Invalid credentials');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role || 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log(`User login successful: ${user.username}`);
        return res.json({
            success: true,
            message: 'Login successful',
            token,
            role: user.role || 'user'
        });
    } catch (err) {
        console.error('User Auth Error:', err);
        return res.status(500).json({ error: 'Server error during authentication' });
    }
});

/**
 * POST /api/admin/signup
 * Basic user registration using Supabase
 */
router.post('/signup', async (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('username')
            .eq('username', username.trim())
            .maybeSingle();
        
        if (checkError) throw checkError;

        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const newUser = {
            username: username.trim(),
            password: password.trim(), 
            email: email?.trim() || '',
            role: 'user',
            createdAt: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('users')
            .insert([newUser])
            .select()
            .single();

        if (error) throw error;
        if (!data) throw new Error('Failed to create account');

        const token = jwt.sign(
            { id: data.id, username: data.username, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            role: 'user',
            username: data.username
        });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to create account' });
    }
});

// 🔒 Protect everything below
const { adminMiddleware } = require('../middleware/auth');

// 🔒 Protect everything below
router.use(adminMiddleware);

/**
 * POST /api/admin/upload-video
 * Metadata only (Bunny CDN URL)
 */
router.post('/upload-video', async (req, res) => {
    const { title, description, categories, videoUrl, thumbnail, sourceType = 'bunny' } = req.body;

    if (!title || !videoUrl || !Array.isArray(categories) || categories.length === 0) {
        return res.status(400).json({
            error: 'Title, Video URL and at least one category are required'
        });
    }

    if (sourceType === 'bunny') {
        const bunnyBaseUrl = process.env.BUNNY_PULL_ZONE || 'https://videohub-cdn.b-cdn.net/';
        const normalizedBase = bunnyBaseUrl.endsWith('/') ? bunnyBaseUrl : `${bunnyBaseUrl}/`;
        const allowedPrefixes = [
            normalizedBase,
            'https://pvideos-cdn.b-cdn.net/',
            'https://videohub-cdn.b-cdn.net/'
        ];
        
        const isValid = allowedPrefixes.some(prefix => videoUrl.startsWith(prefix));
        if (!isValid) {
            return res.status(400).json({
                error: `Invalid Video URL. Must start with a valid Bunny CDN domain (e.g. ${allowedPrefixes.filter((v, i, a) => a.indexOf(v) === i).join(' or ')})`
            });
        }
    } else if (sourceType === 'embedded') {
        // Simple URL validation for embedded
        try {
            new URL(videoUrl);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid Embedded Video URL' });
        }
    }

    try {
        const normalizedCategories = [...new Set(
            categories.map(c => String(c).trim()).filter(Boolean)
        )];

        const newVideo = {
            title: title.trim(),
            description: description?.trim() || '',
            category: normalizedCategories[0] || 'Uncategorized', // Using single category as per request
            videoUrl,
            bunnyUrl: sourceType === 'bunny' ? videoUrl : '',
            thumbnail: thumbnail?.trim() || '',
            sourceType,
            views: 0,
            rating: '100%',
            createdAt: new Date().toISOString(),
            status: req.body.status || 'published',
            uploadType: req.body.uploadType || 'url',
            originalFileName: '',
            uploadDate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        let { data, error } = await supabase
            .from('videohubweb')
            .insert([newVideo])
            .select()
            .single();

        if (error && (error.code === '42703' || error.code === 'PGRST204')) {
            console.warn('Supabase Insert Warning: New columns not found, falling back to original schema for upload-video.');
            const fallbackVideo = {
                title: newVideo.title,
                description: newVideo.description,
                category: newVideo.category,
                videoUrl: newVideo.videoUrl,
                thumbnail: newVideo.thumbnail,
                sourceType: newVideo.sourceType,
                views: newVideo.views,
                rating: newVideo.rating,
                createdAt: newVideo.createdAt,
                status: newVideo.status
            };
            const fallbackRes = await supabase
                .from('videohubweb')
                .insert([fallbackVideo])
                .select()
                .single();
            data = fallbackRes.data;
            error = fallbackRes.error;
        }

        if (error) throw error;

        res.json({
            success: true,
            message: 'Video published successfully',
            video: data
        });
    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ error: 'Failed to save video metadata' });
    }
});

/**
 * POST /api/admin/upload-video-file
 * Uploads a video file to Bunny Stream and saves metadata to DB
 */
router.post('/upload-video-file', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        let { title, description, categories, thumbnail, status, uploadType } = req.body;

        if (!file) {
            return res.status(400).json({ error: 'Video file is required' });
        }

        if (!title) {
            fs.unlinkSync(file.path);
            return res.status(400).json({ error: 'Title is required' });
        }

        // Parse categories if it's sent as a JSON string
        let parsedCategories = [];
        if (categories) {
            try {
                parsedCategories = typeof categories === 'string' ? JSON.parse(categories) : categories;
            } catch (e) {
                parsedCategories = [categories];
            }
        }

        const normalizedCategories = [...new Set(
            parsedCategories.map(c => String(c).trim()).filter(Boolean)
        )];

        // Upload to Bunny Storage using existing integration
        const fileName = uuidv4() + '-' + file.originalname.replace(/\s+/g, '_');
        const cdnUrl = await uploadToBunnyStorage(file.path, fileName);

        // Remove temp file
        fs.unlinkSync(file.path);

        // Pull zone base (strip trailing slash)
        const pullZone = (process.env.BUNNY_PULL_ZONE || 'https://videohub-cdn.b-cdn.net').replace(/\/$/, '');

        const newVideo = {
            title: title.trim(),
            description: description?.trim() || '',
            category: normalizedCategories[0] || 'Uncategorized',
            videoUrl: cdnUrl,
            bunnyUrl: cdnUrl,
            thumbnail: thumbnail?.trim() || '',
            sourceType: 'bunny',
            views: 0,
            rating: '100%',
            createdAt: new Date().toISOString(),
            // New columns (added to DB via SQL)
            bunny_video_id: fileName,
            bunny_guid: fileName,
            playback_url: cdnUrl,
            embed_url: cdnUrl,
            status: status || 'published',
            upload_date: new Date().toISOString(),
            uploadDate: new Date().toISOString(),
            originalFileName: file.originalname,
            uploadType: (uploadType === 'bulk' || uploadType === 'folder') ? 'single' : (uploadType || 'single'),
            updatedAt: new Date().toISOString()
        };

        // First try inserting with all fields
        let data, error;
        const insertRes = await supabase
            .from('videohubweb')
            .insert([newVideo])
            .select()
            .single();
            
        data = insertRes.data;
        error = insertRes.error;

        // If insert fails due to missing columns (error code 42703), try again without new columns
        if (error && (error.code === '42703' || error.code === 'PGRST204')) {
            console.warn('Supabase Insert Warning: New columns not found, falling back to original schema.');
            const fallbackVideo = {
                title: newVideo.title,
                description: newVideo.description,
                category: newVideo.category,
                videoUrl: newVideo.videoUrl,
                thumbnail: newVideo.thumbnail,
                sourceType: newVideo.sourceType,
                views: newVideo.views,
                rating: newVideo.rating,
                createdAt: newVideo.createdAt,
                status: newVideo.status
            };
            const fallbackRes = await supabase
                .from('videohubweb')
                .insert([fallbackVideo])
                .select()
                .single();
            data = fallbackRes.data;
            error = fallbackRes.error;
        }

        if (error) {
            console.error('Supabase Insert Error:', error);
            return res.status(500).json({ error: 'Failed to save video metadata to database.' });
        }

        res.json({
            success: true,
            message: 'Video uploaded and published successfully',
            video: data
        });

    } catch (err) {
        console.error('File Upload Error:', err);
        // Ensure temp file is removed
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: err.message || 'Failed to upload video' });
    }
});

/**
 * GET /api/admin/videos
 * List all videos for admin management
 */
router.get('/videos', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('videohubweb')
            .select('*')
            .order('createdAt', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch {
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

/**
 * GET /api/admin/submissions
 */
router.get('/submissions', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('submissions')
            .select('*')
            .order('createdAt', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch {
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

/**
 * GET /api/admin/reports
 */
router.get('/reports', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .order('createdAt', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch {
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

/**
 * PUT /api/admin/video/:id
 */
router.put('/video/:id', async (req, res) => {
    const { title, description, categories, videoUrl, thumbnail, sourceType } = req.body;
    const { id } = req.params;

    if (!title || !videoUrl || !Array.isArray(categories)) {
        return res.status(400).json({
            error: 'Title, Video URL and categories are required'
        });
    }

    // Apply validation based on sourceType if it's being updated or already exists
    const effectiveSourceType = sourceType || 'bunny'; 

    if (effectiveSourceType === 'bunny') {
        const bunnyBaseUrl = process.env.BUNNY_PULL_ZONE || 'https://videohub-cdn.b-cdn.net/';
        const normalizedBase = bunnyBaseUrl.endsWith('/') ? bunnyBaseUrl : `${bunnyBaseUrl}/`;
        const allowedPrefixes = [
            normalizedBase,
            'https://pvideos-cdn.b-cdn.net/',
            'https://videohub-cdn.b-cdn.net/'
        ];
        
        const isValid = allowedPrefixes.some(prefix => videoUrl.startsWith(prefix));
        if (!isValid) {
            return res.status(400).json({
                error: `Invalid Video URL. Must start with a valid Bunny CDN domain (e.g. ${allowedPrefixes.filter((v, i, a) => a.indexOf(v) === i).join(' or ')})`
            });
        }
    } else if (effectiveSourceType === 'embedded') {
        try {
            new URL(videoUrl);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid Embedded Video URL' });
        }
    }

    try {
        const normalizedCategories = [...new Set(
            categories.map(c => String(c).trim()).filter(Boolean)
        )];

        const updateData = {
            title: title.trim(),
            description: description?.trim() || '',
            category: normalizedCategories[0] || 'Uncategorized',
            videoUrl,
            bunnyUrl: effectiveSourceType === 'bunny' ? videoUrl : '',
            sourceType: sourceType || 'bunny',
            thumbnail: thumbnail?.trim(),
            updatedAt: new Date().toISOString(),
            ...(req.body.status && { status: req.body.status }),
            ...(req.body.uploadType && { uploadType: req.body.uploadType })
        };

        let { data, error } = await supabase
            .from('videohubweb')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error && (error.code === '42703' || error.code === 'PGRST204') && req.body.status) {
            console.warn('Supabase Update Warning: Status column not found, falling back.');
            const fallbackData = { ...updateData };
            delete fallbackData.status;
            
            const fallbackRes = await supabase
                .from('videohubweb')
                .update(fallbackData)
                .eq('id', id)
                .select()
                .single();
            data = fallbackRes.data;
            error = fallbackRes.error;
        }

        if (error) throw error;

        res.json({
            success: true,
            message: 'Video updated successfully',
            video: data
        });
    } catch (err) {
        console.error('Update Error:', err);
        res.status(500).json({ error: 'Failed to update video' });
    }
});

/**
 * DELETE /api/admin/video/:id
 */
router.delete('/video/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('videohubweb')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Video deleted successfully'
        });
    } catch (err) {
        console.error('Delete Error:', err);
        res.status(500).json({ error: 'Failed to delete video' });
    }
});


router.put('/submission/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const { data, error } = await supabase
            .from('submissions')
            .update({ status, updatedAt: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, submission: data });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update submission' });
    }
});

router.delete('/submission/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('submissions')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true, message: 'Submission deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete submission' });
    }
});

/**
 * PUT /api/admin/report/:id
 */
router.put('/report/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'reviewed', 'resolved'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const { data, error } = await supabase
            .from('reports')
            .update({ status, updatedAt: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, report: data });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update report' });
    }
});


router.delete('/report/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('reports')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true, message: 'Report deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete report' });
    }
});

module.exports = router;
