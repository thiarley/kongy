---
name: kongy-ui-conventions
description: Guidelines, conventions, and best practices for UI development in the Kongy project, specifically focused on avoiding regressions and ensuring interactivity.
---

# Kongy UI Development & Best Practices

This skill outlines the architecture, conventions, and rules for developing the frontend of the Kongy application. It is designed to prevent common errors such as broken event listeners, malformed DOM, and "dead" buttons.

## 1. Architecture Overview

The project follows a **Vanilla TypeScript SPA** pattern with a clear separation of concerns:

- **`src/app.ts` (Controller)**: The entry point. It initializes the app, manages global state (`Store`), handles top-level routing (`switchView`), and **binds global event listeners** (Navigation, Toolbar Actions).
- **`src/ui.ts` (Renderer)**: Responsible strictly for **DOM manipulation**. It contains methods to render tables, lists, and forms. It does *not* contain business logic or API calls.
- **`src/views/*.ts` (View Logic)**: These modules (e.g., `ServicesView.ts`, `RoutesView.ts`) bridge the API and the UI. They fetch data and call `ui.renderX()`.
- **`index.html`**: Contains the static skeleton, including all Modals and View Containers (`div.view-section`).

## 2. Event Handling Strategy (CRITICAL)

The most common cause of bugs is missing or "dead" event listeners. Follow these rules:

### A. Global Static Buttons (Toolbar, Navigation, Modals)
**Where to bind:** `App.bindEvents()` in `src/app.ts`.

Any button that exists in `index.html` at startup (e.g., `#addServiceBtn`, `#settingsBtn`, `#saveSettingsBtn`) **MUST** have a listener attached in `app.ts`.

**Example:**
```typescript
// app.ts
bindEvents() {
    document.getElementById('addPluginBtn')?.addEventListener('click', () => {
         handleAddPlugin(this.ui);
    });
}
```

**⚠️ Warning:** When refactoring `app.ts`, ensure you do not accidentally remove listeners. If adding a new feature with a global button, add the listener here immediately.

### B. Dynamic Elements (Table Rows, Lists)
**Where to bind:** Inside the `render` function in `src/ui.ts` or the View callback functions.

Since these elements are created via `innerHTML = ...`, you must attach listeners *immediately* after creating them.

**Example:**
```typescript
// ui.ts -> renderRoutes()
tbody.innerHTML = routes.map(r => `... <button class="action-edit">Edit</button> ...`).join('');

// Bind immediately after innerHTML
tbody.querySelectorAll('.action-edit').forEach(btn => {
    btn.onclick = () => this.triggerEdit(route);
});
```

### C. Modal Actions (Save Buttons)
**Where to bind:**
1. **Generic Actions** (e.g., Settings): Bind in `app.ts`.
2. **Context-Specific Actions** (e.g., Edit Entity): Bind when opening the modal in `handleX` functions.

**Example (Context-Specific):**
```typescript
// Views/ServicesView.ts -> handleAddService
export function handleAddService(ui: UI) {
    ui.openModal('serviceModal');
    
    // Bind specific logic for THIS open instance
    const btn = document.getElementById('saveServiceBtn');
    if (btn) btn.onclick = async () => { ... api call ... };
}
```

## 3. HTML & DOM Structure Rules

1.  **Do NOT put content outside `<body>`**: Ensure closing tags `</body>` and `</html>` are strictly at the end of the file.
2.  **View Sections**: Top-level views must use `class="view-section"` and unique IDs (e.g., `#view-services`). `App.switchView` toggles the `.hidden` class on these.
3.  **IDs vs Classes**:
    *   Use **IDs** for unique, static elements (`#addServiceBtn`, `#serviceModal`).
    *   Use **Classes** for repeated elements (`.btn-nav`, `.service-card`).

## 4. Initialization Checklist

When adding a new feature (e.g., "Certificates"):

1.  **HTML**: Add the `view-certificates` section and `certificatesModal` in `index.html`.
2.  **Controller**: Import the view logic in `app.ts` and add `bindEvents` listeners for "Add Certificate" and "Refresh" buttons.
3.  **Navigation**: Ensure the sidebar button (`data-view="certificates"`) is handled in the generic navigation listener in `app.ts`.
4.  **View Logic**: Create `src/views/CertificatesView.ts` to handle API calls and rendering callbacks.
5.  **UI**: Add `renderCertificates` to `src/ui.ts`.

## 5. Internationalization (i18n)

*   **Static Text**: Use `data-i18n="key.path"`.
    *   Example: `<span data-i18n="actions.save">Save</span>`
*   **Dynamic Text/JS**: Use `i18n.t('key.path', { param: value })`.
    *   Example: `showToast(i18n.t('messages.success'), 'success');`
*   **Attributes**: Use `data-i18n-attr="placeholder"` for inputs.
    *   Example: `<input data-i18n-placeholder="search.placeholder">`

## 6. Debugging "Dead Buttons"

If a button is not working:
1.  Check if it exists in the DOM (`document.getElementById`).
2.  Check if the listener is attached in `app.ts` (for static buttons).
3.  Check if `init()` or `bindEvents()` was actually called.
4.  Check browser console for "Cannot read property 'addEventListener' of null" (implies ID mismatch).

---
**Adhere to these conventions to maintain a stable and robust UI.**
