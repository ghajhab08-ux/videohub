export const generateVideoThumbnail = (videoUrl) => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.crossOrigin = 'anonymous'; // Important to avoid CORS issues with canvas
        video.muted = true;
        video.preload = 'metadata';

        video.addEventListener('loadedmetadata', () => {
            // Pick a random time between 10% and 90% of the video duration
            // This avoids pure black screens that often appear at the very beginning or end
            const randomTime = video.duration * (0.1 + Math.random() * 0.8);
            video.currentTime = randomTime;
        });

        video.addEventListener('seeked', () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            try {
                const dataUrl = canvas.toDataURL('image/jpeg');
                resolve(dataUrl);
            } catch (err) {
                console.error("Failed to extract frame due to CORS or other error", err);
                resolve(null);
            }
        });

        video.addEventListener('error', (err) => {
            console.error("Error loading video for thumbnail", err);
            resolve(null);
        });
    });
};
