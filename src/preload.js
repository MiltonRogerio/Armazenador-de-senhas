const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  verificarCofre: () => ipcRenderer.invoke('verificar-cofre'),
  criarCofre: (s) => ipcRenderer.invoke('criar-cofre', s),
  desbloquearCofre: (s) => ipcRenderer.invoke('desbloquear-cofre', s),
  salvarSenhas: (s) => ipcRenderer.invoke('salvar-senhas', s),
  trancarCofre: () => ipcRenderer.invoke('trancar-cofre'),
  copiarTexto: (t) => ipcRenderer.invoke('copiar-texto', t)
});