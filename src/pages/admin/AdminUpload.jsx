import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { CheckCircle, AlertCircle, UploadCloud, X, Film, Folder, Trash2 } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';

const SUPPORTED_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv', '.avi'];

const AdminUpload = () => {
    const { user } = useAuth();
    const token = user?.token;
    const navigate = useNavigate();

    const [uploadMode, setUploadMode] = useState('single'); // url, single, bulk, folder
    const [urlSourceType, setUrlSourceType] = useState('bunny'); // bunny or embedded

    // Global form data (applies to all modes, but bulk/folder will auto-generate titles)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        categories: [],
        thumbnail: '',
        videoUrl: '',
        status: 'published'
    });
    
    const [videoFile, setVideoFile] = useState(null); // For single mode
    const [filesQueue, setFilesQueue] = useState([]); // For bulk/folder mode
    const [uploadStatus, setUploadStatus] = useState('idle'); // idle, submitting, success, error
    const [error, setError] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0); // overall or single progress
    
    const fileInputRef = useRef(null);
    const bulkFolderInputRef = useRef(null);

    const handleCategoryToggle = (cat) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.includes(cat)
                ? prev.categories.filter(c => c !== cat)
                : [...prev.categories, cat]
        }));
    };

    const generateTitle = (filename) => {
        let name = filename.substring(0, filename.lastIndexOf('.')) || filename;
        name = name.replace(/[-_]/g, ' ');
        return name.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    };

    const isFileSupported = (file) => {
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        return SUPPORTED_EXTENSIONS.includes(ext);
    };

    const handleFileSelection = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        if (uploadMode === 'single') {
            const file = selectedFiles[0];
            if (!isFileSupported(file)) return setError('Unsupported file format');
            setVideoFile(file);
            if (!formData.title) setFormData({ ...formData, title: generateTitle(file.name) });
            setError('');
        } else {
            // bulk or folder
            const validFiles = selectedFiles.filter(isFileSupported);
            if (validFiles.length === 0) return setError('No supported video files found.');
            
            const newQueue = validFiles.map((file, index) => ({
                id: `${Date.now()}-${index}`,
                file,
                title: generateTitle(file.name),
                progress: 0,
                status: 'pending', // pending, uploading, success, error
                errorMsg: ''
            }));
            
            setFilesQueue(prev => [...prev, ...newQueue]);
            setError('');
        }
        if (e.target) e.target.value = null; // reset
    };

    const removeFileFromQueue = (id) => {
        setFilesQueue(prev => prev.filter(f => f.id !== id));
    };

    // Drag and Drop Handlers
    const [isDragging, setIsDragging] = useState(false);
    
    const onDragOver = (e) => {
        e.preventDefault();
        if (uploadMode === 'single' || uploadMode === 'bulk') {
            setIsDragging(true);
        }
    };
    
    const onDragLeave = () => setIsDragging(false);
    
    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (uploadMode === 'single' || uploadMode === 'bulk') {
            const mockEvent = { target: { files: e.dataTransfer.files } };
            handleFileSelection(mockEvent);
        }
    };

    // Upload Handlers
    const uploadSingleFile = (file, customTitle) => {
        return new Promise((resolve, reject) => {
            const data = new FormData();
            data.append('title', customTitle || formData.title);
            data.append('description', formData.description);
            data.append('categories', JSON.stringify(formData.categories));
            data.append('thumbnail', formData.thumbnail);
            data.append('status', formData.status);
            data.append('uploadType', uploadMode);
            data.append('file', file);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_BASE}/api/admin/upload-video-file`, true);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    if (uploadMode === 'single') {
                        setUploadProgress(percentComplete);
                    } else {
                        // Update individual progress
                        setFilesQueue(prev => prev.map(f => 
                            f.file === file ? { ...f, progress: percentComplete } : f
                        ));
                    }
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    let errMessage = 'Upload failed';
                    try {
                        errMessage = JSON.parse(xhr.responseText).error || errMessage;
                    } catch(e){}
                    reject(new Error(errMessage));
                }
            };

            xhr.onerror = () => reject(new Error('Network error occurred'));
            xhr.send(data);
        });
    };

    const uploadUrl = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/upload-video`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    sourceType: urlSourceType,
                    uploadType: 'url'
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            return data;
        } catch (err) {
            throw err;
        }
    };

    const processBulkQueue = async () => {
        setUploadStatus('submitting');
        let allSuccess = true;
        
        for (let i = 0; i < filesQueue.length; i++) {
            const item = filesQueue[i];
            if (item.status === 'success') continue;

            setFilesQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f));

            try {
                await uploadSingleFile(item.file, item.title);
                setFilesQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'success', progress: 100 } : f));
            } catch (err) {
                console.error(err);
                allSuccess = false;
                setFilesQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', errorMsg: err.message } : f));
            }
        }

        if (allSuccess) {
            setUploadStatus('success');
            setTimeout(() => navigate('/admin/videos'), 2000);
        } else {
            setUploadStatus('idle'); // allow user to retry failed ones
            setError('Some uploads failed. Please review the queue and retry.');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setError('');

        if (uploadMode === 'url') {
            if (!formData.title) return setError('Title is required');
            if (!formData.videoUrl) return setError('Video URL is required');
            try { new URL(formData.videoUrl); } catch(e) { return setError('Invalid Video URL'); }
            
            setUploadStatus('submitting');
            try {
                await uploadUrl();
                setUploadStatus('success');
                setTimeout(() => navigate('/admin/videos'), 2000);
            } catch (err) {
                setError(err.message);
                setUploadStatus('error');
            }
            return;
        }

        if (uploadMode === 'single') {
            if (!formData.title) return setError('Title is required');
            if (!videoFile) return setError('Please select a video file');
            
            setUploadStatus('submitting');
            setUploadProgress(0);
            try {
                await uploadSingleFile(videoFile, formData.title);
                setUploadStatus('success');
                setTimeout(() => navigate('/admin/videos'), 2000);
            } catch (err) {
                setError(err.message);
                setUploadStatus('error');
            }
            return;
        }

        if (uploadMode === 'bulk' || uploadMode === 'folder') {
            if (filesQueue.length === 0) return setError('No files selected');
            // If they are all success already
            if (filesQueue.every(f => f.status === 'success')) return navigate('/admin/videos');
            
            await processBulkQueue();
            return;
        }
    };

    const resetForm = () => {
        setFormData({ title: '', description: '', categories: [], thumbnail: '', videoUrl: '', status: 'published' });
        setVideoFile(null);
        setFilesQueue([]);
        setUploadStatus('idle');
        setError('');
        setUploadProgress(0);
    };

    return (
        <AdminLayout>
            <div style={styles.container}>
                <h1 style={styles.pageTitle}>Publish New Video</h1>

                {uploadStatus === 'success' && uploadMode !== 'bulk' && uploadMode !== 'folder' ? (
                    <div style={styles.successCard}>
                        <CheckCircle size={64} color="#4caf50" />
                        <h2>Video Published</h2>
                        <p>Your video is now live. Redirecting...</p>
                        <button onClick={resetForm} style={styles.resetBtn}>Publish Another</button>
                    </div>
                ) : (
                    <form onSubmit={handleUpload} style={styles.uploadCard}>
                        <label style={styles.label}>Video Source *</label>
                        <select
                            style={styles.input}
                            value={uploadMode}
                            onChange={e => {
                                setUploadMode(e.target.value);
                                setError('');
                            }}
                            disabled={uploadStatus === 'submitting'}
                        >
                            <option value="url">Share via URL</option>
                            <option value="single">Upload from Storage</option>
                            <option value="bulk">Bulk Upload Videos</option>
                            <option value="folder">Upload Folder</option>
                        </select>

                        {/* URL Mode UI */}
                        {uploadMode === 'url' && (
                            <>
                                <label style={styles.label}>URL Type</label>
                                <select 
                                    style={styles.input} 
                                    value={urlSourceType} 
                                    onChange={e => setUrlSourceType(e.target.value)}
                                    disabled={uploadStatus === 'submitting'}
                                >
                                    <option value="bunny">Bunny CDN</option>
                                    <option value="embedded">Embedded (YouTube, Vimeo)</option>
                                </select>

                                <label style={styles.label}>Video Link *</label>
                                <input
                                    style={styles.input}
                                    placeholder="https://..."
                                    value={formData.videoUrl}
                                    onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                                    disabled={uploadStatus === 'submitting'}
                                />
                            </>
                        )}

                        {/* Single Upload UI */}
                        {uploadMode === 'single' && (
                            <>
                                <label style={styles.label}>Select Video File *</label>
                                <div 
                                    style={{...styles.fileDropZone, borderColor: isDragging ? 'var(--accent-color)' : '#555'}}
                                    onDragOver={onDragOver}
                                    onDragLeave={onDragLeave}
                                    onDrop={onDrop}
                                    onClick={() => fileInputRef.current.click()}
                                >
                                    <UploadCloud size={32} color="#aaa" />
                                    <p style={{margin: '10px 0', color: '#fff'}}>{isDragging ? 'Drop video here' : 'Drag & Drop or Click to Select'}</p>
                                    {videoFile && <span style={{color: '#4caf50'}}>{videoFile.name}</span>}
                                    <input
                                        type="file"
                                        accept={SUPPORTED_EXTENSIONS.join(',')}
                                        onChange={handleFileSelection}
                                        ref={fileInputRef}
                                        style={{display: 'none'}}
                                        disabled={uploadStatus === 'submitting'}
                                    />
                                </div>
                            </>
                        )}

                        {/* Bulk / Folder Upload UI */}
                        {(uploadMode === 'bulk' || uploadMode === 'folder') && (
                            <>
                                <label style={styles.label}>Select {uploadMode === 'bulk' ? 'Videos' : 'Folder'} *</label>
                                <div 
                                    style={{...styles.fileDropZone, borderColor: isDragging ? 'var(--accent-color)' : '#555'}}
                                    onDragOver={uploadMode === 'bulk' ? onDragOver : null}
                                    onDragLeave={uploadMode === 'bulk' ? onDragLeave : null}
                                    onDrop={uploadMode === 'bulk' ? onDrop : null}
                                    onClick={() => bulkFolderInputRef.current.click()}
                                >
                                    {uploadMode === 'bulk' ? <Film size={32} color="#aaa" /> : <Folder size={32} color="#aaa" />}
                                    <p style={{margin: '10px 0', color: '#fff'}}>
                                        {uploadMode === 'bulk' ? 'Drag & Drop multiple files or Click to Select' : 'Click to Select Folder'}
                                    </p>
                                    <input
                                        type="file"
                                        accept={SUPPORTED_EXTENSIONS.join(',')}
                                        multiple={uploadMode === 'bulk'}
                                        webkitdirectory={uploadMode === 'folder' ? "true" : undefined}
                                        directory={uploadMode === 'folder' ? "true" : undefined}
                                        onChange={handleFileSelection}
                                        ref={bulkFolderInputRef}
                                        style={{display: 'none'}}
                                        disabled={uploadStatus === 'submitting'}
                                    />
                                </div>

                                {filesQueue.length > 0 && (
                                    <div style={styles.queueContainer}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 10}}>
                                            <h3 style={{fontSize: 16, color: '#fff', margin: 0}}>Upload Queue ({filesQueue.length})</h3>
                                            {uploadStatus !== 'submitting' && (
                                                <button type="button" onClick={() => setFilesQueue([])} style={styles.clearBtn}>Clear All</button>
                                            )}
                                        </div>
                                        {filesQueue.map((item) => (
                                            <div key={item.id} style={styles.queueItem}>
                                                <div style={styles.queueItemHeader}>
                                                    <div style={{display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden'}}>
                                                        <Film size={16} color="#aaa" style={{flexShrink: 0}} />
                                                        <div style={{display: 'flex', flexDirection: 'column'}}>
                                                            <span style={{color: '#fff', fontSize: 14}}>{item.title}</span>
                                                            <span style={{color: '#777', fontSize: 12}}>{item.file.name}</span>
                                                        </div>
                                                    </div>
                                                    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                                                        <span style={{fontSize: 12, color: item.status === 'success' ? '#4caf50' : item.status === 'error' ? '#ff5555' : '#aaa'}}>
                                                            {item.status.toUpperCase()}
                                                        </span>
                                                        {item.status !== 'uploading' && item.status !== 'success' && (
                                                            <button type="button" onClick={() => removeFileFromQueue(item.id)} style={styles.iconBtn}>
                                                                <Trash2 size={16} color="#ff5555" />
                                                            </button>
                                                        )}
                                                        {item.status === 'success' && <CheckCircle size={16} color="#4caf50" />}
                                                    </div>
                                                </div>
                                                {item.status === 'uploading' && (
                                                    <div style={styles.miniProgressContainer}>
                                                        <div style={{...styles.miniProgressBar, width: `${item.progress}%`}}></div>
                                                    </div>
                                                )}
                                                {item.errorMsg && <p style={{color: '#ff5555', fontSize: 12, margin: '5px 0 0 0'}}>{item.errorMsg}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Title (Only for URL and Single) */}
                        {(uploadMode === 'url' || uploadMode === 'single') && (
                            <>
                                <label style={styles.label}>Title *</label>
                                <input
                                    style={styles.input}
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    disabled={uploadStatus === 'submitting'}
                                />
                            </>
                        )}

                        <label style={styles.label}>Status (Applies to all)</label>
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

                        {(uploadMode === 'url' || uploadMode === 'single') && (
                            <>
                                <label style={styles.label}>Thumbnail URL (optional)</label>
                                <input
                                    style={styles.input}
                                    value={formData.thumbnail}
                                    onChange={e => setFormData({ ...formData, thumbnail: e.target.value })}
                                    disabled={uploadStatus === 'submitting'}
                                />
                            </>
                        )}

                        <label style={styles.label}>Description {uploadMode === 'bulk' || uploadMode === 'folder' ? '(Applied to all)' : ''}</label>
                        <textarea
                            style={styles.textarea}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            disabled={uploadStatus === 'submitting'}
                        />

                        {error && (
                            <div style={styles.errorBox}>
                                <AlertCircle size={18} style={{flexShrink: 0}} />
                                <span>{error}</span>
                            </div>
                        )}

                        {uploadStatus === 'submitting' && uploadMode === 'single' && (
                            <div style={styles.progressContainer}>
                                <div style={{...styles.progressBar, width: `${uploadProgress}%`}}></div>
                                <span style={styles.progressText}>
                                    {uploadProgress === 100 ? 'Processing...' : `Uploading... ${uploadProgress}%`}
                                </span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={uploadStatus === 'submitting' || ((uploadMode === 'bulk' || uploadMode === 'folder') && filesQueue.length === 0)}
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
    container: { maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' },
    pageTitle: { fontSize: '26px', marginBottom: '24px' },
    uploadCard: {
        background: '#111',
        padding: '24px',
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    label: { color: '#aaa', fontSize: '13px', marginBottom: '-8px' },
    input: {
        padding: '12px',
        background: '#000',
        border: '1px solid #333',
        color: '#fff',
        borderRadius: '6px',
        fontSize: '14px'
    },
    textarea: {
        minHeight: '120px',
        padding: '12px',
        background: '#000',
        border: '1px solid #333',
        color: '#fff',
        borderRadius: '6px',
        resize: 'vertical',
        fontSize: '14px'
    },
    fileDropZone: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        background: '#000',
        border: '2px dashed #555',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textAlign: 'center'
    },
    categoryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '12px',
        padding: '16px',
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
    queueContainer: {
        background: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },
    queueItem: {
        background: '#000',
        padding: '12px',
        borderRadius: '6px',
        border: '1px solid #333'
    },
    queueItemHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    clearBtn: {
        background: 'transparent',
        color: '#ff5555',
        border: '1px solid #ff5555',
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '12px',
        cursor: 'pointer'
    },
    iconBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: 4
    },
    miniProgressContainer: {
        height: '4px',
        background: '#333',
        borderRadius: '2px',
        marginTop: '10px',
        overflow: 'hidden'
    },
    miniProgressBar: {
        height: '100%',
        background: '#4caf50',
        transition: 'width 0.3s ease'
    },
    submitBtn: {
        marginTop: '10px',
        padding: '14px',
        fontWeight: 'bold',
        background: 'var(--accent-color, #e50914)',
        color: '#fff',
        borderRadius: '8px',
        cursor: 'pointer',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px'
    },
    errorBox: {
        padding: '12px',
        background: 'rgba(255,0,0,0.1)',
        color: '#ff5555',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        borderRadius: '6px',
        fontSize: '14px'
    },
    successCard: {
        padding: '60px',
        background: '#111',
        borderRadius: '12px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
    },
    resetBtn: {
        padding: '12px 24px',
        background: '#333',
        color: '#fff',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold'
    },
    progressContainer: {
        width: '100%',
        background: '#222',
        borderRadius: '6px',
        overflow: 'hidden',
        position: 'relative',
        height: '32px'
    },
    progressBar: {
        height: '100%',
        background: 'var(--accent-color, #e50914)',
        transition: 'width 0.3s ease'
    },
    progressText: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '13px',
        color: '#fff',
        fontWeight: 'bold',
        mixBlendMode: 'difference'
    }
};

export default AdminUpload;
