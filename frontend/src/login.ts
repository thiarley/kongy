import { i18n } from './services/i18n';
import { Auth } from './services/auth';
import './style.css'; // Ensure styles are loaded

const auth = new Auth();
let needsSetup = false;

// Initialize
async function init() {
    // Check if already logged in
    if (auth.isAuthenticated()) {
        window.location.href = '/';
        return;
    }

    // Initialize i18n
    await i18n.init();
    i18n.updateUI();

    // Set locale selector value
    const localeSelect = document.getElementById('locale-select') as HTMLSelectElement;
    if (localeSelect) {
        localeSelect.value = i18n.currentLocale;

        localeSelect.addEventListener('change', async (e) => {
            const target = e.target as HTMLSelectElement;
            await i18n.setLocale(target.value);
            updateViewStates();
        });
    }

    // Check if setup is needed
    try {
        const status = await auth.checkStatus();
        needsSetup = status.needs_setup;
        updateViewStates();
    } catch (error) {
        showError(i18n.t('messages.connection_error'));
    }
}

// Handle form submission
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usernameInput = document.getElementById('username') as HTMLInputElement;
        const passwordInput = document.getElementById('password') as HTMLInputElement;
        const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (submitBtn) submitBtn.disabled = true;
        hideError();

        try {
            if (needsSetup) {
                // Create first user
                const kongUrlInput = document.getElementById('kong_url') as HTMLInputElement;
                const kongUrl = kongUrlInput?.value?.trim();

                await auth.setup(username, password, kongUrl);
                needsSetup = false;

                // Update UI
                const setupNotice = document.getElementById('setup-notice');
                const loginSubtitle = document.getElementById('login-subtitle');
                const btnText = document.getElementById('btn-text');

                if (setupNotice) setupNotice.style.display = 'none';
                if (loginSubtitle) loginSubtitle.textContent = i18n.t('auth.login_title');
                if (btnText) btnText.textContent = i18n.t('auth.login_button');
            }

            // Login
            await auth.login(username, password);

            // Redirect to main app
            window.location.href = '/';

        } catch (error: any) {
            showError(error.message || 'Login failed');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

function updateViewStates() {
    const titleText = document.getElementById('login-title-text');
    const subtitle = document.getElementById('login-subtitle');
    const btnText = document.getElementById('btn-text');
    const setupNotice = document.getElementById('setup-notice');
    const btn = document.getElementById('submit-btn');
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const kongUrlGroup = document.getElementById('kong-url-group');

    if (needsSetup) {
        // Setup Mode Styles
        if (titleText) titleText.textContent = i18n.t('auth.setup_title');
        if (subtitle) subtitle.textContent = i18n.t('auth.setup_description');
        if (btnText) btnText.textContent = i18n.t('auth.setup_button');
        if (setupNotice) setupNotice.style.display = 'block';
        if (kongUrlGroup) kongUrlGroup.style.display = 'block';

        // Change button style to emphasize creation
        if (btn) btn.style.background = 'linear-gradient(135deg, var(--success), #059669)';

        // Add explicit placeholders
        if (usernameInput) usernameInput.placeholder = i18n.t('auth.new_username_placeholder');
        if (passwordInput) passwordInput.placeholder = i18n.t('auth.new_password_placeholder');
    } else {
        // Login Mode Styles
        if (titleText) titleText.textContent = i18n.t('app.title');
        if (subtitle) subtitle.textContent = i18n.t('auth.login_title');
        if (btnText) btnText.textContent = i18n.t('auth.login_button');
        if (setupNotice) setupNotice.style.display = 'none';
        if (kongUrlGroup) kongUrlGroup.style.display = 'none';

        if (btn) btn.style.background = ''; // Reset to default CSS

        if (usernameInput) usernameInput.placeholder = i18n.t('auth.username');
        if (passwordInput) passwordInput.placeholder = i18n.t('auth.password');
    }
}

// Error helpers
function showError(message: string) {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('visible');
    }
}

function hideError() {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
        errorEl.classList.remove('visible');
    }
}

// Start
init();
