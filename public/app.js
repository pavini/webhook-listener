// Application state
let state = {
    socket: null,
    currentEndpoint: null,
    requests: [],
    isConnected: false,
    expandedRequests: new Set(),
    highlightedRequests: new Set()
};

// Utility functions
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const formatRelativeTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'há poucos segundos';
    if (diff < 3600000) return `há ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `há ${Math.floor(diff / 3600000)}h`;
    return new Date(timestamp).toLocaleString('pt-BR');
};

const isValidJSON = (str) => {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
};

const formatBody = (body) => {
    try {
        const parsed = JSON.parse(body);
        return JSON.stringify(parsed, null, 2);
    } catch {
        return body;
    }
};

// Socket management with retry logic
class SocketManager {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isReconnecting = false;
    }

    connect() {
        try {
            this.socket = io();
            this.setupEventListeners();
        } catch (error) {
            console.error('Socket connection failed:', error);
            this.scheduleReconnect();
        }
    }

    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
            state.isConnected = true;
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
            updateConnectionStatus();
            
            if (state.currentEndpoint) {
                this.socket.emit('join-endpoint', state.currentEndpoint.id);
                setTimeout(() => loadRequests(), 1000);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            state.isConnected = false;
            updateConnectionStatus();
            this.scheduleReconnect();
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.scheduleReconnect();
        });

        this.socket.on('new-request', (request) => {
            state.requests.unshift(request);
            updateRequestsList();
            updateRequestCount();
        });

        this.socket.on('requests-cleared', () => {
            state.requests = [];
            updateRequestsList();
            updateRequestCount();
        });

        this.socket.on('request-deleted', (requestId) => {
            state.requests = state.requests.filter(req => req.id !== requestId);
            updateRequestsList();
            updateRequestCount();
        });
    }

    scheduleReconnect() {
        if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;
        
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        setTimeout(() => {
            console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            this.connect();
        }, delay);
    }

    emit(event, data) {
        if (this.socket && state.isConnected) {
            this.socket.emit(event, data);
        }
    }
}

// Request rendering optimization
class RequestRenderer {
    constructor() {
        this.lastRenderedHtml = '';
        this.requestElements = new Map();
    }

    render(requests) {
        const container = document.getElementById('requestsList');
        
        if (!state.currentEndpoint) {
            container.innerHTML = `
                <div class="no-endpoint">
                    <h3>Nenhum endpoint ativo</h3>
                    <p>Crie um endpoint acima para começar a receber webhooks</p>
                </div>
            `;
            return;
        }
        
        if (requests.length === 0) {
            container.innerHTML = `
                <div class="no-requests">
                    <h3>Aguardando webhooks...</h3>
                    <p>Envie uma requisição para a URL do seu endpoint para ver os detalhes aqui</p>
                </div>
            `;
            return;
        }

        // Only re-render if requests changed
        const newHtml = this.generateRequestsHtml(requests);
        if (newHtml === this.lastRenderedHtml) {
            return;
        }

        container.innerHTML = newHtml;
        this.lastRenderedHtml = newHtml;

        // Apply syntax highlighting and restore state
        this.postRender(requests);
    }

    generateRequestsHtml(requests) {
        return requests.map(request => `
            <div class="request-item" onclick="toggleDetails('${request.id}')">
                <div class="request-main">
                    <div class="request-header">
                        <div>
                            <span class="request-method method-${request.method}">${request.method}</span>
                            <span style="margin-left: 10px; color: #8b949e; font-size: 12px;">Clique para ver detalhes</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="request-time">${formatRelativeTime(request.timestamp)}</div>
                            <button class="action-btn delete" onclick="deleteRequest(event, '${request.id}')" title="Deletar request">🗑️</button>
                        </div>
                    </div>
                    <div class="request-url">${request.url}</div>
                </div>
                <div class="request-details" id="details-${request.id}">
                    <div class="detail-section">
                        <h4>Headers</h4>
                        <div class="detail-content" id="headers-${request.id}">
                            <button class="copy-icon" onclick="copyDetailContent(event, 'headers-${request.id}')" title="Copiar">📋</button>
                            <div class="copy-feedback" id="feedback-headers-${request.id}">Copiado!</div>
                        </div>
                    </div>
                    ${request.body ? `
                        <div class="detail-section">
                            <h4>Body</h4>
                            <div class="detail-content" id="body-${request.id}">
                                <button class="copy-icon" onclick="copyDetailContent(event, 'body-${request.id}')" title="Copiar">📋</button>
                                <div class="copy-feedback" id="feedback-body-${request.id}">Copiado!</div>
                            </div>
                        </div>
                    ` : ''}
                    ${Object.keys(request.query).length > 0 ? `
                        <div class="detail-section">
                            <h4>Query Parameters</h4>
                            <div class="detail-content" id="query-${request.id}">
                                <button class="copy-icon" onclick="copyDetailContent(event, 'query-${request.id}')" title="Copiar">📋</button>
                                <div class="copy-feedback" id="feedback-query-${request.id}">Copiado!</div>
                            </div>
                        </div>
                    ` : ''}
                    <div class="detail-section">
                        <h4>Info</h4>
                        <div class="detail-content" id="info-${request.id}">
                            <button class="copy-icon" onclick="copyDetailContent(event, 'info-${request.id}')" title="Copiar">📋</button>
                            <div class="copy-feedback" id="feedback-info-${request.id}">Copiado!</div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    postRender(requests) {
        requests.forEach(request => {
            // Lazy load syntax highlighting only for expanded requests
            if (state.expandedRequests.has(request.id)) {
                this.applySyntaxHighlighting(request);
                this.restoreExpandedState(request.id);
            } else {
                this.loadBasicContent(request);
            }
        });
    }

    loadBasicContent(request) {
        // Load content without syntax highlighting
        const headersElement = document.getElementById(`headers-${request.id}`);
        if (headersElement && !state.highlightedRequests.has(request.id)) {
            const copyIcon = headersElement.querySelector('.copy-icon');
            const copyFeedback = headersElement.querySelector('.copy-feedback');
            const headersJson = JSON.stringify(request.headers, null, 2);
            headersElement.innerHTML = `<pre><code>${headersJson}</code></pre>`;
            headersElement.appendChild(copyIcon);
            headersElement.appendChild(copyFeedback);
        }

        if (request.body) {
            const bodyElement = document.getElementById(`body-${request.id}`);
            if (bodyElement && !state.highlightedRequests.has(request.id)) {
                const copyIcon = bodyElement.querySelector('.copy-icon');
                const copyFeedback = bodyElement.querySelector('.copy-feedback');
                const bodyContent = formatBody(request.body);
                bodyElement.innerHTML = `<pre><code>${bodyContent}</code></pre>`;
                bodyElement.appendChild(copyIcon);
                bodyElement.appendChild(copyFeedback);
            }
        }

        if (Object.keys(request.query).length > 0) {
            const queryElement = document.getElementById(`query-${request.id}`);
            if (queryElement && !state.highlightedRequests.has(request.id)) {
                const copyIcon = queryElement.querySelector('.copy-icon');
                const copyFeedback = queryElement.querySelector('.copy-feedback');
                const queryJson = JSON.stringify(request.query, null, 2);
                queryElement.innerHTML = `<pre><code>${queryJson}</code></pre>`;
                queryElement.appendChild(copyIcon);
                queryElement.appendChild(copyFeedback);
            }
        }

        const infoElement = document.getElementById(`info-${request.id}`);
        if (infoElement && !state.highlightedRequests.has(request.id)) {
            const copyIcon = infoElement.querySelector('.copy-icon');
            const copyFeedback = infoElement.querySelector('.copy-feedback');
            const infoContent = `IP: ${request.ip}\nID: ${request.id}\nEndpoint ID: ${request.endpoint_id}`;
            infoElement.innerHTML = `<pre><code>${infoContent}</code></pre>`;
            infoElement.appendChild(copyIcon);
            infoElement.appendChild(copyFeedback);
        }
    }

    applySyntaxHighlighting(request) {
        if (state.highlightedRequests.has(request.id)) {
            return;
        }

        // Headers
        const headersElement = document.getElementById(`headers-${request.id}`);
        if (headersElement) {
            const copyIcon = headersElement.querySelector('.copy-icon');
            const copyFeedback = headersElement.querySelector('.copy-feedback');
            const headersJson = JSON.stringify(request.headers, null, 2);
            headersElement.innerHTML = `<pre><code class="language-json">${hljs.highlight(headersJson, {language: 'json'}).value}</code></pre>`;
            headersElement.appendChild(copyIcon);
            headersElement.appendChild(copyFeedback);
        }

        // Body
        if (request.body) {
            const bodyElement = document.getElementById(`body-${request.id}`);
            if (bodyElement) {
                const copyIcon = bodyElement.querySelector('.copy-icon');
                const copyFeedback = bodyElement.querySelector('.copy-feedback');
                const bodyContent = formatBody(request.body);
                if (isValidJSON(bodyContent)) {
                    bodyElement.innerHTML = `<pre><code class="language-json">${hljs.highlight(bodyContent, {language: 'json'}).value}</code></pre>`;
                } else {
                    bodyElement.innerHTML = `<pre><code>${bodyContent}</code></pre>`;
                }
                bodyElement.appendChild(copyIcon);
                bodyElement.appendChild(copyFeedback);
            }
        }

        // Query Parameters
        if (Object.keys(request.query).length > 0) {
            const queryElement = document.getElementById(`query-${request.id}`);
            if (queryElement) {
                const copyIcon = queryElement.querySelector('.copy-icon');
                const copyFeedback = queryElement.querySelector('.copy-feedback');
                const queryJson = JSON.stringify(request.query, null, 2);
                queryElement.innerHTML = `<pre><code class="language-json">${hljs.highlight(queryJson, {language: 'json'}).value}</code></pre>`;
                queryElement.appendChild(copyIcon);
                queryElement.appendChild(copyFeedback);
            }
        }

        // Info
        const infoElement = document.getElementById(`info-${request.id}`);
        if (infoElement) {
            const copyIcon = infoElement.querySelector('.copy-icon');
            const copyFeedback = infoElement.querySelector('.copy-feedback');
            const infoContent = `IP: ${request.ip}\nID: ${request.id}\nEndpoint ID: ${request.endpoint_id}`;
            infoElement.innerHTML = `<pre><code>${infoContent}</code></pre>`;
            infoElement.appendChild(copyIcon);
            infoElement.appendChild(copyFeedback);
        }

        state.highlightedRequests.add(request.id);
    }

    restoreExpandedState(requestId) {
        const details = document.getElementById(`details-${requestId}`);
        if (details) {
            details.classList.add('show');
        }
    }
}

// Initialize components
const socketManager = new SocketManager();
const requestRenderer = new RequestRenderer();

// UI functions
function updateConnectionStatus() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (state.isConnected) {
        statusDot.classList.remove('disconnected');
        statusText.textContent = state.currentEndpoint ? 'Monitorando' : 'Conectado';
    } else {
        statusDot.classList.add('disconnected');
        statusText.textContent = 'Desconectado';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.classList.add('show');
    setTimeout(() => {
        successDiv.classList.remove('show');
    }, 3000);
}

function showLoading(elementId, show = true) {
    const element = document.getElementById(elementId);
    if (show) {
        element.innerHTML = '<span class="loading-spinner"></span> Carregando...';
        element.disabled = true;
    } else {
        element.disabled = false;
    }
}

// Debounced endpoint creation
const debouncedCreateEndpoint = debounce(async () => {
    const nameInput = document.getElementById('endpointName');
    const createBtn = document.getElementById('createBtn');
    const name = nameInput.value.trim();
    
    if (!name) {
        showError('Nome do endpoint é obrigatório');
        return;
    }
    
    showLoading('createBtn');
    
    try {
        const response = await fetch('/api/endpoints', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao criar endpoint');
        }
        
        state.currentEndpoint = data;
        localStorage.setItem('webhookEndpoint', JSON.stringify(data));
        socketManager.emit('join-endpoint', data.id);
        
        updateEndpointUI(data);
        loadRequests();
        nameInput.value = '';
        showSuccess('Endpoint criado com sucesso!');
        updateConnectionStatus();
        
    } catch (error) {
        showError(error.message);
    } finally {
        createBtn.textContent = 'Criar Endpoint';
        createBtn.disabled = false;
    }
}, 300);

function updateEndpointUI(data) {
    document.getElementById('endpointUrl').textContent = data.url;
    document.getElementById('endpointUrlContainer').classList.add('show');
    document.getElementById('endpointInfo').classList.add('show');
    document.getElementById('endpointName').textContent = `Endpoint: ${data.name}`;
    document.getElementById('endpointCreated').textContent = `Criado em: ${new Date(data.created_at).toLocaleString('pt-BR')}`;
    
    document.getElementById('controlsSection').style.display = 'flex';
    document.getElementById('requestsContainer').style.display = 'block';
    document.getElementById('clearBtn').disabled = false;
    document.getElementById('newEndpointBtn').style.display = 'inline-block';
}

async function loadRequests() {
    if (!state.currentEndpoint) return;
    
    try {
        const response = await fetch(`/api/endpoints/${state.currentEndpoint.id}/requests`);
        const data = await response.json();
        
        if (response.ok) {
            state.requests = data;
            updateRequestsList();
            updateRequestCount();
        }
    } catch (error) {
        console.error('Error loading requests:', error);
    }
}

function updateRequestsList() {
    requestRenderer.render(state.requests);
}

function updateRequestCount() {
    const count = state.requests.length;
    document.getElementById('requestCount').textContent = 
        `${count} request${count !== 1 ? 's' : ''}`;
}

function toggleDetails(requestId) {
    const details = document.getElementById(`details-${requestId}`);
    const isExpanded = details.classList.contains('show');
    
    if (isExpanded) {
        details.classList.remove('show');
        state.expandedRequests.delete(requestId);
    } else {
        details.classList.add('show');
        state.expandedRequests.add(requestId);
        
        // Apply syntax highlighting on expand
        const request = state.requests.find(r => r.id === requestId);
        if (request) {
            requestRenderer.applySyntaxHighlighting(request);
        }
    }
}

function copyEndpointUrl() {
    const url = document.getElementById('endpointUrl').textContent;
    navigator.clipboard.writeText(url).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = 'Copiado!';
        btn.style.backgroundColor = '#2ea043';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = '#238636';
        }, 2000);
    });
}

function copyDetailContent(event, elementId) {
    event.stopPropagation();
    
    const element = document.getElementById(elementId);
    let content = element.textContent;
    
    const preElement = element.querySelector('pre code');
    if (preElement) {
        content = preElement.textContent;
    }
    
    const copyIcon = element.querySelector('.copy-icon');
    const copyFeedback = element.querySelector('.copy-feedback');
    if (copyIcon) {
        content = content.replace('📋', '').replace('Copiado!', '').trim();
    }
    
    navigator.clipboard.writeText(content).then(() => {
        const feedbackElement = element.querySelector('.copy-feedback');
        if (feedbackElement) {
            feedbackElement.classList.add('show');
            setTimeout(() => {
                feedbackElement.classList.remove('show');
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

async function clearRequests() {
    if (!state.currentEndpoint) return;
    
    if (confirm('Tem certeza que deseja limpar todas as requisições deste endpoint?')) {
        try {
            const response = await fetch(`/api/endpoints/${state.currentEndpoint.id}/requests`, { 
                method: 'DELETE' 
            });
            
            if (response.ok) {
                state.requests = [];
                updateRequestsList();
                updateRequestCount();
                showSuccess('Requests limpos com sucesso!');
            } else {
                throw new Error('Erro ao limpar requests');
            }
        } catch (error) {
            showError(error.message);
        }
    }
}

function loadSavedEndpoint() {
    const savedEndpoint = localStorage.getItem('webhookEndpoint');
    if (savedEndpoint) {
        try {
            const endpointData = JSON.parse(savedEndpoint);
            state.currentEndpoint = endpointData;
            
            if (state.isConnected) {
                socketManager.emit('join-endpoint', endpointData.id);
            }
            
            updateEndpointUI(endpointData);
            loadRequests();
            updateConnectionStatus();
            
        } catch (error) {
            console.error('Error loading saved endpoint:', error);
            localStorage.removeItem('webhookEndpoint');
        }
    }
}

function clearEndpointAndCreateNew() {
    if (confirm('Tem certeza que deseja criar um novo endpoint? O endpoint atual será perdido.')) {
        localStorage.removeItem('webhookEndpoint');
        
        state.currentEndpoint = null;
        state.requests = [];
        state.expandedRequests.clear();
        state.highlightedRequests.clear();
        
        document.getElementById('endpointUrlContainer').classList.remove('show');
        document.getElementById('endpointInfo').classList.remove('show');
        document.getElementById('controlsSection').style.display = 'none';
        document.getElementById('requestsContainer').style.display = 'none';
        document.getElementById('newEndpointBtn').style.display = 'none';
        
        updateRequestsList();
        updateRequestCount();
        updateConnectionStatus();
        
        document.getElementById('endpointName').value = '';
        showSuccess('Agora você pode criar um novo endpoint!');
    }
}

async function deleteRequest(event, requestId) {
    event.stopPropagation();
    
    try {
        const response = await fetch(`/api/requests/${requestId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao deletar request');
        }
        
        showSuccess('Request deletado com sucesso!');
        
    } catch (error) {
        showError(error.message);
    }
}

async function loadCleanupInfo() {
    try {
        const response = await fetch('/api/cleanup-info');
        const data = await response.json();
        
        const lastCleanupElement = document.getElementById('lastCleanup');
        
        if (data.lastCleanup) {
            const cleanupDate = new Date(data.lastCleanup).toLocaleString('pt-BR');
            const stats = data.lastCleanupStats;
            lastCleanupElement.textContent = `Última limpeza: ${cleanupDate} (${stats.endpointsDeleted} endpoints e ${stats.requestsDeleted} requests removidos)`;
        } else {
            lastCleanupElement.textContent = 'Nenhuma limpeza realizada ainda.';
        }
        
    } catch (error) {
        console.error('Error loading cleanup info:', error);
        document.getElementById('lastCleanup').textContent = '';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize socket connection
    socketManager.connect();
    state.socket = socketManager.socket;
    
    // Load saved endpoint and cleanup info
    loadSavedEndpoint();
    loadCleanupInfo();
    
    // Setup event listeners
    document.getElementById('endpointName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            debouncedCreateEndpoint();
        }
    });
    
    // Update connection status
    updateConnectionStatus();
    
    // Update relative timestamps every minute
    setInterval(() => {
        if (state.requests.length > 0) {
            updateRequestsList();
        }
    }, 60000);
});

// Global functions for onclick handlers
window.createEndpoint = debouncedCreateEndpoint;
window.toggleDetails = toggleDetails;
window.copyEndpointUrl = copyEndpointUrl;
window.copyDetailContent = copyDetailContent;
window.clearRequests = clearRequests;
window.clearEndpointAndCreateNew = clearEndpointAndCreateNew;
window.deleteRequest = deleteRequest;