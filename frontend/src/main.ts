import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';

createApp(App).mount('#app');

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('./sw.js').catch((error: unknown) => {
			console.error('Service worker registration failed:', error);
		});
	});
}
