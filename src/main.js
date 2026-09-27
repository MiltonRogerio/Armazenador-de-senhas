const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { criptografar, descriptografar } = require('./crypto-manager');

let basePath;
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  basePath = process.env.PORTABLE_EXECUTABLE_DIR;
} else if (process.env.PORTABLE_EXECUTABLE_FILE) {
  basePath = path.dirname(process.env.PORTABLE_EXECUTABLE_FILE);
} else {
  basePath = path.dirname(app.getPath('exe'));
}
const vaultPath = path.join(basePath, 'cofre.dat');

let chaveMestraTemporaria = null;

function criarJanela() {
  const janela = new BrowserWindow({
    width: 420, height: 650, resizable: false,
    autoHideMenuBar: true, backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false
    }
  });
  janela.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(criarJanela);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('verificar-cofre', () => fs.existsSync(vaultPath));
ipcMain.handle('criar-cofre', (e, senhaMestra) => {
  try {
    chaveMestraTemporaria = senhaMestra;
    fs.writeFileSync(vaultPath, criptografar(JSON.stringify([]), senhaMestra));
    return true;
  } catch { return false; }
});
ipcMain.handle('desbloquear-cofre', (e, senhaMestra) => {
  try {
    if (!fs.existsSync(vaultPath)) return { sucesso: false };
    const dados = descriptografar(fs.readFileSync(vaultPath, 'utf8'), senhaMestra);
    if (dados === null) return { sucesso: false };
    chaveMestraTemporaria = senhaMestra;
    return { sucesso: true, senhas: JSON.parse(dados) };
  } catch { return { sucesso: false }; }
});
ipcMain.handle('salvar-senhas', (e, senhas) => {
  if (!chaveMestraTemporaria) return false;
  fs.writeFileSync(vaultPath, criptografar(JSON.stringify(senhas), chaveMestraTemporaria));
  return true;
});
ipcMain.handle('trancar-cofre', () => { chaveMestraTemporaria = null; return true; });
ipcMain.handle('copiar-texto', (e, texto) => { clipboard.writeText(texto); return true; });