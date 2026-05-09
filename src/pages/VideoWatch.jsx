import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Flag,
  Share2,
  MoreHorizontal
} from 'lucide-react';
import VideoCard from '../components/video/VideoCard';
import LoginModal from '../components/common/LoginModal';
import { useAuth } from '../context/AuthContext';
import TopAdBanner from '../components/common/TopAdBanner';
import VideoJSPlayer from '../components/video/VideoJSPlayer';
import { API_BASE } from '../config';

const getEmbedUrl = (url) => {
  if (!url) return '';
  
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return url; // Return as is if already embed or unknown
};

const VideoWatch = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [video, setVideo] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const videosPerPage = 20;

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchComments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/video/${id}/comments`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch comments error:', err);
    }
  };

  const handleInteraction = async (action) => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (action === 'Like') {
      try {
        const res = await fetch(`${API_BASE}/api/video/${id}/like`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          alert('Video liked!');
          // Refresh video data to show new like count
          fetchVideoData();
        } else {
          alert(data.error || 'Failed to like video');
        }
      } catch (err) {
        alert('Error liking video');
      }
      return;
    }

    if (action === 'Report') {
      const reason = prompt('Please enter the reason for reporting:');
      if (!reason) return;

      try {
        const res = await fetch(`${API_BASE}/api/report`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({
            type: 'video',
            targetId: id,
            reason
          })
        });

        if (res.ok) {
          alert('Report submitted. Thank you.');
        } else {
          alert('Failed to submit report');
        }
      } catch (err) {
        alert('Error submitting report');
      }
      return;
    }

    alert(`Action ${action} is not yet implemented with backend`);
  };

  const handleCommentSubmit = async (e) => {
    if (e.key && e.key !== 'Enter') return;
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!commentText.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/video/${id}/comment`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ text: commentText })
      });

      if (res.ok) {
        setCommentText('');
        fetchComments();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to post comment');
      }
    } catch (err) {
      alert('Error posting comment');
    }
  };

  const fetchVideoData = () => {
    fetch(`${API_BASE}/api/video/${id}`)
      .then(res => res.json())
      .then(data => {
        setVideo(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    setIsLoading(true);
    fetchVideoData();
    fetchComments();

    // Fetch related videos
    fetch(`${API_BASE}/api/videos?related=${id}`)
      .then(res => res.json())
      .then(data => setRelatedVideos(data))
      .catch(() => setRelatedVideos([]));

    window.scrollTo(0, 0);
    setCurrentPage(1); 
  }, [id]);

  const handlePageChange = (pageNum) => {
    setCurrentPage(pageNum);
    const relatedSection = document.getElementById('related-section');
    if (relatedSection) {
      relatedSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const paginatedVideos = relatedVideos.slice(
    (currentPage - 1) * videosPerPage,
    currentPage * videosPerPage
  );

  const totalPages = Math.max(1, Math.ceil(relatedVideos.length / videosPerPage) || 5);

  if (isLoading) {
    return (
      <div style={styles.loading}>Loading video...</div>
    );
  }

  if (!video) {
    return (
      <div>Video not found</div>
    );
  }

  const CommentsSection = () => (
    <div style={{ ...styles.comments, marginTop: isMobile ? '40px' : '0' }}>
      <div style={styles.commentsHeader}>
        <h3>Comments ({comments.length})</h3>
        <button 
          id="comments-toggle-btn"
          style={styles.toggleBtn}
          onClick={() => setIsCommentsVisible(!isCommentsVisible)}
        >
          {isCommentsVisible ? 'Hide Comments' : 'Show Comments'}
        </button>
      </div>
      
      {isCommentsVisible && (
        <div className="fade-in">
          <div style={styles.commentInputRow}>
            <div style={styles.avatarMini}>{user ? user.username[0].toUpperCase() : '?'}</div>
            <input
              type="text"
              placeholder={user ? "Add a comment..." : "Login to comment"}
              style={styles.commentInput}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={handleCommentSubmit}
              disabled={!user}
              onClick={() => !user && setIsLoginModalOpen(true)}
            />
          </div>

          <div style={styles.commentList}>
            {comments.map((comment, index) => (
              <div key={comment.id || index} style={styles.commentItem}>
                <div style={styles.avatarMini}>{comment.username ? comment.username[0].toUpperCase() : 'U'}</div>
                <div style={styles.commentBody}>
                  <div style={styles.commentAuthor}>{comment.username} <span style={styles.commentDate}>{new Date(comment.createdAt).toLocaleDateString()}</span></div>
                  <div style={styles.commentText}>{comment.text}</div>
                  <div style={styles.commentActions}>
                    <button style={styles.commentActionBtn} onClick={() => handleInteraction('Like')}>Like</button>
                    <button style={styles.commentActionBtn} onClick={() => {
                      if (!user) {
                        setIsLoginModalOpen(true);
                        return;
                      }
                      const reason = prompt('Report comment for:');
                      if (reason) {
                        fetch(`${API_BASE}/api/report`, {
                          method: 'POST',
                          headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${user.token}`
                          },
                          body: JSON.stringify({
                            type: 'comment',
                            targetId: comment.id,
                            reason
                          })
                        }).then(() => alert('Comment reported.'));
                      }
                    }}>Report</button>
                  </div>
                </div>
              </div>
            ))}
            {comments.length === 0 && <p style={styles.commentNotice}>No comments yet. Be the first to comment!</p>}
          </div>
          {!user && <p style={styles.commentNotice}>Please login to post comments.</p>}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div 
        style={{ 
          ...styles.container, 
          flexDirection: isMobile ? 'column' : 'row' 
        }} 
        className="fade-in"
      >
      <div style={styles.videoContent}>
          {/* AD BANNER */}
          <TopAdBanner />
          
          {/* VIDEO PLAYER */}
          <div style={styles.playerContainer}>
            {video.videoUrl ? (
              video.sourceType === 'embedded' ? (
                <iframe
                  src={getEmbedUrl(video.videoUrl)}
                  style={styles.player}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={video.title}
                />
              ) : (
                <VideoJSPlayer 
                  options={{
                    autoplay: true,
                    controls: true,
                    responsive: true,
                    fluid: true,
                    disablePictureInPicture: false,
                    sources: [{
                      src: video.videoUrl,
                      type: video.videoUrl.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'
                    }],
                    controlBar: {
                      children: [
                        'playToggle',
                        'volumePanel',
                        'currentTimeDisplay',
                        'timeDivider',
                        'durationDisplay',
                        'progressControl',
                        'remainingTimeDisplay',
                        'fullscreenToggle',
                      ],
                    },
                  }} 
                />
              )
            ) : (
              <div style={styles.errorPlayer}>Video source unavailable</div>
            )}
          </div>

          {/* VIDEO INFO */}
          <div style={styles.header}>
            <h1 style={styles.title}>{video.title}</h1>
            <div style={styles.statsRow}>
              <div style={styles.views}>
                {video.views} views • {video.uploadDate}
              </div>
              <div style={styles.actions}>
                <button style={styles.actionBtn} onClick={() => handleInteraction('Like')}>
                  <ThumbsUp size={20} /> <span>{video.likes}</span>
                </button>
                <button style={styles.actionBtn} onClick={() => handleInteraction('Dislike')}>
                  <ThumbsDown size={20} /> <span>{video.dislikes}</span>
                </button>
                <button style={styles.actionBtn} onClick={() => handleInteraction('Share')}>
                  <Share2 size={20} /> <span>Share</span>
                </button>
                <button style={styles.actionBtn} onClick={() => handleInteraction('Report')}>
                  <Flag size={20} /> <span>Report</span>
                </button>
                <button style={styles.actionBtn}>
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>
          </div>

          <div style={styles.divider} />

          {/* DESCRIPTION */}
          <div style={styles.descriptionSection}>
            <div style={styles.performerInfo}>
              <div style={styles.avatar}>V</div>
              <div>
                <div style={styles.performerName}>Video Creator</div>
                <div style={styles.subCount}>2.5M subscribers</div>
              </div>
              <button style={styles.subscribeBtn}>SUBSCRIBE</button>
            </div>

            <div style={styles.description}>{video.description}</div>

            <div style={styles.tags}>
              <span style={styles.category}>Category: {video.category}</span>
            </div>
          </div>

          <div style={styles.divider} />

          {/* COMMENTS (Desktop Only) */}
          {!isMobile && <CommentsSection />}
        </div>

        {/* RELATED VIDEOS */}
        <div style={styles.relatedSide} id="related-section">
          <h3 style={styles.sideTitle}>Related Videos</h3>
          <div style={styles.relatedGrid}>
            {paginatedVideos.map(v => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>

          {/* PAGINATION */}
          {relatedVideos.length > 0 && (
            <div style={styles.pagination}>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  style={{
                    ...styles.pageBtn,
                    backgroundColor: currentPage === i + 1 ? 'var(--accent-color)' : '#222',
                    color: currentPage === i + 1 ? '#000' : '#fff'
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}

          {/* COMMENTS (Mobile Only) */}
          {isMobile && <CommentsSection />}
        </div>
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
};

const styles = {
  container: { 
    display: 'flex', 
    gap: '24px',
  },
  videoContent: { flex: 3, width: '100%' },
  relatedSide: { flex: 1, minWidth: '320px', width: '100%' },
  playerContainer: {
    width: '100%',
    aspectRatio: '16/9',
    backgroundColor: '#000',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  player: { width: '100%', height: '100%' },
  header: { marginTop: '20px' },
  title: { fontSize: '24px', fontWeight: '700' },
  statsRow: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' },
  views: { fontSize: '14px', color: '#aaa' },
  actions: { display: 'flex', gap: '12px' },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#222',
    padding: '6px 12px',
    borderRadius: '20px'
  },
  divider: { height: '1px', backgroundColor: '#333', margin: '20px 0' },
  descriptionSection: { backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '12px' },
  performerInfo: { display: 'flex', alignItems: 'center', gap: '16px' },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#f5c518',
    color: '#000',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  performerName: { fontWeight: 'bold' },
  subCount: { fontSize: '13px', color: '#aaa' },
  subscribeBtn: {
    marginLeft: 'auto',
    backgroundColor: '#fff',
    color: '#000',
    padding: '8px 18px',
    borderRadius: '20px'
  },
  description: { marginTop: '16px', fontSize: '14px' },
  tags: { marginTop: '12px' },
  category: {
    backgroundColor: '#333',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px'
  },
  comments: { marginTop: '30px' },
  commentInputRow: { display: 'flex', gap: '12px', marginTop: '16px' },
  avatarMini: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  commentInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #444',
    color: '#fff'
  },
  commentNotice: { marginTop: '10px', fontSize: '13px', color: '#888' },
  sideTitle: { fontSize: '18px', marginBottom: '16px' },
  relatedGrid: { display: 'flex', flexDirection: 'column', gap: '16px' },
  commentList: { marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  commentItem: { display: 'flex', gap: '12px' },
  commentBody: { flex: 1 },
  commentAuthor: { fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' },
  commentDate: { fontWeight: 'normal', color: '#666', marginLeft: '8px' },
  commentText: { fontSize: '14px', lineHeight: '1.4' },
  commentActions: { display: 'flex', gap: '12px', marginTop: '8px' },
  commentActionBtn: { background: 'none', border: 'none', color: '#aaa', fontSize: '12px', cursor: 'pointer', padding: 0 },
  commentsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  toggleBtn: {
    backgroundColor: '#333',
    color: '#fff',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600'
  },
  pagination: {
    display: 'flex',
    gap: '8px',
    marginTop: '24px',
    justifyContent: 'center',
    padding: '10px 0'
  },
  pageBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
    cursor: 'pointer'
  },
  loading: { padding: '100px', textAlign: 'center', fontSize: '20px' }
};

export default VideoWatch;
