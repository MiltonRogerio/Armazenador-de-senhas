const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  listarCofres: () => ipcRenderer.invoke('listar-cofres'),
  setCofreAtual: (nome) => ipcRenderer.invoke('set-cofre-atual', nome),
  criarNovoCofre: () => ipcRenderer.invoke('criar-novo-cofre'),
  verificarCofre: () => ipcRenderer.invoke('verificar-cofre'),
  criarCofre: (s) => ipcRenderer.invoke('criar-cofre', s),
  desbloquearCofre: (s) => ipcRenderer.invoke('desbloquear-cofre', s),
  salvarSenhas: (s) => ipcRenderer.invoke('salvar-senhas', s),
  trancarCofre: () => ipcRenderer.invoke('trancar-cofre'),
  copiarTexto: (t) => ipcRenderer.invoke('copiar-texto', t)
});