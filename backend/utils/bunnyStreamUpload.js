const fetch = require('node-fetch');
const fs = require('fs');
const { createBunnyUploadSession } = require('./bunny');

/**
 * Uploads a local file to Bunny Stream
 * @param {string} filePath - Path to local file
 * @param {string} title - Title of the video
 * @returns {Promise<Object>} - The Bunny video details
 */
const uploadToBunnyStream = async (filePath, title) => {
    try {
        // 1. Create a video object in Bunny Stream
        const session = await createBunnyUploadSession(title);
        const { videoId, libraryId } = session;

        // 2. Upload the file
        const apiKey = process.env.BUNNY_API_KEY;
        const uploadEndpoint = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`;

        console.log(`Starting stream upload to Bunny Stream: ${videoId}`);
        const fileStream = fs.createReadStream(filePath);

        const response = await fetch(uploadEndpoint, {
            method: 'PUT',
            headers: {
                'AccessKey': apiKey,
                'Content-Type': 'application/octet-stream',
            },
            body: fileStream
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Bunny Stream Error: ${response.status} ${errorText}`);
        }

        console.log(`Upload successful: ${videoId}`);

        // Construct URLs
        const pullZone = process.env.BUNNY_PULL_ZONE || 'https://videohub-cdn.b-cdn.net';
        const baseUrl = pullZone.endsWith('/') ? pullZone.slice(0, -1) : pullZone;

        return {
            videoId,
            guid: videoId,
            playbackUrl: `${baseUrl}/${videoId}/playlist.m3u8`,
            embedUrl: `https://video.bunnycdn.com/play/${libraryId}/${videoId}`,
            thumbnailUrl: `${baseUrl}/${videoId}/thumbnail.jpg`
        };
    } catch (err) {
        console.error('Bunny Stream Upload Failed:', err);
        throw err;
    }
};

module.exports = { uploadToBunnyStream };
