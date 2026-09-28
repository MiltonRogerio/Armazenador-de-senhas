const { ipcRenderer } = require('electron');
let usuarioAtual = null;
let cofreSelecionado = null;
let timerBloqueio = null;
document.getElementById('btn-close').addEventListener('click', () => ipcRenderer.send('close-window'));
document.getElementById('btn-min').addEventListener('click', () => ipcRenderer.send('min-window'));
function customConfirm(texto) {
  return new Promise(resolve => {
    const modal = document.getElementById('modal-confirm');
    document.getElementById('modal-text').innerText = texto;
    modal.style.display = 'flex';
    const ok = document.getElementById('modal-ok');
    const cancel = document.getElementById('modal-cancel');
    const fechar = (val) => {
      modal.style.display = 'none';
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      resolve(val);
      setTimeout(() => window.focus(), 10);
    };
    const onOk = () => fechar(true);
    const onCancel = () => fechar(false);
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
  });
}
function irParaRegistro() {
  document.getElementById('tela-selecionar').style.display = 'none';
  document.getElementById('tela-login').style.display = 'none';
  document.getElementById('tela-registro').style.display = 'block';
  limparFormRegistro();
}
function voltarParaSelecao() {
  cofreSelecionado = null;
  document.getElementById('tela-login').style.display = 'none';
  document.getElementById('tela-registro').style.display = 'none';
  document.getElementById('tela-selecionar').style.display = 'block';
  limparFormLogin();
  limparFormRegistro();
  carregarCofres();
}
function limparFormLogin() {
  document.getElementById('form-login').reset();
  document.getElementById('login-senha').value = '';
  document.getElementById('msg-erro-login').innerText = '';
  document.getElementById('login-senha').disabled = false;
  const btn = document.querySelector('#form-login button[type="submit"]');
  if (btn) { btn.disabled = false; btn.innerText = 'Desbloquear'; }
}
function limparFormRegistro() {
  document.getElementById('form-registro').reset();
  document.getElementById('reg-usuario').value = '';
  document.getElementById('reg-senha').value = '';
  document.getElementById('reg-confirmar').value = '';
  document.getElementById('msg-erro').innerText = '';
}
function mostrarAba(aba) {
  document.getElementById('aba-lista').style.display = aba === 'lista'? 'block' : 'none';
  document.getElementById('aba-add').style.display = aba === 'add'? 'block' : 'none';
  document.getElementById('tab-lista').classList.toggle('active', aba === 'lista');
  document.getElementById('tab-add').classList.toggle('active', aba === 'add');
}
function gerarSenha(t) {
  const c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let s = ""; for (let i = 0; i < t; i++) s += c.charAt(Math.floor(Math.random() * c.length));
  document.getElementById('input-senha').value = s;
  document.getElementById('dropdown-gerar').classList.remove('show');
}
function gerarFraca() { gerarSenha(8); }
function gerarMedia() { gerarSenha(12); }
function gerarForte() { gerarSenha(16); }
document.getElementById('btn-gerar').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('dropdown-gerar').classList.toggle('show');
});
window.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown-gen')) document.getElementById('dropdown-gerar').classList.remove('show');
});
async function carregarCofres() {
  const cofres = await ipcRenderer.invoke('listar-usuarios');
  const lista = document.getElementById('lista-cofres');
  lista.innerHTML = '';
  if (cofres.length === 0) {
    lista.innerHTML = '<p style="text-align:center; opacity:0.4">Nenhum cofre ainda</p>';
    return;
  }
  cofres.forEach(nome => {
    const div = document.createElement('div');
    div.className = 'item';
    const header = document.createElement('div');
    header.className = 'item-header';
    header.innerHTML = `<div class="item-info"><b>📦 ${nome}</b></div>`;
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const b1 = document.createElement('button');
    b1.className = 'icon-btn'; b1.textContent = '🔓';
    b1.addEventListener('click', (ev) => { ev.stopPropagation(); selecionarCofre(nome); });
    const b2 = document.createElement('button');
    b2.className = 'icon-btn delete'; b2.textContent = '🗑️';
    b2.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const ok = await customConfirm(`Apagar o cofre "${nome}"? Isso apaga TODAS as senhas dele!`);
      if (!ok) return;
      await ipcRenderer.invoke('deletar-usuario', { usuario: nome });
      cofreSelecionado = null;
      if (timerBloqueio) clearInterval(timerBloqueio);
      limparFormLogin();
      limparFormRegistro();
      document.getElementById('tela-selecionar').style.display = 'block';
      document.getElementById('tela-login').style.display = 'none';
      document.getElementById('tela-registro').style.display = 'none';
      await carregarCofres();
    });
    actions.append(b1, b2);
    header.append(actions);
    div.append(header);
    div.addEventListener('click', () => selecionarCofre(nome));
    lista.appendChild(div);
  });
}
function selecionarCofre(nome) {
  cofreSelecionado = nome;
  document.getElementById('tela-selecionar').style.display = 'none';
  document.getElementById('tela-login').style.display = 'block';
  document.getElementById('cofre-selecionado-nome').innerText = `Cofre: ${nome}`;
  limparFormLogin();
  setTimeout(() => document.getElementById('login-senha').focus(), 50);
}
function iniciarBloqueio(s) {
  const btn = document.querySelector('#form-login button[type="submit"]');
  const input = document.getElementById('login-senha');
  btn.disabled = true; input.disabled = true;
  let r = s; btn.innerText = `Bloqueado (${r}s)`;
  if (timerBloqueio) clearInterval(timerBloqueio);
  timerBloqueio = setInterval(() => {
    r--; if (r <= 0) { clearInterval(timerBloqueio); limparFormLogin(); } else btn.innerText = `Bloqueado (${r}s)`;
  }, 1000);
}
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const senha = document.getElementById('login-senha').value;
  const res = await ipcRenderer.invoke('login', { usuario: cofreSelecionado, senha });
  if (res.sucesso) {
    usuarioAtual = cofreSelecionado;
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('tela-app').style.display = 'block';
    mostrarAba('lista'); limparFormLogin(); carregarSenhas();
  } else {
    document.getElementById('msg-erro-login').innerText = res.erro;
    document.getElementById('login-senha').value = '';
    if (res.bloqueado) iniciarBloqueio(res.segundos);
  }
});
document.getElementById('form-registro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const usuario = document.getElementById('reg-usuario').value.trim();
  const senha = document.getElementById('reg-senha').value;
  const confirmar = document.getElementById('reg-confirmar').value;
  if (senha!== confirmar) { document.getElementById('msg-erro').innerText = 'Senhas não conferem'; return; }
  const res = await ipcRenderer.invoke('registrar', { usuario, senha });
  if (res.sucesso) {
    usuarioAtual = usuario;
    document.getElementById('tela-registro').style.display = 'none';
    document.getElementById('tela-app').style.display = 'block';
    mostrarAba('lista'); limparFormRegistro(); limparFormLogin(); carregarSenhas();
  } else document.getElementById('msg-erro').innerText = res.erro;
});
document.getElementById('form-add').addEventListener('submit', async (e) => {
  e.preventDefault();
  await ipcRenderer.invoke('salvar-senha', { site: document.getElementById('input-site').value, login: document.getElementById('input-login').value, senha: document.getElementById('input-senha').value, usuario: usuarioAtual });
  document.getElementById('form-add').reset(); mostrarAba('lista'); carregarSenhas();
});
document.getElementById('btn-logout').addEventListener('click', async () => {
  await ipcRenderer.invoke('logout'); usuarioAtual = null;
  document.getElementById('tela-app').style.display = 'none';
  document.getElementById('tela-selecionar').style.display = 'block';
  if (timerBloqueio) clearInterval(timerBloqueio);
  voltarParaSelecao();
});
async function carregarSenhas() {
  const senhas = await ipcRenderer.invoke('listar-senhas', { usuario: usuarioAtual });
  const lista = document.getElementById('lista-senhas');
  lista.innerHTML = '';
  if (senhas.length === 0) {
    lista.innerHTML = '<p style="opacity:0.5;text-align:center;margin-top:20px">Nenhuma senha salva</p>';
    return;
  }
  senhas.forEach(s => {
    const div = document.createElement('div');
    div.className = 'item';
    const header = document.createElement('div');
    header.className = 'item-header';
    const info = document.createElement('div');
    info.className = 'item-info';
    info.innerHTML = `<b>${s.site}</b><small>${s.login || 'sem usuário'}</small>`;
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const bView = document.createElement('button');
    bView.className = 'icon-btn'; bView.textContent = '👁️';
    bView.addEventListener('click', () => toggleSenha(s.id));
    const bCopy = document.createElement('button');
    bCopy.className = 'icon-btn'; bCopy.textContent = '📋';
    bCopy.addEventListener('click', () => copiarSenha(s.senha));
    const bDel = document.createElement('button');
    bDel.className = 'icon-btn delete'; bDel.textContent = '🗑️';
    bDel.addEventListener('click', async () => {
      const ok = await customConfirm(`Apagar a senha de "${s.site}"?`);
      if (!ok) return;
      await ipcRenderer.invoke('deletar-senha', { id: s.id, usuario: usuarioAtual });
      carregarSenhas();
    });
    actions.append(bView, bCopy, bDel);
    header.append(info, actions);
    const valor = document.createElement('div');
    valor.className = 'item-senha-valor';
    valor.id = `senha-${s.id}`;
    valor.style.display = 'none';
    valor.textContent = s.senha;
    div.append(header, valor);
    lista.appendChild(div);
  });
}
function toggleSenha(id) {
  const el = document.getElementById(`senha-${id}`);
  el.style.display = el.style.display === 'none'? 'block' : 'none';
}
function copiarSenha(s) { navigator.clipboard.writeText(s); }
(async () => {
  const sessao = await ipcRenderer.invoke('get-sessao');
  if (sessao) {
    usuarioAtual = sessao.usuario;
    document.getElementById('tela-selecionar').style.display = 'none';
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('tela-app').style.display = 'block';
    mostrarAba('lista');
    carregarSenhas();
  } else carregarCofres();
})();