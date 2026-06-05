// routes/public.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const router = express.Router();

// Configure Multer for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Data managed via Supabase
const supabase = require('../utils/supabase');
const { authMiddleware } = require('../middleware/auth'); // Correct destructuring

// =======================
// PUBLIC VIDEO ROUTES
// =======================

// GET /api/videos - List all videos or filter by category
router.get('/videos', async (req, res) => {
    const category = req.query.category;
    try {
        let query = supabase.from('videohubweb').select('*').order('createdAt', { ascending: false });

        if (category && category.toLowerCase() !== 'all') {
            query = query.ilike('category', `%${category}%`);
        }

        const { data: videos, error } = await query;
        if (error) throw error;

        res.json(videos);
    } catch (err) {
        console.error('Fetch Videos Error:', err);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

// GET /api/video/:id - Get single video details
router.get('/video/:id', async (req, res) => {
    try {
        const { data: video, error } = await supabase
            .from('videohubweb')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !video) return res.status(404).json({ error: 'Video not found' });
        
        // Increment views
        await supabase
            .from('videohubweb')
            .update({ views: (video.views || 0) + 1 })
            .eq('id', req.params.id);

        res.json(video);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch video' });
    }
});

// GET /api/search?q= - Search videos
router.get('/search', async (req, res) => {
    const query = req.query.q?.toLowerCase() || '';
    try {
        const { data: filtered, error } = await supabase
            .from('videohubweb')
            .select('*')
            .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`);

        if (error) throw error;
        res.json(filtered);
    } catch (err) {
        res.status(500).json({ error: 'Search failed' });
    }
});

// GET /api/category/:name - Filter by category
router.get('/category/:name', async (req, res) => {
    const category = req.params.name.toLowerCase();
    try {
        const { data: filtered, error } = await supabase
            .from('videohubweb')
            .select('*')
            .ilike('category', `%${category}%`);

        if (error) throw error;
        res.json(filtered);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch category' });
    }
});

// =======================
// USER INTERACTIONS (LIKES & COMMENTS)
// =======================

// POST /api/video/:id/like
router.post('/video/:id/like', authMiddleware, async (req, res) => {
    const { id } = req.params;
    // Fallback to a zero-UUID if the admin user is logged in (admin token lacks an id)
    const userId = req.user.id || '00000000-0000-0000-0000-000000000000';

    try {
        // Check if already liked
        const { data: existingLike, error: checkError } = await supabase
            .from('likes')
            .select('*')
            .eq('videoId', id)
            .eq('userId', userId)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error("Error checking likes table:", checkError);
        }

        if (existingLike) {
            return res.status(400).json({ error: 'You already liked this video' });
        }

        // Optional tracking: Remove from dislikes if it exists
        const { error: removeDislikeError } = await supabase.from('dislikes').delete().eq('videoId', id).eq('userId', userId);
        if (removeDislikeError && removeDislikeError.code !== 'PGRST205') console.error("Warning removing dislike:", removeDislikeError);

        // Optional tracking: Add like
        const { error: likeError } = await supabase
            .from('likes')
            .insert([{ videoId: id, userId }]);

        if (likeError && likeError.code !== 'PGRST205') {
            // PGRST205 means table not found, we ignore that so it still works
            console.error("Warning inserting like tracking:", likeError);
        }

        // Update like count in video table
        const { data: video } = await supabase.from('videohubweb').select('likes').eq('id', id).single();
        const { error: updateError } = await supabase.from('videohubweb').update({ likes: (video?.likes || 0) + 1 }).eq('id', id);

        if (updateError) {
             console.error("Error updating videohubweb likes:", updateError);
             return res.status(500).json({ error: 'Failed to update like count on video. Make sure "likes" column exists.' });
        }

        res.json({ success: true, message: 'Video liked' });
    } catch (err) {
        console.error('Like Error:', err);
        res.status(500).json({ error: 'Failed to like video' });
    }
});

// POST /api/video/:id/dislike
router.post('/video/:id/dislike', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id || '00000000-0000-0000-0000-000000000000';

    try {
        // Check if already disliked
        const { data: existingDislike, error: checkError } = await supabase
            .from('dislikes')
            .select('*')
            .eq('videoId', id)
            .eq('userId', userId)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error("Error checking dislikes table:", checkError);
        }

        if (existingDislike) {
            return res.status(400).json({ error: 'You already disliked this video' });
        }

        // Optional tracking: Remove like if it exists
        const { error: removeLikeError } = await supabase.from('likes').delete().eq('videoId', id).eq('userId', userId);
        if (removeLikeError && removeLikeError.code !== 'PGRST205') console.error("Warning removing like:", removeLikeError);

        // Optional tracking: Add dislike
        const { error: dislikeError } = await supabase
            .from('dislikes')
            .insert([{ videoId: id, userId }]);

        if (dislikeError && dislikeError.code !== 'PGRST205') {
             console.error("Warning inserting dislike tracking:", dislikeError);
        }

        // Update dislike count in video table
        const { data: video } = await supabase.from('videohubweb').select('dislikes').eq('id', id).single();
        const { error: updateError } = await supabase.from('videohubweb').update({ dislikes: (video?.dislikes || 0) + 1 }).eq('id', id);

        if (updateError) {
             console.error("Error updating videohubweb dislikes:", updateError);
             return res.status(500).json({ error: 'Failed to update dislike count on video. Make sure "dislikes" column exists.' });
        }

        res.json({ success: true, message: 'Video disliked' });
    } catch (err) {
        console.error('Dislike Error:', err);
        res.status(500).json({ error: 'Failed to dislike video' });
    }
});

// POST /api/video/:id/comment
router.post('/video/:id/comment', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user.id || '00000000-0000-0000-0000-000000000000';
    const username = req.user.username;

    if (!text) return res.status(400).json({ error: 'Comment text is required' });

    try {
        const { data: comment, error } = await supabase
            .from('comments')
            .insert([{ 
                videoId: id, 
                userId, 
                username, 
                text, 
                createdAt: new Date().toISOString() 
            }])
            .select()
            .single();

        if (error) throw error;

        // Update comment count in video table
        const { data: video } = await supabase.from('videohubweb').select('comments_count').eq('id', id).single();
        await supabase.from('videohubweb').update({ comments_count: (video.comments_count || 0) + 1 }).eq('id', id);

        res.json({ success: true, comment });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// GET /api/video/:id/comments
router.get('/video/:id/comments', async (req, res) => {
    try {
        const { data: comments, error } = await supabase
            .from('comments')
            .select('*')
            .eq('videoId', req.params.id)
            .order('createdAt', { ascending: false });

        if (error) throw error;
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// =======================
// USER SUBMISSIONS
// =======================

// POST /api/submit-video (Original URL-based)
router.post('/submit-video', authMiddleware, async (req, res) => {
    const { title, description, videoUrl } = req.body;
    const submittedBy = req.user.username;
    const userId = req.user.id;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        const newSubmission = {
            type: 'video',
            title,
            description: description || '',
            videoUrl: videoUrl || '',
            submittedBy,
            userId,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('submissions')
            .insert([newSubmission])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ success: true, submission: data });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save submission' });
    }
});

// POST /api/submit-video-file (New File-based)
router.post('/submit-video-file', authMiddleware, upload.single('video'), async (req, res) => {
    const { title, description } = req.body;
    const file = req.file;
    const submittedBy = req.user.username;
    const userId = req.user.id;

    if (!title || !file) {
        return res.status(400).json({ error: 'Title and Video File are required' });
    }

    try {
        const newSubmission = {
            type: 'video-file',
            title,
            description: description || '',
            filePath: `/uploads/${file.filename}`,
            originalName: file.originalname,
            submittedBy,
            userId,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('submissions')
            .insert([newSubmission])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ success: true, submission: data });
    } catch (err) {
        console.error('File Submission Error:', err);
        res.status(500).json({ error: 'Failed to save file submission' });
    }
});

// POST /api/report
router.post('/report', authMiddleware, async (req, res) => {
    const { type, targetId, reason } = req.body;
    const reportedBy = req.user.username;
    const userId = req.user.id;

    if (!type || !targetId || !reason) {
        return res.status(400).json({ error: 'Type, targetId, and reason are required' });
    }

    try {
        const newReport = {
            type, // 'video' | 'comment'
            targetId,
            reason,
            reportedBy,
            userId,
            status: 'open',
            createdAt: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('reports')
            .insert([newReport])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ success: true, report: data });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save report' });
    }
});

module.exports = router;
