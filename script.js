// ========================================
// EVOSTORE - App Store JavaScript
// Firebase Realtime Database Integration
// ========================================

// ========================================
// FIREBASE CONFIGURATION
// ========================================
const FIREBASE_CONFIG = {
    databaseURL: 'https://ecoin-b7697-default-rtdb.firebaseio.com'
};

// Inicializa Firebase (versão simplificada sem SDK)
class FirebaseService {
    constructor(databaseURL) {
        this.databaseURL = databaseURL;
    }

    async get(path) {
        try {
            const response = await fetch(`${this.databaseURL}/${path}.json`);
            if (!response.ok) throw new Error('Erro ao buscar dados');
            return await response.json();
        } catch (error) {
            console.error('Firebase GET Error:', error);
            return null;
        }
    }

    async set(path, data) {
        try {
            const response = await fetch(`${this.databaseURL}/${path}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Erro ao salvar dados');
            return await response.json();
        } catch (error) {
            console.error('Firebase SET Error:', error);
            return null;
        }
    }

    async push(path, data) {
        try {
            const response = await fetch(`${this.databaseURL}/${path}.json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Erro ao enviar dados');
            return await response.json();
        } catch (error) {
            console.error('Firebase PUSH Error:', error);
            return null;
        }
    }
}

const firebase = new FirebaseService(FIREBASE_CONFIG.databaseURL);

// ========================================
// STATE MANAGEMENT
// ========================================
// APPS_DATABASE agora é carregado de apps.js
let allApps = [...APPS_DATABASE];
let currentApp = null;
let userRating = 0;
let appComments = {};
let installedApps = new Set();

// ========================================
// DOM ELEMENTS
// ========================================
const appsGrid = document.getElementById('appsGrid');
const appModal = document.getElementById('appModal');
const modalClose = document.getElementById('modalClose');
const searchInput = document.getElementById('searchInput');
const submitReviewBtn = document.getElementById('submitReview');
const btnInstall = document.getElementById('btnInstall');
const toast = document.getElementById('toast');
const userCommentTextarea = document.getElementById('userComment');
const charCountSpan = document.getElementById('charCount');

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('EVOSTORE iniciado...');
    
    // Carrega comentários do Firebase
    await loadCommentsFromFirebase();
    
    // Renderiza apps
    renderApps(allApps);
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('EVOSTORE pronto para usar');
});

// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', handleSearch);
    
    // Modal
    modalClose.addEventListener('click', closeModal);
    appModal.addEventListener('click', (e) => {
        if (e.target === appModal) closeModal();
    });
    
    // Review
    submitReviewBtn.addEventListener('click', submitReview);
    userCommentTextarea.addEventListener('input', updateCharCount);
    
    // Install button
    btnInstall.addEventListener('click', handleInstall);
    
    // Star rating input
    document.querySelectorAll('.star-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            userRating = parseInt(e.target.dataset.star);
            updateStarButtons();
        });
    });
    
    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// ========================================
// RENDER FUNCTIONS
// ========================================
function renderApps(apps) {
    appsGrid.innerHTML = '';
    
    if (apps.length === 0) {
        appsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 3rem;">Nenhum app encontrado</p>';
        return;
    }
    
    apps.forEach((app, index) => {
        const avgRating = calculateAverageRating(app.id);
        const ratingCount = appComments[app.id]?.length || 0;
        
        const card = document.createElement('div');
        card.className = 'app-card';
        card.style.animation = `fadeIn 0.6s ease-out ${index * 0.05}s backwards`;
        
        card.innerHTML = `
            <img src="${app.icon}" class="app-icon" alt="${app.name}">
            <h3 class="app-name">${app.name}</h3>
            <p class="app-developer">${app.developer}</p>
            <div class="app-rating">
                <span>${getStarsDisplay(avgRating)}</span>
                <span>${avgRating.toFixed(1)}</span>
            </div>
        `;
        
        card.addEventListener('click', () => openModal(app));
        appsGrid.appendChild(card);
    });
}

function renderModalContent(app) {
    const avgRating = calculateAverageRating(app.id);
    const ratingCount = appComments[app.id]?.length || 0;
    
    document.getElementById('modalIcon').innerHTML = 
    `<img src="${app.icon}" class="modal-icon-img">`;
    document.getElementById('modalName').textContent = app.name;
    document.getElementById('modalDeveloper').textContent = app.developer;
    document.getElementById('modalDescription').textContent = app.description;
    document.getElementById('modalSize').textContent = app.size;
    document.getElementById('modalVersion').textContent = app.version;
    document.getElementById('modalDevInfo').textContent = app.devInfo;
    
    // Rating
    document.getElementById('modalStars').innerHTML = getStarsDisplay(avgRating);
    document.getElementById('modalRatingText').textContent = `${avgRating.toFixed(1)} (${ratingCount} avaliações)`;
    
    // Comments
    renderComments(app.id);
    
    // Install button
    updateInstallButton(app.id);
}

function renderComments(appId) {
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '';
    
    const comments = appComments[appId] || [];
    
    if (comments.length === 0) {
        commentsList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">Nenhum comentário ainda</p>';
        return;
    }
    
    comments.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        
        const date = new Date(comment.timestamp).toLocaleDateString('pt-BR');
        
        commentDiv.innerHTML = `
            <div class="comment-header">
                <span class="comment-rating">${getStarsDisplay(comment.rating)}</span>
                <span class="comment-date">${date}</span>
            </div>
            <p class="comment-text">${escapeHtml(comment.text)}</p>
        `;
        
        commentsList.appendChild(commentDiv);
    });
}

// ========================================
// MODAL FUNCTIONS
// ========================================
function openModal(app) {
    currentApp = app;
    userRating = 0;
    userCommentTextarea.value = '';
    updateCharCount();
    updateStarButtons();
    
    renderModalContent(app);
    appModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    appModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentApp = null;
}

// ========================================
// REVIEW FUNCTIONS
// ========================================
async function submitReview() {
    if (!currentApp) return;
    
    const comment = userCommentTextarea.value.trim();
    
    if (userRating === 0) {
        showToast('❌ Selecione uma classificação');
        return;
    }
    
    if (!comment) {
        showToast('❌ Digite um comentário');
        return;
    }
    
    try {
        const newComment = {
            appId: currentApp.id,
            rating: userRating,
            text: comment,
            timestamp: new Date().toISOString()
        };
        
        // Inicializa array se não existir
        if (!appComments[currentApp.id]) {
            appComments[currentApp.id] = [];
        }
        
        // Adiciona ao array local
        appComments[currentApp.id].push(newComment);
        
        // Salva no Firebase
        const path = `comments/${currentApp.id}`;
        await firebase.push(path, newComment);
        
        // Limpa formulário
        userRating = 0;
        userCommentTextarea.value = '';
        updateCharCount();
        updateStarButtons();
        
        // Atualiza comentários
        renderComments(currentApp.id);
        renderModalContent(currentApp);
        
        showToast('✅ Avaliação enviada com sucesso!');
    } catch (error) {
        console.error('Erro ao enviar avaliação:', error);
        showToast('❌ Erro ao enviar avaliação');
    }
}

function updateStarButtons() {
    document.querySelectorAll('.star-btn').forEach((btn, index) => {
        if (index + 1 <= userRating) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function updateCharCount() {
    const count = userCommentTextarea.value.length;
    charCountSpan.textContent = count;
    
    if (count > 400) {
        userCommentTextarea.style.borderColor = 'var(--secondary)';
    } else {
        userCommentTextarea.style.borderColor = 'var(--border-color)';
    }
}

function handleInstall() {
    if (!currentApp) return;

    if (!currentApp.apk) {
        showToast('❌ APK não disponível');
        return;
    }

    // Download real do APK
    const link = document.createElement('a');
    link.href = currentApp.apk;
    link.download = currentApp.name + '.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`📥 Baixando ${currentApp.name}...`);
}

function updateInstallButton(appId) {
    const isInstalled = installedApps.has(appId);
    btnInstall.textContent = isInstalled ? '✓ Instalado' : 'Instalar';
    btnInstall.classList.toggle('installed', isInstalled);
    btnInstall.disabled = isInstalled;
}

// ========================================
// SEARCH FUNCTION
// ========================================
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
        renderApps(allApps);
        return;
    }
    
    const filtered = allApps.filter(app => 
        app.name.toLowerCase().includes(query) ||
        app.developer.toLowerCase().includes(query) ||
        app.description.toLowerCase().includes(query)
    );
    
    renderApps(filtered);
}

// ========================================
// FIREBASE FUNCTIONS
// ========================================
async function loadCommentsFromFirebase() {
    try {
        const data = await firebase.get('comments');
        
        if (data) {
            // Reorganiza dados do Firebase para nosso formato
            Object.keys(data).forEach(appId => {
                if (Array.isArray(data[appId])) {
                    // Se for array direto
                    appComments[appId] = data[appId];
                } else {
                    // Se for objeto com IDs
                    appComments[appId] = Object.values(data[appId]);
                }
            });
        }
        
        console.log('Comentários carregados:', appComments);
    } catch (error) {
        console.error('Erro ao carregar comentários:', error);
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function getStarsDisplay(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '★'.repeat(fullStars);
    
    if (hasHalfStar) {
        stars += '⭐'; // Representa meia estrela visualmente
    }
    
    // Preenche com estrelas vazias
    const emptyStars = 5 - Math.ceil(rating);
    stars += '☆'.repeat(emptyStars);
    
    return stars;
}

function calculateAverageRating(appId) {
    const comments = appComments[appId] || [];
    
    if (comments.length === 0) return 0;
    
    const total = comments.reduce((sum, comment) => sum + (comment.rating || 0), 0);
    return total / comments.length;
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// DADOS DE TESTE
// ========================================
// Carrega dados de teste no Firebase quando o app inicia
async function loadTestData() {
    console.log('Carregando dados de teste...');
    
    // Comentários de teste para o app de teste
    const testComments = {
        'app-001': [
            {
                appId: 'app-001',
                rating: 5,
                text: 'Excelente app! Muito intuitivo e rápido. Recomendo!',
                timestamp: new Date(Date.now() - 86400000).toISOString()
            },
            {
                appId: 'app-001',
                rating: 4,
                text: 'Bom app, mas gostaria de mais opções de personalização.',
                timestamp: new Date(Date.now() - 172800000).toISOString()
            },
            {
                appId: 'app-001',
                rating: 5,
                text: 'Perfeito! Sincroniza tudo perfeitamente entre meus dispositivos.',
                timestamp: new Date(Date.now() - 259200000).toISOString()
            }
        ]
    };
    
    try {
        await firebase.set('comments', testComments);
        console.log('Dados de teste salvos com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar dados de teste:', error);
    }
}

// Descomente para carregar dados de teste
// loadTestData();

// ========================================
// CONSOLE INFO
// ========================================
console.log(`
╔════════════════════════════════════════╗
║         🚀 EVOSTORE v1.0.0            ║
║      Premium App Store Experience      ║
╚════════════════════════════════════════╝

📱 Apps Carregados: ${APPS_DATABASE.length}
🔥 Firebase URL: ${FIREBASE_CONFIG.databaseURL}
💬 Sistema de Comentários: Ativo
⭐ Sistema de Avaliações: Ativo

Desenvolvido com ❤️ para melhor experiência
`);
