import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import { API_BASE } from '../../config';

const AdminLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const res = await fetch(`${API_BASE}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Save JWT token in AuthContext
            login({ token: data.token }, data.role);

            // Redirect to admin dashboard
            navigate('/admin/dashboard');

        } catch (err) {
            setError(err.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.loginBox}>
                <div style={styles.header}>
                    <ShieldCheck size={48} color="var(--accent-color)" />
                    <h1 style={styles.title}>Admin Portal</h1>
                    <p style={styles.subtitle}>Sign in to continue</p>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    {error && <div style={styles.error}>{error}</div>}

                    <div style={styles.inputGroup}>
                        <User size={20} style={styles.icon} />
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={styles.input}
                            required
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <Lock size={20} style={styles.icon} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={styles.loginBtn}
                    >
                        {isSubmitting ? 'Authenticating…' : 'Sign In'}
                    </button>
                </form>

                <button onClick={() => navigate('/')} style={styles.backBtn}>
                    Back to Website
                </button>
            </div>
        </div>
    );
};

const styles = {
    container: {
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
    },
    loginBox: {
        backgroundColor: '#111',
        padding: '40px',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid #333',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
    },
    header: {
        textAlign: 'center',
        marginBottom: '30px',
    },
    title: {
        fontSize: '28px',
        marginTop: '16px',
        color: '#fff',
    },
    subtitle: {
        color: '#666',
        marginTop: '8px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
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
        fontSize: '16px',
        outline: 'none',
    },
    loginBtn: {
        backgroundColor: 'var(--accent-color)',
        color: '#000',
        padding: '14px',
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: 'bold',
        marginTop: '10px',
        cursor: 'pointer'
    },
    error: {
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        color: '#ff4444',
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid rgba(255, 0, 0, 0.3)',
        fontSize: '14px',
        textAlign: 'center',
    },
    backBtn: {
        width: '100%',
        marginTop: '20px',
        color: '#666',
        fontSize: '14px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer'
    }
};

export default AdminLogin;
