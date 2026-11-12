const {app,BrowserWindow,Menu,shell,ipcMain,dialog}=require('electron');
const {autoUpdater}=require('electron-updater');
const path=require('path'),fs=require('fs');
const {pathToFileURL}=require('url');
const config=require('./update-config.json');
const APP_NAME='Grims DM Command Center';
app.setName(APP_NAME);
// Never change this identifier or userData location in future releases.
app.setPath('userData',path.join(app.getPath('appData'),'grims-dm-command-center'));
const backupDir=()=>path.join(app.getPath('userData'),'campaign-backups');
const safeName=name=>/^grim-backup-\d{4}-\d{2}-\d{2}T[\d-]+\.json$/.test(name);
let win,updateReady=false;
function emit(state,message,extra={}){if(win&&!win.isDestroyed())win.webContents.send('grim:update-status',{state,message,...extra});}
function backup(snapshot){
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw Error('Invalid backup');
 const json=JSON.stringify({format:'grims-dm-localstorage-v1',createdAt:new Date().toISOString(),appVersion:app.getVersion(),entries:snapshot});
 if(Buffer.byteLength(json)>80*1024*1024)throw Error('Backup exceeds 80 MB limit');
 fs.mkdirSync(backupDir(),{recursive:true});
 const name='grim-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
 const tmp=path.join(backupDir(),name+'.tmp');fs.writeFileSync(tmp,json,{mode:0o600});fs.renameSync(tmp,path.join(backupDir(),name));
 const names=fs.readdirSync(backupDir()).filter(safeName).sort().reverse();
 for(const old of names.slice(30))fs.unlinkSync(path.join(backupDir(),old));
 return {name,entries:Object.keys(snapshot).length};
}
ipcMain.handle('grim:backup',(_e,snapshot)=>backup(snapshot));
ipcMain.handle('grim:list-backups',()=>{fs.mkdirSync(backupDir(),{recursive:true});return fs.readdirSync(backupDir()).filter(safeName).sort().reverse();});
ipcMain.handle('grim:restore-backup',(_e,name)=>{
 if(!safeName(name))throw Error('Invalid backup name');
 const obj=JSON.parse(fs.readFileSync(path.join(backupDir(),name),'utf8'));
 if(obj.format!=='grims-dm-localstorage-v1'||!obj.entries||typeof obj.entries!=='object')throw Error('Unsupported backup');
 return obj.entries;
});

// Private, user-owned PDFs. Never store them in the installation directory.
const bookIds=['phb','mm','dmg'];
const bookDir=()=>path.join(app.getPath('userData'),'imported-books');
const bookPath=id=>{if(!bookIds.includes(id))throw Error('Unknown book');return path.join(bookDir(),id+'.pdf');};
ipcMain.handle('grim:book-info',(_e,id)=>{
 const file=bookPath(id);
 return fs.existsSync(file)?{available:true,url:pathToFileURL(file).href}:{available:false};
});
ipcMain.handle('grim:book-import',async(_e,id)=>{
 const dest=bookPath(id);
 const result=await dialog.showOpenDialog(win,{title:'Import your PDF handbook',properties:['openFile'],filters:[{name:'PDF documents',extensions:['pdf']}]});
 if(result.canceled||!result.filePaths.length)return {canceled:true};
 const source=result.filePaths[0],stat=fs.statSync(source);
 if(!stat.isFile()||stat.size<8||stat.size>300*1024*1024)throw Error('Choose a PDF under 300 MB.');
 const fd=fs.openSync(source,'r'),header=Buffer.alloc(5);
 try{fs.readSync(fd,header,0,5,0);}finally{fs.closeSync(fd);}
 if(header.toString('ascii')!=='%PDF-')throw Error('The selected file is not a valid PDF.');
 fs.mkdirSync(bookDir(),{recursive:true});
 const tmp=dest+'.tmp';
 try{fs.copyFileSync(source,tmp);fs.renameSync(tmp,dest);}catch(err){try{fs.unlinkSync(tmp);}catch{}throw err;}
 return {available:true,url:pathToFileURL(dest).href};
});
ipcMain.handle('grim:book-open',(_e,id)=>{
 const file=bookPath(id);
 if(!fs.existsSync(file))return {available:false};
 const reader=new BrowserWindow({width:1150,height:900,autoHideMenuBar:true,title:'Grim’s Handbook Reader',webPreferences:{sandbox:true,nodeIntegration:false,contextIsolation:true}});
 reader.loadURL(pathToFileURL(file).href);
 return {available:true};
});

function configured(){return config.enabled===true&&config.owner&&!config.owner.startsWith('REPLACE_')&&config.repo&&!config.repo.startsWith('REPLACE_');}
function checkUpdates(){
 if(!app.isPackaged){emit('unavailable','Updates can only be checked in the installed app.');return {enabled:false};}
 if(!configured()){emit('unconfigured','Public update hosting has not been configured yet.');return {enabled:false};}
 autoUpdater.checkForUpdates().catch(err=>emit('error',String(err.message||err)));
 return {enabled:true};
}
ipcMain.handle('grim:check-updates',()=>checkUpdates());
ipcMain.handle('grim:download-update',()=>{if(!configured())return {enabled:false};autoUpdater.downloadUpdate().catch(e=>emit('error',String(e.message||e)));return {enabled:true};});
ipcMain.handle('grim:install-update',()=>{if(!updateReady)return {ready:false};autoUpdater.quitAndInstall(false,true);return {ready:true};});
app.whenReady().then(()=>{
 autoUpdater.autoDownload=false;autoUpdater.autoInstallOnAppQuit=false;
 autoUpdater.on('checking-for-update',()=>emit('checking','Checking for updates…'));
 autoUpdater.on('update-available',info=>emit('available','Version '+info.version+' is available.',{version:info.version}));
 autoUpdater.on('update-not-available',()=>emit('current','You have the latest version.'));
 autoUpdater.on('download-progress',p=>emit('downloading','Downloading update…',{percent:Math.round(p.percent)}));
 autoUpdater.on('update-downloaded',info=>{updateReady=true;emit('ready','Version '+info.version+' is ready to install.',{version:info.version});});
 autoUpdater.on('error',e=>emit('error',String(e.message||e)));
 win=new BrowserWindow({width:1500,height:940,minWidth:900,minHeight:600,show:false,backgroundColor:'#130c0a',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
 win.loadFile(path.join(__dirname,'index.html'));
 win.once('ready-to-show',()=>{win.maximize();win.show();});
 win.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith('file://')&&decodeURIComponent(url).toLowerCase().endsWith('.pdf'))return {action:'allow',overrideBrowserWindowOptions:{width:1100,height:900,autoHideMenuBar:true,backgroundColor:'#1a100d'}};if(/^https?:/.test(url))shell.openExternal(url);return {action:'deny'};});
 win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('file://')){event.preventDefault();if(/^https?:/.test(url))shell.openExternal(url);}});
 const menu=Menu.buildFromTemplate([{label:'App',submenu:[{label:'Check for Updates',click:()=>checkUpdates()},{label:'Open Backup Folder',click:()=>{fs.mkdirSync(backupDir(),{recursive:true});shell.openPath(backupDir());}},{label:'Restore Backup…',click:()=>win.webContents.send('grim:open-restore')},{type:'separator'},{label:'Reload',role:'reload'},{label:'Toggle Full Screen',role:'togglefullscreen'},{type:'separator'},{label:'Exit',role:'quit'}]},{label:'View',submenu:[{role:'zoomIn'},{role:'zoomOut'},{role:'resetZoom'}]}]);
 Menu.setApplicationMenu(menu);
 if(configured()&&app.isPackaged)setTimeout(checkUpdates,12000);
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
