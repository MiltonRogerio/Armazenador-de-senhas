const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
let mainWindow;
let sessaoAtual = null;
let tentativas = {};

function getVaultPath() {
  let basePath;
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    basePath = process.env.PORTABLE_EXECUTABLE_DIR;
  } else if (app.isPackaged) {
    basePath = path.dirname(app.getPath('exe'));
  } else {
    basePath = app.getPath('userData');
  }
  const dataFolder = path.join(basePath, 'data');
  if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder, { recursive: true });
  return path.join(dataFolder, 'vaults.json');
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

function encrypt(text, masterPassword) {
  const key = crypto.createHash('sha256').update(masterPassword).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText, masterPassword) {
  try {
    const key = crypto.createHash('sha256').update(masterPassword).digest();
    const parts = encryptedText.split(':');
    if (parts.length!== 2) return encryptedText;
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch { return '[ERRO DESCRIPTOGRAFIA]'; }
}

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
  sessaoAtual = { usuario, master: senha };
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
  sessaoAtual = { usuario, master: senha };
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
  const master = sessaoAtual? sessaoAtual.master : '';
  user.senhas.push({
    id: Date.now().toString(),
    site: encrypt(site, master),
    login: encrypt(login, master),
    senha: encrypt(senha, master)
  });
  saveVaults(db);
  return { sucesso: true };
});

ipcMain.handle('listar-senhas', (e, { usuario }) => {
  const db = loadVaults();
  const user = db.usuarios.find(u => u.usuario === usuario);
  if (!user) return [];
  const master = sessaoAtual? sessaoAtual.master : '';
  return user.senhas.map(s => ({
    id: s.id,
    site: decrypt(s.site, master),
    login: decrypt(s.login, master),
    senha: decrypt(s.senha, master)
  }));
});

ipcMain.handle('deletar-senha', (e, { id, usuario }) => {
  const db = loadVaults();
  const user = db.usuarios.find(u => u.usuario === usuario);
  if (!user) return { sucesso: false };
  user.senhas = user.senhas.filter(s => s.id!== id);
  saveVaults(db);
  return { sucesso: true };
});