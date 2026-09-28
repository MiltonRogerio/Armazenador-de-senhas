const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
let mainWindow;
let sessaoAtual = null;
let tentativas = {};
function getVaultPath() {
  const userData = app.getPath('userData');
  if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });
  return path.join(userData, 'vaults.json');
}
function loadVaults() {
  const p = getVaultPath();
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify({ usuarios: [] }));
    return { usuarios: [] };
  }
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return { usuarios: [] }; }
}
function saveVaults(data) { fs.writeFileSync(getVaultPath(), JSON.stringify(data, null, 2)); }
function hashSenha(senha) { return crypto.createHash('sha256').update(senha).digest('hex'); }
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 650,
    resizable: false,
    frame: false,
    transparent: true,
    icon: path.join(__dirname, '../icon.ico'),
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}
app.whenReady().then(createWindow);
ipcMain.on('close-window', () => mainWindow.close());
ipcMain.on('min-window', () => mainWindow.minimize());
ipcMain.handle('get-sessao', () => sessaoAtual);
ipcMain.handle('listar-usuarios', () => {
  const db = loadVaults();
  return db.usuarios.map(u => u.usuario);
});
ipcMain.handle('registrar', (e, { usuario, senha }) => {
  const db = loadVaults();
  if (db.usuarios.find(u => u.usuario === usuario)) return { sucesso: false, erro: 'Usuário já existe' };
  db.usuarios.push({ usuario, hash: hashSenha(senha), senhas: [] });
  saveVaults(db);
  sessaoAtual = { usuario };
  tentativas[usuario] = { count: 0, blockedUntil: 0 };
  return { sucesso: true, usuario: sessaoAtual };
});
ipcMain.handle('login', (e, { usuario, senha }) => {
  const agora = Date.now();
  if (!tentativas[usuario]) tentativas[usuario] = { count: 0, blockedUntil: 0 };
  if (tentativas[usuario].blockedUntil > agora) {
    const resto = Math.ceil((tentativas[usuario].blockedUntil - agora) / 1000);
    return { sucesso: false, erro: `Cofre bloqueado. Tente em ${resto}s`, bloqueado: true, segundos: resto };
  }
  const db = loadVaults();
  const user = db.usuarios.find(u => u.usuario === usuario);
  if (!user) return { sucesso: false, erro: 'Usuário não encontrado' };
  if (user.hash!== hashSenha(senha)) {
    tentativas[usuario].count += 1;
    if (tentativas[usuario].count >= 3) {
      tentativas[usuario].blockedUntil = agora + 60000;
      tentativas[usuario].count = 0;
      return { sucesso: false, erro: '3 tentativas erradas. Bloqueado por 1 min', bloqueado: true, segundos: 60 };
    }
    return { sucesso: false, erro: `Senha incorreta (${tentativas[usuario].count}/3)` };
  }
  tentativas[usuario] = { count: 0, blockedUntil: 0 };
  sessaoAtual = { usuario };
  return { sucesso: true, usuario: sessaoAtual };
});
ipcMain.handle('deletar-usuario', (e, { usuario }) => {
  const db = loadVaults();
  db.usuarios = db.usuarios.filter(u => u.usuario!== usuario);
  saveVaults(db);
  if (sessaoAtual && sessaoAtual.usuario === usuario) sessaoAtual = null;
  delete tentativas[usuario];
  return { sucesso: true };
});
ipcMain.handle('logout', () => { sessaoAtual = null; return { sucesso: true }; });
ipcMain.handle('salvar-senha', (e, { site, login, senha, usuario }) => {
  const db = loadVaults();
  const user = db.usuarios.find(u => u.usuario === usuario);
  if (!user) return { sucesso: false };
  user.senhas.push({ id: Date.now().toString(), site, login, senha });
  saveVaults(db);
  return { sucesso: true };
});
ipcMain.handle('listar-senhas', (e, { usuario }) => {
  const db = loadVaults();
  const user = db.usuarios.find(u => u.usuario === usuario);
  return user? user.senhas : [];
});
ipcMain.handle('deletar-senha', (e, { id, usuario }) => {
  const db = loadVaults();
  const user = db.usuarios.find(u => u.usuario === usuario);
  if (!user) return { sucesso: false };
  user.senhas = user.senhas.filter(s => s.id!== id);
  saveVaults(db);
  return { sucesso: true };
});