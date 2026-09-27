let senhas = [];
const telaLogin = document.getElementById('tela-login');
const telaCofre = document.getElementById('tela-cofre');
const inputMestra = document.getElementById('senha-mestra');
const btnAcao = document.getElementById('btn-acao');
const msgErro = document.getElementById('msg-erro');

async function init() {
  const existe = await window.api.verificarCofre();
  btnAcao.innerText = existe ? 'Desbloquear Cofre' : 'Criar Cofre';
}
init();

btnAcao.onclick = async () => {
  const senha = inputMestra.value; if (!senha) return;
  const existe = await window.api.verificarCofre();
  if (!existe) { await window.api.criarCofre(senha); senhas = []; abrirCofre(); }
  else {
    const res = await window.api.desbloquearCofre(senha);
    if (!res.sucesso) { msgErro.innerText = 'Chave mestra incorreta!'; return; }
    senhas = res.senhas; abrirCofre();
  }
};

function abrirCofre() {
  telaLogin.style.display = 'none'; telaCofre.style.display = 'block';
  render();
}
document.getElementById('btn-trancar').onclick = async () => {
  await window.api.trancarCofre(); location.reload();
};
document.getElementById('form-add').onsubmit = async (e) => {
  e.preventDefault();
  senhas.push({ site: document.getElementById('site').value, usuario: document.getElementById('usuario').value, senha: document.getElementById('senha').value });
  await window.api.salvarSenhas(senhas); e.target.reset(); render();
};
function render() {
  const lista = document.getElementById('lista-senhas'); lista.innerHTML = '';
  senhas.forEach((s, i) => {
    lista.innerHTML += `<div class="item"><b>${s.site}</b><br><small>${s.usuario}</small><br>
    <button onclick="copiar('${s.senha}')">Copiar</button>
    <button onclick="remover(${i})" style="background:#ff4444">Apagar</button></div>`;
  });
}
window.copiar = async (texto) => { await window.api.copiarTexto(texto); alert('Senha copiada!'); };
window.remover = async (i) => { senhas.splice(i, 1); await window.api.salvarSenhas(senhas); render(); };