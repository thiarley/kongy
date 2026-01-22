// src/main.ts
import './style.css'; // Optional if we move styles to src
import { App } from './app';

console.log('🚀 Main Module Loaded');

const app = new App();

const start = () => {
    console.log('🚀 Starting App Init...');
    app.init().catch(err => console.error('❌ App Init Failed:', err));
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}
