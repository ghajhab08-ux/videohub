import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, TrendingUp, Clock, Film, ShieldAlert, Upload, LogIn, User, LogOut } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES } from '../../constants/categories';
import LoginModal from '../common/LoginModal';

const Sidebar = () => {
    const { isSidebarOpen: isOpen, selectedCategory, setSelectedCategory, isMobile, closeSidebar } = useUI();
    const { user, isAdmin, logout } = useAuth();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const handleLinkClick = (path) => {
        if (isMobile) closeSidebar();
    };

    const handleCategoryClick = (cat) => {
        setSelectedCategory(cat);
        if (location.pathname !== '/') {
            navigate('/');
        }
        if (isMobile) {
            closeSidebar();
        }
    };

    const handleLogout = () => {
        logout();
        if (isMobile) closeSidebar();
    };

    const categories = CATEGORIES;

    const menuItems = [
        { name: 'Home', icon: Home, path: '/' },
        { name: 'Trending', icon: TrendingUp, path: '/search?q=trending' },
        { name: 'Latest', icon: Clock, path: '/search?q=latest' },
    ];

    const transitionStyle = {
        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        boxShadow: isOpen ? '5px 0 15px rgba(0,0,0,0.5)' : 'none',
    };

    return (
        <>
            <aside style={{ ...styles.sidebar, ...transitionStyle }}>
                {/* Mobile Header Items */}
                {isMobile && (
                    <div style={styles.mobileOnlySection}>
                        {user && (
                            <div style={styles.userProfile}>
                                <div style={styles.avatar}>
                                    <User size={24} />
                                </div>
                                <span style={styles.userName}>{user.email?.split('@')[0] || 'User'}</span>
                            </div>
                        )}
                        
                        <Link to="/submit" style={styles.navLink} onClick={() => handleLinkClick('/submit')}>
                            <Upload size={20} style={styles.icon} />
                            <span>Submit Video</span>
                        </Link>

                        {!user ? (
                            <button onClick={() => setIsLoginModalOpen(true)} style={styles.navLinkButton}>
                                <LogIn size={20} style={styles.icon} />
                                <span>Login</span>
                            </button>
                        ) : (
                            <button onClick={handleLogout} style={styles.navLinkButton}>
                                <LogOut size={20} style={styles.icon} />
                                <span>Logout</span>
                            </button>
                        )}
                        <div style={styles.divider} />
                    </div>
                )}

                {/* Main menu */}
                <div style={styles.section}>
                    {menuItems.map((item) => (
                        <Link
                            key={item.name}
                            to={item.path}
                            onClick={() => handleLinkClick(item.path)}
                            style={{
                                ...styles.navLink,
                                ...(location.pathname === item.path ? styles.activeLink : {}),
                            }}
                        >
                            <item.icon size={20} style={styles.icon} />
                            <span>{item.name}</span>
                        </Link>
                    ))
                }
                </div>

                <div style={styles.divider} />

                {/* Categories */}
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Categories</h3>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => handleCategoryClick(cat)}
                            style={{
                                ...styles.navLink,
                                backgroundColor:
                                    selectedCategory === cat ? 'rgba(255, 174, 0, 0.1)' : 'transparent',
                                color: selectedCategory === cat ? 'var(--accent-color)' : '#eee',
                                border: 'none',
                                textAlign: 'left',
                                width: '100%',
                                cursor: 'pointer',
                                paddingLeft: '20px',
                            }}
                        >
                            <Film size={18} style={styles.icon} />
                            <span>{cat}</span>
                        </button>
                    ))}
                </div>

                {/* Admin section removed to hide entry point */}
            </aside>

            <LoginModal 
                isOpen={isLoginModalOpen} 
                onClose={() => setIsLoginModalOpen(false)} 
            />
        </>
    );
};

const styles = {
    sidebar: {
        width: 'var(--sidebar-width)',
        backgroundColor: '#1a1a1a',
        height: 'calc(100vh - var(--header-height))',
        position: 'fixed',
        top: 'var(--header-height)',
        left: 0,
        overflowY: 'auto',
        borderRight: '1px solid var(--border-color)',
        padding: '16px 0',
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
    },
    mobileOnlySection: {
        padding: '0 8px',
    },
    userProfile: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px',
        gap: '12px',
        marginBottom: '8px',
        backgroundColor: '#222',
        borderRadius: '8px',
        margin: '0 8px 12px 8px',
    },
    avatar: {
        width: '36px',
        height: '36px',
        backgroundColor: '#333',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--accent-color)',
    },
    userName: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#fff',
    },
    section: {
        padding: '0 8px',
    },
    adminSection: {
        marginTop: 'auto',
        padding: '0 8px',
        paddingBottom: '16px',
    },
    sectionTitle: {
        color: 'var(--text-secondary)',
        fontSize: '12px',
        textTransform: 'uppercase',
        padding: '8px 12px',
        marginBottom: '4px',
    },
    navLink: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderRadius: '8px',
        color: '#eee',
        fontSize: '15px',
        transition: 'all 0.2s ease',
        margin: '2px 8px',
        fontWeight: '500',
    },
    navLinkButton: {
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px',
        borderRadius: '4px',
        color: '#eee',
        fontSize: '14px',
        transition: 'background 0.2s',
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
    },
    activeLink: {
        backgroundColor: '#333',
        color: 'var(--accent-color)',
    },
    icon: {
        marginRight: '16px',
        color: 'inherit',
        minWidth: '20px',
    },
    divider: {
        height: '1px',
        backgroundColor: 'var(--border-color)',
        margin: '12px 0',
    },
};

export default Sidebar;
