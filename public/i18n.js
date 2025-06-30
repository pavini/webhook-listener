// Internationalization system for Webhook Listener
class I18n {
    constructor() {
        this.currentLanguage = this.getStoredLanguage() || 'pt-BR';
        this.translations = {};
        
        this.loadTranslations();
    }
    
    getStoredLanguage() {
        return localStorage.getItem('webhook-listener-language');
    }
    
    
    async loadTranslations() {
        try {
            const response = await fetch(`locales/${this.currentLanguage}.json`);
            if (response.ok) {
                this.translations[this.currentLanguage] = await response.json();
            } else {
                console.error(`Failed to load translations for ${this.currentLanguage}`);
                // Fallback to pt-BR if current language fails
                if (this.currentLanguage !== 'pt-BR') {
                    const fallbackResponse = await fetch('locales/pt-BR.json');
                    if (fallbackResponse.ok) {
                        this.translations['pt-BR'] = await fallbackResponse.json();
                        this.currentLanguage = 'pt-BR';
                    }
                }
            }
        } catch (error) {
            console.error('Error loading translations:', error);
        }
        
        this.initializeLanguage();
    }
    
    async setLanguage(language) {
        this.currentLanguage = language;
        localStorage.setItem('webhook-listener-language', language);
        
        // Load translations for the new language if not already loaded
        if (!this.translations[language]) {
            try {
                const response = await fetch(`locales/${language}.json`);
                if (response.ok) {
                    this.translations[language] = await response.json();
                } else {
                    console.error(`Failed to load translations for ${language}`);
                    return;
                }
            } catch (error) {
                console.error('Error loading translations:', error);
                return;
            }
        }
        
        this.updatePageLanguage();
        this.updateHtmlLang();
    }
    
    translate(key, params = {}) {
        const translation = this.translations[this.currentLanguage]?.[key];
        if (!translation) return key;
        
        // Replace template variables ${variable} with provided parameters
        return translation.replace(/\$\{(\w+)\}/g, (match, paramKey) => {
            return params[paramKey] !== undefined ? params[paramKey] : match;
        });
    }
    
    t(key, params = {}) {
        return this.translate(key, params);
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
window.t = function(key, params = {}) {
    return i18n.translate(key, params);
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18n, i18n };
}