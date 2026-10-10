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

// Navigation & Views
function showHome() {
    setActiveNav('nav-home');
    state.activeView = 'home';
    const mainView = document.getElementById('main-view-container');
    mainView.innerHTML = '<div id="feed-container"></div>';
    renderPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showExplore() {
    setActiveNav('nav-explore');
    state.activeView = 'explore';
    const mainView = document.getElementById('main-view-container');
    
    const photos = state.posts.filter(p => p.postpicURL);
    mainView.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h2 style="font-size: 22px; margin-bottom: 6px;">Explore Trending Content 🔥</h2>
            <p style="color: var(--text-muted); font-size: 14px;">Discover popular photography, tech discussions, and creators across Nexus.</p>
        </div>
        <div class="explore-grid">
            ${photos.map(p => `
                <div class="explore-item" onclick="openPostDetail('${p.postId}')">
                    <img src="${escapeHtml(p.postpicURL)}" alt="explore">
                    <div class="explore-overlay">
                        <div class="explore-info">
                            <div><strong>@${escapeHtml(p.username)}</strong></div>
                            <div style="font-size: 12px; margin-top: 4px;">❤️ ${(p.likes || []).length} &nbsp; 💬 ${(p.comments || []).length}</div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showProfile() {
    setActiveNav('nav-profile');
    state.activeView = 'profile';
    const mainView = document.getElementById('main-view-container');

    const userPosts = state.posts.filter(p => p.userId === state.currentUser.userId || p.username === state.currentUser.username);
    const totalLikes = userPosts.reduce((acc, p) => acc + (p.likes || []).length, 0);

    mainView.innerHTML = `
        <div class="profile-view-card">
            <div class="profile-header-top">
                <img class="profile-avatar-large" src="${escapeHtml(state.currentUser.profilePic)}" alt="Avatar">
                <div class="profile-meta">
                    <h2>${escapeHtml(state.currentUser.username)}</h2>
                    <div class="handle">@${escapeHtml(state.currentUser.username.toLowerCase())}</div>
                    <p class="profile-bio">Building fast full-stack applications with .NET 9 & MongoDB 🚀 Sharing tech insights, creative design, and community updates.</p>
                    
                    <div class="profile-stats">
                        <div class="stat-item">
                            <span class="stat-number">${userPosts.length}</span>
                            <span class="stat-label">Posts</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">1.4K</span>
                            <span class="stat-label">Followers</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">389</span>
                            <span class="stat-label">Following</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${totalLikes}</span>
                            <span class="stat-label">Total Likes</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 10px;">
                <button class="publish-btn" onclick="openCreatePostModal()">+ Create New Post</button>
                <button class="icon-btn-pill" onclick="openAuthModal('login')">⚙️ Account Settings</button>
            </div>
        </div>

        <div style="margin-top: 24px;">
            <h3 style="margin-bottom: 16px; font-size: 18px;">Recent Activity (${userPosts.length})</h3>
            <div id="feed-container"></div>
        </div>
    `;

    renderPostsCustom(userPosts);
}

function showNotifications() {
    const modal = document.getElementById('notifications-modal');
    if (modal) modal.classList.add('active');
}

function showMessages() {
    const modal = document.getElementById('messages-modal');
    if (modal) modal.classList.add('active');
}

function setActiveNav(navId) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(navId);
    if (btn) btn.classList.add('active');
}

// Feed Filter Pills
function setFeedFilter(filterType) {
    state.filter = filterType;
    document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
    const pill = document.getElementById(`filter-${filterType}`);
    if (pill) pill.classList.add('active');

    if (state.activeView !== 'home') {
        showHome();
    } else {
        renderPosts();
    }
    showToast(`Filter: ${filterType.toUpperCase()}`, 'success');
}

// Search and Tag Click
function searchTag(tag) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '#' + tag;
        filterPostsByQuery('#' + tag);
    }
}

function filterByAuthor(username) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = username;
        filterPostsByQuery(username);
    }
}

function filterPostsByQuery(query) {
    if (state.activeView !== 'home') {
        showHome();
    }
    const q = query.toLowerCase().trim();
    const filtered = state.posts.filter(p => 
        (p.postCaption && p.postCaption.toLowerCase().includes(q)) ||
        (p.username && p.username.toLowerCase().includes(q))
    );
    renderPostsCustom(filtered);
    showToast(`Found ${filtered.length} matching posts`, 'success');
}

// Story Viewer
function openStory(author, imgUrl, caption) {
    const modal = document.getElementById('story-modal');
    const storyImg = document.getElementById('story-img');
    const authorName = document.getElementById('story-author-name');
    const authorAvatar = document.getElementById('story-author-avatar');
    const storyCap = document.getElementById('story-caption');

    if (storyImg) storyImg.src = imgUrl;
    if (authorName) authorName.textContent = author;
    if (authorAvatar) authorAvatar.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
    if (storyCap) storyCap.textContent = caption;

    if (modal) modal.classList.add('active');

    // Reset progress animation
    const progress = document.getElementById('story-progress');
    if (progress) {
        progress.style.animation = 'none';
        progress.offsetHeight; // trigger reflow
        progress.style.animation = 'storyProgress 5s linear forwards';
    }

    setTimeout(() => {
        closeModal('story-modal');
    }, 5000);
}

function toggleFollow(btn) {
    btn.classList.toggle('following');
    const isFollowing = btn.classList.contains('following');
    btn.textContent = isFollowing ? 'Following' : 'Follow';
    showToast(isFollowing ? 'Creator followed! 🎉' : 'Unfollowed creator', 'success');
}

// Setup Event Listeners
function setupEventListeners() {
    // Nav Buttons
    const navHome = document.getElementById('nav-home');
    const navExplore = document.getElementById('nav-explore');
    const navNotif = document.getElementById('nav-notifications');
    const navMsg = document.getElementById('nav-messages');
    const navProfile = document.getElementById('nav-profile');

    if (navHome) navHome.onclick = showHome;
    if (navExplore) navExplore.onclick = showExplore;
    if (navNotif) navNotif.onclick = showNotifications;
    if (navMsg) navMsg.onclick = showMessages;
    if (navProfile) navProfile.onclick = showProfile;

    // Search bar
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            if (query.trim() === '') {
                renderPosts();
            } else {
                filterPostsByQuery(query);
            }
        });
    }

    // Story clicks
    const stories = document.querySelectorAll('.story-item');
    if (stories.length > 1) {
        stories[1].onclick = () => openStory('sarah_travels', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800', 'Sunset in the mountains! 🌄');
        if (stories[2]) stories[2].onclick = () => openStory('maya_art', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800', 'Morning coffee & sketching sessions ☕🎨');
        if (stories[3]) stories[3].onclick = () => openStory('alex_dev', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800', 'Coding in dark mode 🚀');
        if (stories[4]) stories[4].onclick = () => openStory('emma_design', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800', 'Design workshop recap ✨');
    }

    // Quick Post
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

// Custom render for filtered lists
function renderPostsCustom(postsList) {
    const container = document.getElementById('feed-container');
    if (!container) return;

    if (!postsList || !postsList.length) {
        container.innerHTML = `
            <div class="post-card" style="text-align: center; padding: 40px; color: var(--text-muted);">
                <p>No posts match this filter or search.</p>
                <button class="publish-btn" style="margin-top: 14px;" onclick="setFeedFilter('all')">Show All Posts</button>
            </div>
        `;
        return;
    }

    container.innerHTML = postsList.map(post => {
        const isLiked = (post.likes || []).includes(state.currentUser.userId);
        const likeCount = (post.likes || []).length;
        const commentCount = (post.comments || []).length;
        const formattedDate = formatTimeAgo(post.createdAt);
        const authorImg = post.userProfilePic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

        return `
            <article class="post-card" id="post-${post.postId}">
                <div class="post-header">
                    <div class="post-author" onclick="filterByAuthor('${escapeHtml(post.username)}')" style="cursor: pointer;">
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

// Modify renderPosts to respect filters
const originalRenderPosts = renderPosts;
renderPosts = function() {
    let list = [...state.posts];
    if (state.filter === 'trending') {
        list.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    } else if (state.filter === 'photos') {
        list = list.filter(p => !!p.postpicURL);
    } else if (state.filter === 'myposts') {
        list = list.filter(p => p.userId === state.currentUser.userId || p.username === state.currentUser.username);
    }
    renderPostsCustom(list);
};

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
    return text.replace(/#(\w+)/g, '<span class="hashtag" onclick="searchTag(\'$1\')">#$1</span>');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
}
