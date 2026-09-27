const crypto = require('crypto');
const ALG = 'aes-256-gcm';
function criptografar(texto, senha) {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(senha, 'salt-fixo-cofre', 32);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  let enc = cipher.update(texto, 'utf8', 'hex'); enc += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${enc}`;
}
function descriptografar(dados, senha) {
  try {
    const [ivHex, tagHex, enc] = dados.split(':');
    const key = crypto.scryptSync(senha, 'salt-fixo-cofre', 32);
    const decipher = crypto.createDecipheriv(ALG, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let dec = decipher.update(enc, 'hex', 'utf8'); dec += decipher.final('utf8');
    return dec;
  } catch { return null; }
}
module.exports = { criptografar, descriptografar };