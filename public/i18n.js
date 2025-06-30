// Internationalization system for Webhook Listener
class I18n {
    constructor() {
        this.currentLanguage = this.getStoredLanguage() || 'pt-BR';
        this.translations = {
            'pt-BR': {
                // Header
                'app.title': 'Webhook Listener',
                'app.subtitle': 'Capture e monitore webhooks em tempo real - Multi-usuário',
                
                // Cleanup notice
                'cleanup.notice': 'Limpeza automática:',
                'cleanup.description': 'Dados são removidos automaticamente após 60 dias para manter o sistema otimizado.',
                
                // User endpoints section
                'user.endpoints.title': 'Meus Endpoints',
                'user.endpoints.empty': 'Você ainda não tem endpoints',
                'user.endpoints.empty.description': 'Crie seu primeiro endpoint abaixo',
                'user.endpoints.switch': 'Alternar para este endpoint',
                'user.endpoints.delete': 'Deletar endpoint',
                'user.endpoints.confirm.delete': 'Tem certeza que deseja deletar este endpoint? Todos os requests serão perdidos.',
                'user.endpoints.created': 'Criado em',
                'user.endpoints.requests.count': 'requests',
                
                // Endpoint section
                'endpoint.create.title': 'Criar Novo Endpoint',
                'endpoint.input.placeholder': 'Nome do seu endpoint (ex: meu-app-payment)',
                'endpoint.create.button': 'Criar Endpoint',
                'endpoint.new.button': 'Novo Endpoint',
                'endpoint.copy.button': 'Copiar',
                
                // Controls
                'status.disconnected': 'Desconectado',
                'status.connected': 'Conectado',
                'status.requests': 'requests',
                'controls.clear.button': 'Limpar Requests',
                
                // No endpoint state
                'no-endpoint.title': 'Nenhum endpoint ativo',
                'no-endpoint.description': 'Crie um endpoint acima para começar a receber webhooks',
                
                // Request details
                'request.method': 'Método',
                'request.url': 'URL',
                'request.timestamp': 'Timestamp',
                'request.headers': 'Headers',
                'request.body': 'Body',
                'request.query': 'Query Params',
                'request.ip': 'IP',
                'request.userAgent': 'User Agent',
                
                // Messages
                'message.endpoint.created': 'Endpoint criado com sucesso!',
                'message.endpoint.copied': 'URL copiada para a área de transferência!',
                'message.requests.cleared': 'Requests limpos com sucesso!',
                'message.error.endpoint.exists': 'Este endpoint já existe. Escolha outro nome.',
                'message.error.endpoint.invalid': 'Nome do endpoint inválido. Use apenas letras, números e hífens.',
                'message.error.endpoint.empty': 'Por favor, digite um nome para o endpoint.',
                
                // Language
                'language.selector': 'Idioma',
                'language.portuguese': 'Português',
                'language.english': 'English'
            },
            'en': {
                // Header
                'app.title': 'Webhook Listener',
                'app.subtitle': 'Capture and monitor webhooks in real-time - Multi-user',
                
                // Cleanup notice
                'cleanup.notice': 'Automatic cleanup:',
                'cleanup.description': 'Data is automatically removed after 60 days to keep the system optimized.',
                
                // User endpoints section
                'user.endpoints.title': 'My Endpoints',
                'user.endpoints.empty': 'You don\'t have any endpoints yet',
                'user.endpoints.empty.description': 'Create your first endpoint below',
                'user.endpoints.switch': 'Switch to this endpoint',
                'user.endpoints.delete': 'Delete endpoint',
                'user.endpoints.confirm.delete': 'Are you sure you want to delete this endpoint? All requests will be lost.',
                'user.endpoints.created': 'Created on',
                'user.endpoints.requests.count': 'requests',
                
                // Endpoint section
                'endpoint.create.title': 'Create New Endpoint',
                'endpoint.input.placeholder': 'Your endpoint name (e.g., my-app-payment)',
                'endpoint.create.button': 'Create Endpoint',
                'endpoint.new.button': 'New Endpoint',
                'endpoint.copy.button': 'Copy',
                
                // Controls
                'status.disconnected': 'Disconnected',
                'status.connected': 'Connected',
                'status.requests': 'requests',
                'controls.clear.button': 'Clear Requests',
                
                // No endpoint state
                'no-endpoint.title': 'No active endpoint',
                'no-endpoint.description': 'Create an endpoint above to start receiving webhooks',
                
                // Request details
                'request.method': 'Method',
                'request.url': 'URL',
                'request.timestamp': 'Timestamp',
                'request.headers': 'Headers',
                'request.body': 'Body',
                'request.query': 'Query Params',
                'request.ip': 'IP',
                'request.userAgent': 'User Agent',
                
                // Messages
                'message.endpoint.created': 'Endpoint created successfully!',
                'message.endpoint.copied': 'URL copied to clipboard!',
                'message.requests.cleared': 'Requests cleared successfully!',
                'message.error.endpoint.exists': 'This endpoint already exists. Choose another name.',
                'message.error.endpoint.invalid': 'Invalid endpoint name. Use only letters, numbers and hyphens.',
                'message.error.endpoint.empty': 'Please enter an endpoint name.',
                
                // Language
                'language.selector': 'Language',
                'language.portuguese': 'Português',
                'language.english': 'English'
            }
        };
        
        this.initializeLanguage();
    }
    
    getStoredLanguage() {
        return localStorage.getItem('webhook-listener-language');
    }
    
    setLanguage(language) {
        this.currentLanguage = language;
        localStorage.setItem('webhook-listener-language', language);
        this.updatePageLanguage();
        this.updateHtmlLang();
    }
    
    translate(key) {
        const translation = this.translations[this.currentLanguage]?.[key];
        return translation || key;
    }
    
    t(key) {
        return this.translate(key);
    }
    
    initializeLanguage() {
        this.updatePageLanguage();
        this.updateHtmlLang();
    }
    
    updateHtmlLang() {
        document.documentElement.lang = this.currentLanguage;
    }
    
    updatePageLanguage() {
        // Update all elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.translate(key);
            
            if (element.getAttribute('data-i18n-attr')) {
                const attr = element.getAttribute('data-i18n-attr');
                element.setAttribute(attr, translation);
            } else {
                element.textContent = translation;
            }
        });
        
        // Update language selector
        this.updateLanguageSelector();
    }
    
    updateLanguageSelector() {
        const selector = document.getElementById('languageSelector');
        if (selector) {
            selector.value = this.currentLanguage;
        }
    }
    
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    getAvailableLanguages() {
        return Object.keys(this.translations);
    }
}

// Initialize i18n system
const i18n = new I18n();

// Global function for easy access
window.t = function(key) {
    return i18n.translate(key);
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18n, i18n };
}