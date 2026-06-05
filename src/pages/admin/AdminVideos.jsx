import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Edit, Trash2, X, AlertCircle, Save } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';



const AdminVideos = () => {
    const { token } = useAuth();
    const [videos, setVideos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingVideo, setEditingVideo] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchVideos();
    }, [token]);

    const fetchVideos = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/admin/videos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setVideos(Array.isArray(data) ? data : []);
            setIsLoading(false);
        } catch (err) {
            console.error('Fetch videos error:', err);
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this video?')) return;

        try {
            const res = await fetch(`${API_BASE}/api/admin/video/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setVideos(prev => prev.filter(v => v.id !== id));
                // Optional: success notification
            } else {
                const data = await res.json();
                alert(data.error || 'Delete failed');
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('A network error occurred. Please try again.');
        }
    };

    const handleEdit = (video) => {
        setEditingVideo({ ...video });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/api/admin/video/${editingVideo.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editingVideo)
            });

            const data = await res.json();
            if (res.ok) {
                setVideos(videos.map(v => v.id === editingVideo.id ? data.video : v));
                setEditingVideo(null);
            } else {
                setError(data.error || 'Update failed');
            }
        } catch (err) {
            console.error('Update error:', err);
            setError('Something went wrong');
        }
    };

    const toggleCategory = (cat) => {
        if (cat === 'All') return;
        const currentCats = editingVideo.categories || [];
        const newCats = currentCats.includes(cat)
            ? currentCats.filter(c => c !== cat)
            : [...currentCats, cat];
        setEditingVideo({ ...editingVideo, categories: newCats });
    };

    return (
        <AdminLayout>
            <div style={styles.container}>
                <h1 style={styles.pageTitle}>Manage Videos</h1>

                {isLoading ? (
                    <p>Loading videos...</p>
                ) : (
                    <div style={styles.videoList}>
                        {videos.map(video => (
                            <div key={video.id} style={styles.videoItem}>
                                <img src={video.thumbnail} alt={video.title} style={styles.thumb} />
                                <div style={styles.details}>
                                    <h3 style={styles.title}>{video.title}</h3>
                                    <p style={styles.meta}>
                                        {video.categories?.join(', ')} • {new Date(video.createdAt).toLocaleDateString()}
                                        <span style={{
                                            marginLeft: '8px',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: video.status === 'published' ? '#4caf5020' : '#ffa50020',
                                            color: video.status === 'published' ? '#4caf50' : '#ffa500',
                                            fontSize: '11px'
                                        }}>
                                            {video.status ? video.status.toUpperCase() : 'PUBLISHED'}
                                        </span>
                                    </p>
                                </div>
                                <div style={styles.actions}>
                                    <button onClick={() => handleEdit(video)} style={styles.editBtn} title="Edit">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(video.id)} style={styles.deleteBtn} title="Delete">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {editingVideo && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modal}>
                            <div style={styles.modalHeader}>
                                <h2>Edit Video</h2>
                                <button onClick={() => setEditingVideo(null)} style={styles.closeBtn}><X /></button>
                            </div>
                            <form onSubmit={handleUpdate} style={styles.form}>
                                <label style={styles.label}>Title</label>
                                <input
                                    style={styles.input}
                                    value={editingVideo.title}
                                    onChange={e => setEditingVideo({ ...editingVideo, title: e.target.value })}
                                />

                                <label style={styles.label}>Video Source</label>
                                <select
                                    style={styles.input}
                                    value={editingVideo.sourceType || 'bunny'}
                                    onChange={e => setEditingVideo({ ...editingVideo, sourceType: e.target.value })}
                                >
                                    <option value="bunny">Bunny (CDN)</option>
                                    <option value="embedded">Embedded (YouTube, Vimeo, etc.)</option>
                                </select>

                                <label style={styles.label}>
                                    {editingVideo.sourceType === 'embedded' ? 'Video Link (Embed/URL)' : 'Video URL'}
                                </label>
                                <input
                                    style={styles.input}
                                    value={editingVideo.videoUrl}
                                    onChange={e => setEditingVideo({ ...editingVideo, videoUrl: e.target.value })}
                                />

                                <label style={styles.label}>Thumbnail URL</label>
                                <input
                                    style={styles.input}
                                    value={editingVideo.thumbnail}
                                    onChange={e => setEditingVideo({ ...editingVideo, thumbnail: e.target.value })}
                                />

                                <label style={styles.label}>Status</label>
                                <select
                                    style={styles.input}
                                    value={editingVideo.status || 'published'}
                                    onChange={e => setEditingVideo({ ...editingVideo, status: e.target.value })}
                                >
                                    <option value="published">Published</option>
                                    <option value="draft">Draft</option>
                                    <option value="unlisted">Unlisted</option>
                                </select>

                                <label style={styles.label}>Categories</label>
                                <div style={styles.categoryGrid}>
                                    {CATEGORIES.filter(c => c !== 'All').map(cat => (
                                        <label key={cat} style={styles.checkboxLabel}>
                                            <input
                                                type="checkbox"
                                                checked={editingVideo.categories?.includes(cat)}
                                                onChange={() => toggleCategory(cat)}
                                            />
                                            <span>{cat}</span>
                                        </label>
                                    ))}
                                </div>

                                <label style={styles.label}>Description</label>
                                <textarea
                                    style={styles.textarea}
                                    value={editingVideo.description}
                                    onChange={e => setEditingVideo({ ...editingVideo, description: e.target.value })}
                                />

                                {error && <div style={styles.error}><AlertCircle size={16} /> {error}</div>}

                                <button type="submit" style={styles.saveBtn}>
                                    <Save size={18} /> Save Changes
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

const styles = {
    container: { maxWidth: '1000px' },
    pageTitle: { fontSize: '26px', marginBottom: '24px' },
    videoList: { display: 'flex', flexDirection: 'column', gap: '15px' },
    videoItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '15px',
        background: '#111',
        borderRadius: '10px',
        gap: '20px',
        flexWrap: 'wrap',
    },
    thumb: { 
        width: '120px', 
        height: '68px', 
        objectFit: 'cover', 
        borderRadius: '4px',
        minWidth: '120px',
    },
    details: { 
        flex: 1,
        minWidth: '200px',
    },
    title: { fontSize: '16px', marginBottom: '4px', wordBreak: 'break-word' },
    meta: { fontSize: '12px', color: '#666' },
    actions: { display: 'flex', gap: '10px' },
    editBtn: { color: '#aaa', padding: '8px' },
    deleteBtn: { color: '#ff4444', padding: '8px' },
    modalOverlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    modal: {
        background: '#111',
        padding: '20px',
        borderRadius: '12px',
        width: '95%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        margin: '20px auto',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
    },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    label: { fontSize: '13px', color: '#aaa' },
    input: { padding: '10px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '6px' },
    textarea: { minHeight: '100px', padding: '10px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '6px' },
    categoryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
        gap: '8px',
        padding: '12px',
        background: '#000',
        border: '1px solid #333',
        borderRadius: '6px'
    },
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' },
    saveBtn: {
        marginTop: '10px',
        padding: '12px',
        background: 'var(--accent-color)',
        color: '#000',
        fontWeight: 'bold',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
    },
    closeBtn: { color: '#aaa' },
    error: { color: '#ff4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }
};

export default AdminVideos;
