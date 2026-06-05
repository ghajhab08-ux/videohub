const fetch = require('node-fetch');
const fs = require('fs');

/**
 * Uploads a file from disk to Bunny.net Storage using streaming
 * @param {string} filePath - Path to the local file
 * @param {string} fileName - Destination filename
 * @returns {Promise<string>} - The final CDN URL
 */
const uploadToBunnyStorage = async (filePath, fileName) => {
    const storageZone = process.env.BUNNY_STORAGE_ZONE_NAME;
    const accessKey = process.env.BUNNY_STORAGE_API_KEY;
    const baseEndpoint = process.env.BUNNY_STORAGE_ENDPOINT || 'https://storage.bunnycdn.com';

    const endpoint = `${baseEndpoint}/${storageZone}/pvideos/${fileName}`;

    try {
        console.log(`Starting stream upload to Bunny: ${fileName}`);

        // Use fs.createReadStream for memory-efficient streaming
        const fileStream = fs.createReadStream(filePath);

        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'AccessKey': accessKey,
                'Content-Type': 'application/octet-stream',
            },
            body: fileStream // node-fetch supports readable streams as body
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Bunny Storage Error: ${response.status} ${errorText}`);
        }

        console.log(`Upload successful: ${fileName}`);

        // Return the CDN URL
        // Format: https://{pull-zone-hostname}/pvideos/{filename}
        return `${process.env.BUNNY_PULL_ZONE}/pvideos/${fileName}`;
    } catch (err) {
        console.error('Bunny Storage Upload Failed:', err);
        throw err;
    }
};

module.exports = { uploadToBunnyStorage };

