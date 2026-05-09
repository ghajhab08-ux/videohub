import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';


const LoginModal = ({ isOpen, onClose }) => {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const endpoint = isLoginMode ? '/api/admin/login' : '/api/admin/signup';
        const body = isLoginMode 
            ? { username, password } 
            : { username, password, email };

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            // Success!
            login({ token: data.token, username: data.username || username }, data.role);
            onClose();

            // Redirect based on role
            if (data.role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <button style={styles.closeBtn} onClick={onClose}>
                    <X size={24} />
                </button>

                <div style={styles.content}>
                    <h2 style={styles.title}>{isLoginMode ? 'Member Login' : 'Create Account'}</h2>
                    <p style={styles.sub}>
                        {isLoginMode 
                            ? 'Sign in to interact, like, and comment on videos.' 
                            : 'Join our community to upload and interact with videos.'}
                    </p>

                    {error && (
                        <div style={styles.errorBox}>
                            {error}
                        </div>
                    )}

                    <form style={styles.form} onSubmit={handleSubmit}>
                        {!isLoginMode && (
                            <div style={styles.inputGroup}>
                                <Mail size={20} style={styles.icon} />
                                <input 
                                    type="email" 
                                    placeholder="Email Address" 
                                    style={styles.input} 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <div style={styles.inputGroup}>
                            <UserIcon size={20} style={styles.icon} />
                            <input 
                                type="text" 
                                placeholder="Username" 
                                style={styles.input} 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div style={styles.inputGroup}>
                            <Lock size={20} style={styles.icon} />
                            <input 
                                type="password" 
                                placeholder="Password" 
                                style={styles.input} 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button style={styles.submitBtn} disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isLoginMode ? 'Sign In' : 'Sign Up')}
                        </button>
                    </form>


                    <button 
                        style={styles.registerBtn} 
                        onClick={() => {
                            setIsLoginMode(!isLoginMode);
                            setError('');
                        }}
                    >
                        {isLoginMode ? 'Create Free Account' : 'Already have an account? Sign In'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
    },
    modal: {
        backgroundColor: '#1a1a1a',
        width: '100%',
        maxWidth: '400px',
        borderRadius: '12px',
        padding: '40px',
        position: 'relative',
        border: '1px solid #333',
    },
    closeBtn: {
        position: 'absolute',
        top: '16px',
        right: '16px',
        color: '#666',
    },
    content: {
        textAlign: 'center',
    },
    title: {
        fontSize: '24px',
        marginBottom: '8px',
    },
    sub: {
        color: '#999',
        fontSize: '14px',
        marginBottom: '30px',
    },
    errorBox: {
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        border: '1px solid #ff4444',
        color: '#ff4444',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '20px',
        fontSize: '14px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    inputGroup: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    icon: {
        position: 'absolute',
        left: '12px',
        color: '#666',
    },
    input: {
        width: '100%',
        backgroundColor: '#000',
        border: '1px solid #333',
        padding: '12px 12px 12px 40px',
        borderRadius: '6px',
        color: '#fff',
        outline: 'none',
    },
    submitBtn: {
        backgroundColor: 'var(--accent-color)',
        color: '#000',
        padding: '12px',
        borderRadius: '6px',
        fontWeight: 'bold',
        fontSize: '16px',
        marginTop: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    registerBtn: {
        width: '100%',
        padding: '12px',
        borderRadius: '6px',
        border: '1px solid #444',
        color: '#fff',
        fontWeight: '600',
    }
};

export default LoginModal;
