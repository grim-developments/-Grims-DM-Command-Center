const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('grimDesktop',Object.freeze({
 bookInfo:(id)=>ipcRenderer.invoke('grim:book-info',id),
 importBook:(id)=>ipcRenderer.invoke('grim:book-import',id),
 openBookWindow:(id)=>ipcRenderer.invoke('grim:book-open',id),
 backup:(snapshot)=>ipcRenderer.invoke('grim:backup',snapshot),
 listBackups:()=>ipcRenderer.invoke('grim:list-backups'),
 restoreBackup:(name)=>ipcRenderer.invoke('grim:restore-backup',name),
 checkUpdates:()=>ipcRenderer.invoke('grim:check-updates'),
 installUpdate:()=>ipcRenderer.invoke('grim:install-update'),
 downloadUpdate:()=>ipcRenderer.invoke('grim:download-update'),
 onRestoreRequest:(fn)=>{const cb=()=>fn();ipcRenderer.on('grim:open-restore',cb);return()=>ipcRenderer.removeListener('grim:open-restore',cb)},
 onUpdate:(fn)=>{const cb=(_event,payload)=>fn(payload);ipcRenderer.on('grim:update-status',cb);return()=>ipcRenderer.removeListener('grim:update-status',cb)}
}));
