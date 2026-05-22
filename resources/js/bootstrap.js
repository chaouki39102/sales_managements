// bootstrap.js — أضف هذا في أول السطر قبل import App
// يمنع وميض الثيم الخاطئ (FOUC) عند أول تحميل الصفحة

(function () {
  try {
    var stored = sessionStorage.getItem('app-store');
    if (stored) {
      var theme = JSON.parse(stored)?.state?.theme ?? 'auto';
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var isDark = theme === 'dark' || (theme === 'auto' && prefersDark);
      if (isDark) document.body.classList.add('dark');
    }
  } catch (e) { /* الافتراضي: light */ }
})();
import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
