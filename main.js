import UIController from './ui/UIController.js';
const page=document.body.dataset.page||'index';
const app=new UIController({page});
app.init();
if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
window.addEventListener('beforeunload',()=>app.destroy());
