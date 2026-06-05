import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { CheckCircle, AlertCircle, UploadCloud } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';

const AdminUpload = () => {
    const { user } = useAuth();
    const token = user?.token;
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        categories: [],
        thumbnail: '',
        videoUrl: '', // only used if sourceType is embedded
        sourceType: 'bunny',
        status: 'published'
    });
    
    const [videoFile, setVideoFile] = useState(null);
    const [bunnyUploadType, setBunnyUploadType] = useState('file');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('idle');
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleCategoryToggle = (cat) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.includes(cat)
                ? prev.categories.filter(c => c !== cat)
                : [...prev.categories, cat]
        }));
    };

    const handleUpload = (e) => {
        e.preventDefault();

        if (!formData.title) {
            return setError('Title is required');
        }

        if (formData.sourceType === 'bunny') {
            if (bunnyUploadType === 'file' && !videoFile) {
                return setError('Please select a video file to upload');
            }
            if (bunnyUploadType === 'url') {
                if (!formData.videoUrl) return setError('Bunny Video URL is required');
                try {
                    new URL(formData.videoUrl);
                } catch (e) {
                    return setError('Please enter a valid Video URL');
                }
                uploadEmbedded();
                return;
            }
        }

        if (formData.sourceType === 'embedded') {
            if (!formData.videoUrl) return setError('Video URL is required for embedded videos');
            try {
                new URL(formData.videoUrl);
            } catch (e) {
                return setError('Please enter a valid Video URL');
            }
            
            // Handle embedded upload with fetch (no file)
            uploadEmbedded();
            return;
        }

        // Handle Bunny file upload with XMLHttpRequest for progress
        setUploadStatus('submitting');
        setError('');
        setUploadProgress(0);

        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('categories', JSON.stringify(formData.categories));
        data.append('thumbnail', formData.thumbnail);
        data.append('status', formData.status);
        data.append('file', videoFile);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/api/admin/upload-video-file`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                setUploadStatus('success');
                // Redirect after brief delay
                setTimeout(() => navigate('/admin/videos'), 2000);
            } else {
                let errMessage = 'Upload failed';
                try {
                    const response = JSON.parse(xhr.responseText);
                    errMessage = response.error || errMessage;
                } catch(e){}
                setError(errMessage);
                setUploadStatus('error');
            }
        };

        xhr.onerror = () => {
            setError('Network error occurred during upload');
            setUploadStatus('error');
        };

        xhr.send(data);
    };

    const uploadEmbedded = async () => {
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
            setTimeout(() => navigate('/admin/videos'), 2000);
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
            sourceType: 'bunny',
            status: 'published'
        });
        setVideoFile(null);
        setBunnyUploadType('file');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setUploadStatus('idle');
        setError('');
        setUploadProgress(0);
    };

    return (
        <AdminLayout>
            <div style={styles.container}>
                <h1 style={styles.pageTitle}>Publish New Video</h1>

                {uploadStatus === 'success' ? (
                    <div style={styles.successCard}>
                        <CheckCircle size={64} color="#4caf50" />
                        <h2>Video Published</h2>
                        <p>Your video is now live. Redirecting to videos list...</p>
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
                            disabled={uploadStatus === 'submitting'}
                        >
                            <option value="bunny">Upload to Bunny (CDN)</option>
                            <option value="embedded">Embedded (YouTube, Vimeo, etc.)</option>
                        </select>

                        <label style={styles.label}>Title *</label>
                        <input
                            style={styles.input}
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            disabled={uploadStatus === 'submitting'}
                        />

                        {formData.sourceType === 'bunny' ? (
                            <>
                                <label style={styles.label}>Upload Method *</label>
                                <select
                                    style={{...styles.input, marginBottom: '12px'}}
                                    value={bunnyUploadType}
                                    onChange={e => setBunnyUploadType(e.target.value)}
                                    disabled={uploadStatus === 'submitting'}
                                >
                                    <option value="file">Choose file</option>
                                    <option value="url">From URL</option>
                                </select>

                                {bunnyUploadType === 'file' ? (
                                    <>
                                        <label style={styles.label}>Select Video File *</label>
                                        <div style={styles.fileInputContainer}>
                                            <input
                                                type="file"
                                                accept="video/*"
                                                onChange={e => setVideoFile(e.target.files[0])}
                                                ref={fileInputRef}
                                                disabled={uploadStatus === 'submitting'}
                                                style={styles.fileInput}
                                            />
                                            {videoFile && <span style={{color: '#aaa', fontSize: 13}}>Selected: {videoFile.name}</span>}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <label style={styles.label}>Bunny Video URL *</label>
                                        <input
                                            style={styles.input}
                                            placeholder="https://videohub-cdn.b-cdn.net/..."
                                            value={formData.videoUrl}
                                            onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                                            disabled={uploadStatus === 'submitting'}
                                        />
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <label style={styles.label}>Video Link (Embed/URL) *</label>
                                <input
                                    style={styles.input}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    value={formData.videoUrl}
                                    onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                                    disabled={uploadStatus === 'submitting'}
                                />
                            </>
                        )}

                        <label style={styles.label}>Status</label>
                        <select
                            style={styles.input}
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            disabled={uploadStatus === 'submitting'}
                        >
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                            <option value="unlisted">Unlisted</option>
                        </select>

                        <label style={styles.label}>Select Categories (Optional)</label>
                        <div style={styles.categoryGrid}>
                            {CATEGORIES.filter(c => c !== 'All').map(cat => (
                                <label key={cat} style={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formData.categories.includes(cat)}
                                        onChange={() => handleCategoryToggle(cat)}
                                        disabled={uploadStatus === 'submitting'}
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
                            disabled={uploadStatus === 'submitting'}
                        />

                        <label style={styles.label}>Description</label>
                        <textarea
                            style={styles.textarea}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            disabled={uploadStatus === 'submitting'}
                        />

                        {error && (
                            <div style={styles.errorBox}>
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        {uploadStatus === 'submitting' && formData.sourceType === 'bunny' && bunnyUploadType === 'file' && (
                            <div style={styles.progressContainer}>
                                <div style={{...styles.progressBar, width: `${uploadProgress}%`}}></div>
                                <span style={styles.progressText}>
                                    {uploadProgress === 100 ? 'Processing...' : `Uploading... ${uploadProgress}%`}
                                </span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={uploadStatus === 'submitting'}
                            style={{
                                ...styles.submitBtn,
                                opacity: uploadStatus === 'submitting' ? 0.6 : 1
                            }}
                        >
                            <UploadCloud size={18} style={{marginRight: '8px', verticalAlign: 'middle'}}/>
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
    fileInputContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '10px',
        background: '#000',
        border: '1px dashed #555',
        borderRadius: '6px'
    },
    fileInput: {
        color: '#fff'
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
        color: '#fff',
        cursor: 'pointer'
    },
    submitBtn: {
        marginTop: '20px',
        padding: '14px',
        fontWeight: 'bold',
        background: 'var(--accent-color)',
        color: '#000',
        borderRadius: '8px',
        cursor: 'pointer',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    errorBox: {
        marginTop: '12px',
        padding: '10px',
        background: 'rgba(255,0,0,0.1)',
        color: '#ff5555',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        borderRadius: '6px'
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
        color: '#fff',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer'
    },
    progressContainer: {
        marginTop: '10px',
        width: '100%',
        background: '#222',
        borderRadius: '10px',
        overflow: 'hidden',
        position: 'relative',
        height: '24px'
    },
    progressBar: {
        height: '100%',
        background: 'var(--accent-color)',
        transition: 'width 0.3s ease'
    },
    progressText: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '12px',
        color: '#fff',
        fontWeight: 'bold',
        mixBlendMode: 'difference'
    }
};

export default AdminUpload;
