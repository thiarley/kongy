---
name: kongy-i18n-guidelines
description: Strict guidelines and workflows to ensure 100% internationalization (i18n) coverage in the Kongy project.
---

# Kongy Internationalization (i18n) Guidelines

This skill defines the mandatory standards for handling text and localization in the Kongy application. The goal is to ensure **ZERO hardcoded strings** in the user interface.

## 1. The Golden Rule

> **NEVER** write free text directly in `index.html` or TypeScript render functions. All user-facing text must be retrieved from the locale JSON files.

**Incorrect:**
```html
<button>Salvar</button>
<input placeholder="Digite o nome...">
```
```typescript
showToast('Operação realizada com sucesso', 'success');
```

**Correct:**
```html
<button><span data-i18n="actions.save"></span></button>
<input data-i18n-placeholder="common.name_placeholder">
```
```typescript
showToast(i18n.t('messages.success'), 'success');
```

## 2. Implementation Patterns

### A. Static HTML (`index.html`)

Use `data-i18n` attributes. The `I18n` service automatically populates these on load and language switch.

*   **Text Content**: `data-i18n="key.path"`
    *   `<h1 data-i18n="dashboard.title"></h1>`
*   **Placeholders**: `data-i18n-placeholder="key.path"`
    *   `<input type="text" data-i18n-placeholder="search.routes">`
*   **Titles/Tooltips**: `data-i18n-title="key.path"`
    *   `<button data-i18n-title="actions.refresh"><i class="ph ph-arrows-clockwise"></i></button>`
*   **ARIA Labels**: `data-i18n-aria="key.path"`
    *   `<button data-i18n-aria="nav.close_menu">...</button>`

### B. Dynamic TypeScript (`src/**/*.ts`)

Import and use the `i18n` service.

*   **Simple Fetch**:
    *   `const label = i18n.t('services.status');`
*   **Interpolation** (Dynamic values):
    *   JSON: `"welcome": "Bem-vindo, {name}!"`
    *   TS: `i18n.t('auth.welcome', { name: user.name })`

## 3. JSON Structure & Naming Conventions

Maintain a clean, hierarchical structure in `frontend/locales/*.json`.

*   **Top-level keys**: Group by Feature or Component (e.g., `auth`, `nav`, `services`, `routes`, `modals`).
*   **Common Actions**: Use a shared `actions` group for generic terms (Save, Cancel, Edit, Delete).
*   **Messages**: Use a `messages` group for toasts and notifications (Success, Error, Confirm).

**Example Structure:**
```json
{
  "actions": {
    "save": "Salvar",
    "cancel": "Cancelar"
  },
  "services": {
    "title": "Serviços",
    "create_success": "Serviço criado com sucesso"
  }
}
```

## 4. Workflow for New Features

When developing a new view or component:

1.  **Draft the UI**: Identify all text elements needed (Labels, Buttons, Placeholders, Error messages).
2.  **Update JSON**: Add the keys to `frontend/locales/pt-BR.json` (and `en-US.json`).
3.  **Implement Code**: use `data-i18n` attributes in HTML and `i18n.t()` in JS immediately. **Do not write the raw text first.**
4.  **Verify**: Switch the language in the app to ensure all elements update correctly.

## 5. Adding New Languages

To add a new language (e.g., Spanish `es-ES`):

1.  Create `frontend/locales/es-ES.json`.
2.  Copy keys from `pt-BR.json`.
3.  Translate values.
4.  Update `SUPPORTED_LOCALES` in `src/services/i18n.ts`.

---
**Violation of these guidelines results in broken interfaces for international users and requires painful refactoring later. Do it right the first time.**
