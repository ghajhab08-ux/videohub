import React, { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';



const AdminUpload = () => {
    const { user } = useAuth();
    const token = user?.token;

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        categories: [],
        thumbnail: '',
        videoUrl: '',
        sourceType: 'bunny'
    });

    const [uploadStatus, setUploadStatus] = useState('idle');
    const [error, setError] = useState('');

    const handleCategoryToggle = (cat) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.includes(cat)
                ? prev.categories.filter(c => c !== cat)
                : [...prev.categories, cat]
        }));
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!formData.title || !formData.videoUrl || formData.categories.length === 0) {
            return setError('Title, at least one Category, and Video URL are required');
        }

        if (formData.sourceType === 'bunny') {
            const allowedPrefixes = [
                'https://pvideos-cdn.b-cdn.net/',
                'https://videohub-cdn.b-cdn.net/'
            ];
            const isValid = allowedPrefixes.some(prefix => formData.videoUrl.startsWith(prefix));
            if (!isValid) {
                return setError(`Video URL must start with a valid Bunny CDN domain (e.g. ${allowedPrefixes.join(' or ')})`);
            }
        } else if (formData.sourceType === 'embedded') {
            try {
                new URL(formData.videoUrl);
            } catch (e) {
                return setError('Please enter a valid Video URL');
            }
        }

        try {
            setUploadStatus('submitting');
            setError('');

            const res = await fetch(`${API_BASE}/api/admin/upload-video`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            setUploadStatus('success');
        } catch (err) {
            setError(err.message || 'Upload failed');
            setUploadStatus('error');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            categories: [],
            thumbnail: '',
            videoUrl: '',
            sourceType: 'bunny'
        });
        setUploadStatus('idle');
        setError('');
    };

    return (
        <AdminLayout>
            <div style={styles.container}>
                <h1 style={styles.pageTitle}>Publish New Video</h1>

                {uploadStatus === 'success' ? (
                    <div style={styles.successCard}>
                        <CheckCircle size={64} color="#4caf50" />
                        <h2>Video Published</h2>
                        <p>Your video is now live.</p>
                        <button onClick={resetForm} style={styles.resetBtn}>
                            Publish Another
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleUpload} style={styles.uploadCard}>
                        <label style={styles.label}>Video Source *</label>
                        <select
                            style={styles.input}
                            value={formData.sourceType}
                            onChange={e => setFormData({ ...formData, sourceType: e.target.value })}
                        >
                            <option value="bunny">Bunny (CDN)</option>
                            <option value="embedded">Embedded (YouTube, Vimeo, etc.)</option>
                        </select>

                        <label style={styles.label}>Title *</label>
                        <input
                            style={styles.input}
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />

                        <label style={styles.label}>
                            {formData.sourceType === 'bunny' ? 'Bunny Video URL *' : 'Video Link (Embed/URL) *'}
                        </label>
                        <input
                            style={styles.input}
                            placeholder={formData.sourceType === 'bunny' 
                                ? "https://videohub-cdn.b-cdn.net/video.mp4" 
                                : "https://www.youtube.com/watch?v=..."
                            }
                            value={formData.videoUrl}
                            onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                        />

                        <label style={styles.label}>Select Categories *</label>
                        <div style={styles.categoryGrid}>
                            {CATEGORIES.filter(c => c !== 'All').map(cat => (
                                <label key={cat} style={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formData.categories.includes(cat)}
                                        onChange={() => handleCategoryToggle(cat)}
                                    />
                                    <span>{cat}</span>
                                </label>
                            ))}
                        </div>

                        <label style={styles.label}>Thumbnail URL (optional)</label>
                        <input
                            style={styles.input}
                            value={formData.thumbnail}
                            onChange={e => setFormData({ ...formData, thumbnail: e.target.value })}
                        />

                        <label style={styles.label}>Description</label>
                        <textarea
                            style={styles.textarea}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />

                        {error && (
                            <div style={styles.errorBox}>
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={uploadStatus === 'submitting'}
                            style={styles.submitBtn}
                        >
                            {uploadStatus === 'submitting' ? 'Publishing…' : 'Submit & Publish'}
                        </button>
                    </form>
                )}
            </div>
        </AdminLayout>
    );
};

const styles = {
    container: { maxWidth: '700px' },
    pageTitle: { fontSize: '26px', marginBottom: '24px' },
    uploadCard: {
        background: '#111',
        padding: '24px',
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    label: { color: '#aaa', fontSize: '13px' },
    input: {
        padding: '10px',
        background: '#000',
        border: '1px solid #333',
        color: '#fff',
        borderRadius: '6px'
    },
    textarea: {
        minHeight: '120px',
        padding: '10px',
        background: '#000',
        border: '1px solid #333',
        color: '#fff',
        borderRadius: '6px'
    },
    categoryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '10px',
        padding: '15px',
        background: '#000',
        borderRadius: '6px',
        border: '1px solid #333'
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#fff'
    },
    submitBtn: {
        marginTop: '20px',
        padding: '14px',
        fontWeight: 'bold',
        background: 'var(--accent-color)',
        color: '#000',
        borderRadius: '8px'
    },
    errorBox: {
        marginTop: '12px',
        padding: '10px',
        background: 'rgba(255,0,0,0.1)',
        color: '#ff5555',
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
    },
    successCard: {
        padding: '50px',
        background: '#111',
        borderRadius: '12px',
        textAlign: 'center'
    },
    resetBtn: {
        marginTop: '16px',
        padding: '10px 20px',
        background: '#333',
        borderRadius: '6px'
    }
};

export default AdminUpload;
