import React, { useState } from 'react';
import { Upload, ShieldCheck, DollarSign, Clock } from 'lucide-react';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';

const SubmitInfo = () => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        videoFile: null
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const { user } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!user) {
            alert('Authentication required to submit videos. Please login first.');
            return;
        }

        if (!formData.title || !formData.videoFile) {
            alert('Title and Video File are required');
            return;
        }

        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('video', formData.videoFile);
            data.append('submittedBy', user?.username || 'user');

            const res = await fetch(`${API_BASE}/api/submit-video-file`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`
                },
                body: data
            });

            if (res.ok) {
                setSuccess(true);
                setFormData({ title: '', description: '', videoFile: null });
            } else {
                const errorData = await res.json();
                alert(`Submission failed: ${errorData.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Submission Error:', err);
            alert('Error during submission');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={styles.container} className="fade-in">
                <div style={styles.hero}>
                    <h1 style={styles.heroTitle}>Submit Your Content</h1>
                    <p style={styles.heroSub}>Join the world's leading community and start earning today.</p>
                </div>

                <div style={styles.formSection}>
                    {success ? (
                        <div style={styles.successMsg}>
                            <h2>Thank You!</h2>
                            <p>Your video submission has been received and is pending review.</p>
                            <button onClick={() => setSuccess(false)} style={styles.ctaBtn}>Submit Another</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={styles.form}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Video Title <span style={styles.required}>*</span></label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    style={styles.input}
                                    required
                                    placeholder="Enter a catchy title"
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    style={styles.textarea}
                                    placeholder="Describe your content"
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Select Video File <span style={styles.required}>*</span></label>
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => setFormData({ ...formData, videoFile: e.target.files[0] })}
                                    style={styles.fileInput}
                                    required
                                />
                                <p style={styles.fileHint}>Supported formats: MP4, MOV, AVI, etc. (Max 500MB)</p>
                            </div>
                            <button type="submit" disabled={isSubmitting} style={styles.ctaBtn}>
                                {isSubmitting ? 'Uploading...' : 'Submit Video Request'}
                            </button>
                        </form>
                    )}
                </div>

                <div style={styles.features}>
                    <div style={styles.featureCard}>
                        <Upload size={40} color="var(--accent-color)" />
                        <h3>Easy Upload</h3>
                        <p>High speed servers ensuring your content is live in minutes.</p>
                    </div>
                    <div style={styles.featureCard}>
                        <ShieldCheck size={40} color="var(--accent-color)" />
                        <h3>Secure & Private</h3>
                        <p>Advanced encryption and content protection for all creators.</p>
                    </div>
                    <div style={styles.featureCard}>
                        <DollarSign size={40} color="var(--accent-color)" />
                        <h3>Monetization</h3>
                        <p>Industry-leading payout rates and flexible payment options.</p>
                    </div>
                    <div style={styles.featureCard}>
                        <Clock size={40} color="var(--accent-color)" />
                        <h3>24/7 Support</h3>
                        <p>Our dedicated team is here to help you grow your brand.</p>
                    </div>
                </div>
            </div>
    );
};

const styles = {
    container: {
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '40px 0',
    },
    hero: {
        textAlign: 'center',
        marginBottom: '60px',
    },
    heroTitle: {
        fontSize: '48px',
        marginBottom: '16px',
        background: 'linear-gradient(to right, #fff, var(--accent-color))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    heroSub: {
        fontSize: '20px',
        color: '#aaa',
    },
    formSection: {
        backgroundColor: '#111',
        padding: '40px',
        borderRadius: '20px',
        marginBottom: '80px',
        border: '1px solid #222',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '14px',
        color: '#aaa',
        fontWeight: '600',
    },
    input: {
        padding: '12px 16px',
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '16px',
    },
    fileInput: {
        padding: '12px 16px',
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
    },
    fileHint: {
        fontSize: '12px',
        color: '#666',
        marginTop: '4px',
    },
    required: {
        color: '#f44336',
        marginLeft: '4px',
    },
    textarea: {
        padding: '12px 16px',
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '16px',
        minHeight: '100px',
        resize: 'vertical',
    },
    successMsg: {
        textAlign: 'center',
        padding: '20px',
    },
    features: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '30px',
        marginBottom: '80px',
    },
    featureCard: {
        backgroundColor: '#1a1a1a',
        padding: '30px',
        borderRadius: '12px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        border: '1px solid #333',
    },
    ctaBtn: {
        backgroundColor: 'var(--accent-color)',
        color: '#000',
        padding: '16px 40px',
        borderRadius: '30px',
        fontSize: '18px',
        fontWeight: 'bold',
        marginTop: '10px',
        border: 'none',
        cursor: 'pointer',
        alignSelf: 'center',
    }
};

export default SubmitInfo;
