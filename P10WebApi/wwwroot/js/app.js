// State
const state = {
    currentUser: JSON.parse(localStorage.getItem('nexus_user')) || {
        userId: 'user_' + Math.random().toString(36).substring(2, 8),
        username: 'Guest_Explorer',
        profilePic: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        isLoggedIn: false
    },
    posts: [],
    filter: 'all',
    selectedImageFile: null
};

// DOM Elements
const feedContainer = document.getElementById('feed-container');
const quickPostCaption = document.getElementById('quick-post-caption');
const publishQuickPostBtn = document.getElementById('publish-quick-post');
const imagePreviewBox = document.getElementById('image-preview-box');
const previewImg = document.getElementById('preview-img');
const removeImgBtn = document.getElementById('remove-img-btn');
const quickImgFile = document.getElementById('quick-img-file');
const toastContainer = document.getElementById('toast-container');
const authModal = document.getElementById('auth-modal');
const postModal = document.getElementById('post-modal');

// Init
document.addEventListener('DOMContentLoaded', () => {
    updateUserUI();
    loadFeed();
    setupEventListeners();
});

// User UI updates
function updateUserUI() {
    const userDisplay = document.getElementById('user-display-name');
    const userHandle = document.getElementById('user-handle');
    const userAvatar = document.getElementById('user-avatar');
    const createAvatar = document.getElementById('create-post-avatar');
    const authBtn = document.getElementById('header-auth-btn');

    if (userDisplay) userDisplay.textContent = state.currentUser.username;
    if (userHandle) userHandle.textContent = '@' + state.currentUser.username.toLowerCase();
    if (userAvatar) userAvatar.src = state.currentUser.profilePic;
    if (createAvatar) createAvatar.src = state.currentUser.profilePic;

    if (authBtn) {
        if (state.currentUser.isLoggedIn) {
            authBtn.textContent = 'Sign Out';
            authBtn.onclick = logoutUser;
        } else {
            authBtn.textContent = 'Sign In';
            authBtn.onclick = () => openAuthModal('login');
        }
    }
}

// Fetch Feed
async function loadFeed() {
    try {
        feedContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <div style="display: inline-block; width: 32px; height: 32px; border: 3px solid rgba(99, 102, 241, 0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <p style="margin-top: 14px;">Loading Social Feed...</p>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;

        let res = await fetch('/api/Post/feed');
        if (!res.ok) throw new Error('Failed to load feed');
        let posts = await res.json();

        // If no posts, trigger seed
        if (!posts || posts.length === 0) {
            await fetch('/api/Post/seed', { method: 'POST' });
            res = await fetch('/api/Post/feed');
            posts = await res.json();
        }

        state.posts = posts || [];
        renderPosts();
    } catch (err) {
        console.error(err);
        feedContainer.innerHTML = `
            <div class="post-card" style="text-align: center; padding: 30px;">
                <p style="color: var(--accent-pink);">Unable to connect to feed server.</p>
                <button class="publish-btn" style="margin-top: 12px;" onclick="loadFeed()">Retry</button>
            </div>
        `;
    }
}

// Render Posts
function renderPosts() {
    if (!state.posts.length) {
        feedContainer.innerHTML = `
            <div class="post-card" style="text-align: center; padding: 40px; color: var(--text-muted);">
                <p>No posts yet! Be the first to publish a post below.</p>
            </div>
        `;
        return;
    }

    feedContainer.innerHTML = state.posts.map(post => {
        const isLiked = (post.likes || []).includes(state.currentUser.userId);
        const likeCount = (post.likes || []).length;
        const commentCount = (post.comments || []).length;
        const formattedDate = formatTimeAgo(post.createdAt);
        const authorImg = post.userProfilePic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

        return `
            <article class="post-card" id="post-${post.postId}">
                <div class="post-header">
                    <div class="post-author">
                        <img class="avatar" src="${escapeHtml(authorImg)}" alt="avatar">
                        <div>
                            <div class="post-author-name">
                                ${escapeHtml(post.username || 'Community User')}
                                <span class="verified-badge">✓</span>
                            </div>
                            <div class="post-meta">${formattedDate}</div>
                        </div>
                    </div>
                </div>

                <div class="post-caption">
                    ${formatHashtags(escapeHtml(post.postCaption || ''))}
                </div>

                ${post.postpicURL ? `
                    <div class="post-media-container">
                        <img src="${escapeHtml(post.postpicURL)}" alt="Post image" loading="lazy">
                    </div>
                ` : ''}

                <div class="post-actions">
                    <div class="actions-left">
                        <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.postId}')">
                            <span class="heart-icon">${isLiked ? '❤️' : '🤍'}</span>
                            <span id="likes-count-${post.postId}">${likeCount}</span>
                        </button>
                        <button class="action-btn" onclick="toggleComments('${post.postId}')">
                            <span>💬</span>
                            <span>${commentCount}</span>
                        </button>
                    </div>
                    <button class="action-btn" onclick="sharePost('${post.postId}')">
                        <span>↗️</span> Share
                    </button>
                </div>

                <div class="comments-section" id="comments-${post.postId}">
                    <div class="comment-list" id="comment-list-${post.postId}">
                        ${(post.comments || []).map(c => `
                            <div class="comment-item">
                                <div class="comment-content">
                                    <div class="comment-author">${escapeHtml(c.username || 'User')}</div>
                                    <div class="comment-text">${escapeHtml(c.commentText || '')}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="add-comment-box">
                        <input type="text" id="comment-input-${post.postId}" placeholder="Write a comment..." onkeydown="handleCommentKey(event, '${post.postId}')">
                        <button class="send-comment-btn" onclick="addComment('${post.postId}')">Send</button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

// Like Toggle
async function toggleLike(postId) {
    try {
        const res = await fetch(`/api/Post/${postId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.currentUser.userId })
        });

        if (!res.ok) throw new Error('Like failed');
        const data = await res.json();

        // Update local post state
        const post = state.posts.find(p => p.postId === postId);
        if (post) {
            post.likes = post.likes || [];
            if (data.isLiked) {
                if (!post.likes.includes(state.currentUser.userId)) post.likes.push(state.currentUser.userId);
            } else {
                post.likes = post.likes.filter(id => id !== state.currentUser.userId);
            }
        }

        renderPosts();
        if (data.isLiked) {
            showToast('Post liked! ❤️', 'success');
        }
    } catch (err) {
        showToast('Error liking post', 'error');
    }
}

// Comments Toggle
function toggleComments(postId) {
    const sec = document.getElementById(`comments-${postId}`);
    if (sec) {
        sec.classList.toggle('open');
        const input = document.getElementById(`comment-input-${postId}`);
        if (sec.classList.contains('open') && input) input.focus();
    }
}

function handleCommentKey(e, postId) {
    if (e.key === 'Enter') {
        addComment(postId);
    }
}

async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const text = input ? input.value.trim() : '';
    if (!text) return;

    try {
        const res = await fetch(`/api/Post/${postId}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: state.currentUser.userId,
                username: state.currentUser.username,
                commentText: text
            })
        });

        if (!res.ok) throw new Error('Failed to comment');
        const data = await res.json();

        const post = state.posts.find(p => p.postId === postId);
        if (post) {
            post.comments = post.comments || [];
            post.comments.push(data.comment);
        }

        input.value = '';
        renderPosts();
        // Keep open
        const sec = document.getElementById(`comments-${postId}`);
        if (sec) sec.classList.add('open');
        showToast('Comment posted! 💬', 'success');
    } catch (err) {
        showToast('Error posting comment', 'error');
    }
}

// Create Post
async function createPost(caption, imageFile = null, imageUrl = null) {
    if (!caption || !caption.trim()) {
        showToast('Please write something in your post', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('PostCaption', caption.trim());
    formData.append('UserId', state.currentUser.userId);
    formData.append('Username', state.currentUser.username);
    formData.append('UserProfilePic', state.currentUser.profilePic);

    if (imageFile) {
        formData.append('image', imageFile);
    } else if (imageUrl) {
        formData.append('PostpicURL', imageUrl);
    }

    try {
        publishQuickPostBtn.disabled = true;
        publishQuickPostBtn.textContent = 'Posting...';

        const res = await fetch('/api/Post/create', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Post failed');
        }

        const data = await res.json();
        state.posts.unshift(data.post);
        renderPosts();

        // Reset inputs
        if (quickPostCaption) quickPostCaption.value = '';
        state.selectedImageFile = null;
        if (imagePreviewBox) imagePreviewBox.style.display = 'none';

        closeModal('post-modal');
        showToast('Post published successfully! 🚀', 'success');
    } catch (err) {
        showToast(err.message || 'Error creating post', 'error');
    } finally {
        publishQuickPostBtn.disabled = false;
        publishQuickPostBtn.textContent = 'Publish';
    }
}

// Share post
function sharePost(postId) {
    const url = `${window.location.origin}#post-${postId}`;
    navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied to clipboard! 📋', 'success');
    }).catch(() => {
        showToast(`Post ID: ${postId}`, 'success');
    });
}

// Image Selection
function setupEventListeners() {
    if (publishQuickPostBtn) {
        publishQuickPostBtn.addEventListener('click', () => {
            createPost(quickPostCaption.value, state.selectedImageFile);
        });
    }

    if (quickImgFile) {
        quickImgFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                state.selectedImageFile = file;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    previewImg.src = ev.target.result;
                    imagePreviewBox.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removeImgBtn) {
        removeImgBtn.addEventListener('click', () => {
            state.selectedImageFile = null;
            if (quickImgFile) quickImgFile.value = '';
            imagePreviewBox.style.display = 'none';
        });
    }

    // Modal Create Post Form
    const modalPostForm = document.getElementById('modal-post-form');
    if (modalPostForm) {
        modalPostForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const caption = document.getElementById('modal-post-caption').value;
            const imgUrl = document.getElementById('modal-post-img-url').value;
            const file = document.getElementById('modal-post-file').files[0];
            createPost(caption, file, imgUrl);
        });
    }

    // Auth Forms
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const pass = document.getElementById('login-password').value;
            await handleLogin(email, pass);
        });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('reg-username').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const pass = document.getElementById('reg-password').value;
            await handleRegister(username, email, pass);
        });
    }

    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value.trim();
            await handleForgotPassword(email);
        });
    }
}

// Authentication Handlers
async function handleLogin(emailOrUser, password) {
    try {
        const res = await fetch('/api/User/Login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: emailOrUser.includes('@') ? emailOrUser : '',
                username: !emailOrUser.includes('@') ? emailOrUser : '',
                password: password
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');

        state.currentUser = {
            userId: 'user_' + Math.random().toString(36).substring(2, 8),
            username: emailOrUser.includes('@') ? emailOrUser.split('@')[0] : emailOrUser,
            profilePic: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            isLoggedIn: true,
            token: data.token
        };

        localStorage.setItem('nexus_user', JSON.stringify(state.currentUser));
        updateUserUI();
        closeModal('auth-modal');
        showToast('Logged in successfully! Welcome back 👋', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleRegister(username, email, password) {
    try {
        const res = await fetch('/api/User/Register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                email,
                password
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Registration failed');

        showToast('Registration successful! Please log in.', 'success');
        switchAuthTab('login');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleForgotPassword(email) {
    try {
        const res = await fetch(`/api/User/forgotpassword?email=${encodeURIComponent(email)}`, {
            method: 'POST'
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to send OTP');

        showToast('6-Digit OTP sent to your email! ✉️', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function logoutUser() {
    state.currentUser = {
        userId: 'user_' + Math.random().toString(36).substring(2, 8),
        username: 'Guest_Explorer',
        profilePic: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        isLoggedIn: false
    };
    localStorage.removeItem('nexus_user');
    updateUserUI();
    showToast('Signed out successfully', 'success');
}

// Modal Helpers
function openAuthModal(tab = 'login') {
    authModal.classList.add('active');
    switchAuthTab(tab);
}

function openCreatePostModal() {
    postModal.classList.add('active');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

function switchAuthTab(tab) {
    document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-pane').forEach(p => p.style.display = 'none');

    const tabBtn = document.getElementById(`tab-${tab}`);
    const pane = document.getElementById(`pane-${tab}`);
    if (tabBtn) tabBtn.classList.add('active');
    if (pane) pane.style.display = 'block';
}

// Toast
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠️'}</span><span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Utilities
function formatTimeAgo(dateString) {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function formatHashtags(text) {
    return text.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
}
