import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { generateVideoThumbnail } from '../../utils/videoThumbnail';

const VideoCard = ({ video }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState(video.thumbnail);

    useEffect(() => {
        if (!video.thumbnail && video.videoUrl) {
            let isMounted = true;
            generateVideoThumbnail(video.videoUrl).then((url) => {
                if (isMounted && url) {
                    setThumbnailUrl(url);
                }
            });
            return () => { isMounted = false; };
        }
    }, [video.thumbnail, video.videoUrl]);

    return (
        <Link to={`/preroll/${video.id}`} style={styles.card}>
            <div style={styles.thumbnailContainer}>
                <img src={thumbnailUrl || 'https://via.placeholder.com/640x360.png?text=Loading...'} alt={video.title} style={styles.thumbnail} />
                <span style={styles.duration}>{video.duration}</span>
                <div style={styles.overlay}>
                    <Play size={40} color="#fff" fill="#fff" />
                </div>
            </div>
            <div style={styles.info}>
                <h3 style={styles.title}>{video.title}</h3>
                <div style={styles.meta}>
                    <span>{video.views} views</span>
                    <span style={styles.dot}>•</span>
                    <span style={styles.rating}>{video.rating}</span>
                </div>
            </div>
        </Link>
    );
};

const styles = {
    card: {
        backgroundColor: 'var(--card-bg)',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s',
    },
    thumbnailContainer: {
        position: 'relative',
        paddingTop: '56.25%', // 16:9
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    thumbnail: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    duration: {
        position: 'absolute',
        bottom: '8px',
        right: '8px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: '#fff',
        padding: '2px 4px',
        borderRadius: '2px',
        fontSize: '12px',
        fontWeight: 'bold',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0,
        transition: 'opacity 0.2s',
    },
    info: {
        padding: '12px',
    },
    title: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#fff',
        marginBottom: '8px',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        lineHeight: '1.4',
    },
    meta: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '13px',
        color: 'var(--text-secondary)',
    },
    dot: {
        margin: '0 6px',
    },
    rating: {
        color: 'var(--accent-color)',
        fontWeight: 'bold',
    }
};

// Add hover styles using JS object logic or just CSS in index.css
// For now, I'll rely on global CSS for some hover effects if needed, 
// but I'll add a hover effect in the style definition if I use a CSS-in-JS library, 
// since I'm using plain objects, I'll add a hover state in a real component if needed.
// But for this task, I'll keep it simple or use a className.

export default VideoCard;
