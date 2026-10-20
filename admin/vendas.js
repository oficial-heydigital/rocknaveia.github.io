/* Controle de vendas · Rock na Véia
   Usa as funções do admin (get, put, enc, dec, msg) e guarda tudo em controle/vendas.json no repositório.
   Valores em centavos (inteiros) para não ter erro de arredondamento. */
(() => {
'use strict';
const PATH = 'controle/vendas.json';
const root = document.getElementById('ts');
if (!root) return;

/* ---------- utilidades ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BRL = new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'});
const BRL4 = new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL', minimumFractionDigits:4, maximumFractionDigits:4});
const money = c => BRL.format((c || 0) / 100);
const frac = c => Math.abs(c - Math.round(c)) > 1e-6;                 // custo com mais de 2 casas (ex.: 3,2325)
const unit = c => frac(c) ? BRL4.format(c / 100) : BRL.format(c / 100);
const inputMoney = c => c ? (frac(c) ? (c / 100).toFixed(4) : (c / 100).toFixed(2)).replace('.', ',') : '';
function parseReais(s) {
  s = String(s || '').replace(/[^\d.,-]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
  const n = Number(s);
  return isFinite(n) ? n : NaN;
}
const toCents = r => Math.round(r * 100);
const toCost = r => Math.round(r * 10000) / 100;                       // aceita até 4 casas em reais
const hoje = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const fd = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '';
const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const q = id => document.getElementById(id);
const PG = {pix:'Pix', dinheiro:'Dinheiro', cartao:'Cartão'};
const MOTIVO = {brinde:'Brinde', defeito:'Defeito', perda:'Perda', outro:'Outro'};

/* ---------- fotos dos produtos (ficam em controle/fotos/ no repositório) ---------- */
const fotoCache = {};
const fotoUrl = f => /^https?:/i.test(f || '') ? f : f ? (fotoCache[f] || 'https://raw.githubusercontent.com/' + S.repo + '/HEAD/' + f) : '';
async function shrinkImg(file, max = 900) {
  const bm = await createImageBitmap(file, {imageOrientation:'from-image'});
  const k = Math.min(1, max / Math.max(bm.width, bm.height));
  const c = document.createElement('canvas'); c.width = Math.round(bm.width * k); c.height = Math.round(bm.height * k);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bm, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL('image/jpeg', .82);
  return {dataUrl, b64:dataUrl.split(',')[1]};
}
async function apagaFoto(path) {
  if (!/^controle\/fotos\//.test(path || '')) return;      // fotos que são só link não existem no repositório
  try { const g = await get(path); if (g) await del(path, g.sha, 'Remover foto de produto'); } catch (e) { /* não é crítico */ }
}

/* ---------- dados ---------- */
const seed = () => ({v:1, produtos:[
  {id:'p1', nome:'Bottons personalizados 4,5cm', qtd:100, custo:124, preco:0, recebido:false},
  {id:'p2', nome:'Chaveiros de alumínio', qtd:25, custo:280, preco:0, recebido:false},
  {id:'p3', nome:'Copos personalizados 473mL', qtd:50, custo:460, preco:0, recebido:false},
  {id:'p4', nome:'Palhetas nylon frente e verso', qtd:20, custo:323.25, preco:0, recebido:false}
], movs:[]});
function norm(d) {
  d = d && typeof d === 'object' ? d : {};
  d.produtos = (Array.isArray(d.produtos) ? d.produtos : []).map(p => ({id:p.id, nome:String(p.nome || 'Sem nome'), qtd:+p.qtd || 0, custo:+p.custo || 0, preco:+p.preco || 0, recebido:!!p.recebido, foto:String(p.foto || '')}));
  const ids = new Set(d.produtos.map(p => p.id));
  d.movs = (Array.isArray(d.movs) ? d.movs : []).filter(m => ids.has(m.produto)).map(m => ({...m, qtd:+m.qtd || 0, preco:+m.preco || 0}));
  d.v = 1;
  return d;
}
function calc(d) {
  const by = {};
  let inv = 0, rec = 0, cogs = 0, est = 0, sold = 0;
  d.produtos.forEach(p => by[p.id] = {p, vend:0, baixa:0, rec:0});
  d.movs.forEach(m => {
    const x = by[m.produto]; if (!x) return;
    if (m.tipo === 'venda') { x.vend += m.qtd; x.rec += Math.round(m.qtd * m.preco); } else x.baixa += m.qtd;
  });
  Object.values(by).forEach(x => {
    x.estoque = x.p.qtd - x.vend - x.baixa;
    x.inv = Math.round(x.p.qtd * x.p.custo);
    x.cogs = Math.round(x.vend * x.p.custo);
    inv += x.inv; rec += x.rec; cogs += x.cogs; est += x.estoque; sold += x.vend;
  });
  return {by, inv, rec, cogs, lucro:rec - cogs, est, sold};
}
const avail = (d, pid, ignoreId) => {
  const p = d.produtos.find(x => x.id === pid);
  return p ? p.qtd - d.movs.filter(m => m.produto === pid && m.id !== ignoreId).reduce((s, m) => s + m.qtd, 0) : 0;
};

/* ---------- validações (rodam na tela e de novo nos dados mais recentes, na hora de salvar) ---------- */
function checkMov(d, v, ignoreId) {
  if (!d.produtos.find(p => p.id === v.produto)) return 'Escolha o produto.';
  if (!Number.isInteger(v.qtd) || v.qtd < 1) return 'Informe a quantidade (mínimo 1).';
  const a = avail(d, v.produto, ignoreId);
  if (v.qtd > a) return a > 0 ? 'Só restam ' + a + ' unidades em estoque.' : 'Este produto está sem estoque.';
  if (!v.data) return 'Informe a data.';
  if (v.tipo === 'venda' && !(v.preco > 0)) return 'Informe o preço de venda. Para brinde ou perda, use "Baixa de estoque".';
  return '';
}
function checkProd(d, v, id) {
  if (!v.nome) return 'Digite o nome do produto.';
  if (!Number.isInteger(v.qtd) || v.qtd < 0) return 'Informe a quantidade comprada.';
  if (isNaN(v.custo) || v.custo < 0) return 'Informe o custo por unidade (pode ser 0).';
  if (isNaN(v.preco) || v.preco < 0) return 'O preço de venda é inválido.';
  const used = id ? d.movs.filter(m => m.produto === id).reduce((s, m) => s + m.qtd, 0) : 0;
  if (v.qtd < used) return 'Já saíram ' + used + ' unidades (vendas e baixas). A quantidade comprada não pode ser menor.';
  return '';
}

/* ---------- GitHub: lê o arquivo mais recente, aplica a mudança e salva (tenta de novo se outra pessoa salvou junto) ---------- */
let DB = null, loaded = false, busy = false, view = 'p', filt = {p:'', t:''};
async function mutate(fn, commit) {
  for (let i = 0; i < 3; i++) {
    const f = await get(PATH);
    const d = norm(f ? JSON.parse(dec(f.content)) : seed());
    const out = fn(d);
    try {
      const r = await put(PATH, enc(JSON.stringify(d, null, 1)), commit, f ? f.sha : undefined);
      if (!r) throw new Error('Não consegui salvar. Confira se o código de acesso tem a permissão "Contents: Read and write".');
      DB = d;
      return out;
    } catch (e) {
      if ((e.status === 409 || e.status === 422) && i < 2) continue;
      throw e;
    }
  }
}
async function load() {
  const f = await get(PATH);
  DB = norm(f ? JSON.parse(dec(f.content)) : seed());
  draw();
}

/* ---------- tela ---------- */
const CSS = `
.vx{--ok:#4ade80;--bad:#ff8097}
.vx h2,.vx-dlg h2{margin:0 0 6px}
.vx-btn{margin:0;padding:12px 16px;min-height:46px;border:0;border-radius:10px;font:inherit;font-weight:700;cursor:pointer;background:#2a2a33;color:#fff}
.vx-pri{background:var(--y);color:#0D0D0D}.vx-out{background:transparent;border:2px solid var(--b);color:#fff}.vx-dng{background:#7a1d3f;color:#fff}
.vx-sm{padding:8px 12px;min-height:40px;font-size:.95rem}
.vx-btn:disabled{opacity:.4;cursor:not-allowed}
.vx-btn:focus-visible,.vx input:focus-visible,.vx select:focus-visible,.vx-dlg input:focus-visible,.vx-dlg select:focus-visible{outline:3px solid var(--y);outline-offset:2px}
.vx-bar-act{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 4px}.vx-bar-act .vx-btn{flex:1 1 150px}
.vx-st{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:14px 0 12px}
@media(min-width:640px){.vx-st{grid-template-columns:repeat(4,1fr)}}
.vx-s{background:var(--bg);border:1px solid var(--l);border-radius:10px;padding:12px;min-width:0}
.vx-s small{display:block;color:var(--mu);font-size:.85rem}.vx-s b{display:block;font-size:1.25rem;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.vx-s span{color:var(--mu);font-size:.8rem}.vx-s .pos{color:var(--ok)}.vx-s .neg{color:var(--bad)}
.vx-pay{margin:0 0 16px}.vx-pay-h{display:flex;justify-content:space-between;gap:10px;font-weight:600;margin-bottom:6px}
.vx-track{height:14px;background:var(--l);border-radius:8px;overflow:hidden}.vx-track i{display:block;height:100%;background:var(--y);border-radius:8px}.vx-track i.ok{background:var(--ok)}
.vx-pay p{margin:6px 0 0;color:var(--mu);font-size:.92rem}
.vx-seg{display:flex;gap:8px;border-top:1px solid var(--l);padding-top:14px}.vx-seg .vx-btn{flex:1}.vx-seg .vx-btn.on{background:var(--p);color:#fff}
.vx-p{border:1px solid var(--l);border-radius:12px;padding:14px;margin:12px 0 0;background:var(--bg)}
.vx-ph{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.vx-pn{font-weight:700;font-size:1.08rem;overflow-wrap:anywhere}
.vx-chk{display:flex;align-items:center;gap:8px;margin:0;font-weight:500;cursor:pointer;white-space:nowrap}
.vx input[type=checkbox],.vx-dlg input[type=checkbox],.vx-dlg input[type=radio]{width:22px;height:22px;padding:0;accent-color:var(--y);flex:none}
.vx-stock{display:flex;align-items:baseline;gap:8px;margin:10px 0 6px}.vx-big{font-size:2.1rem;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
.vx-bar{height:8px;background:var(--l);border-radius:6px;overflow:hidden}.vx-bar i{display:block;height:100%;background:var(--b)}.vx-bar i.low{background:var(--p)}
.vx-meta{color:var(--mu);font-size:.92rem;margin:8px 0 0}.vx-meta b{color:#F3F3F5;font-weight:600}
.vx-tag{display:inline-block;padding:2px 9px;border-radius:99px;font-size:.8rem;font-weight:700;line-height:1.5;border:0;font-family:inherit}
.vx-th{flex:none;width:72px;height:72px;border-radius:10px;background:#1d1d26;border:1px solid var(--l);display:grid;place-items:center;font-size:1.8rem;overflow:hidden}.vx-th img{width:100%;height:100%;object-fit:cover;display:block}
.vx-foto{display:flex;gap:14px;align-items:center;margin-top:12px;border:2px dashed #555;border-radius:12px;padding:12px}.vx-foto.drag{border-color:var(--y);background:#2b2406}.vx-foto .vx-th{width:96px;height:96px;font-size:2.4rem}.vx-foto>div:last-child{display:flex;gap:8px;flex-wrap:wrap}
.vx-ph{align-items:center;gap:12px}
.vx-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
button.vx-tag{cursor:pointer;min-height:32px;padding:4px 12px}
.vx-tag.w{background:#4a3b05;color:var(--y)}.vx-tag.r{background:#5a1230;color:#ffa6cf}.vx-tag.g{background:#0f3d24;color:#7be3a2}
.vx-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.vx-flt{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 0}.vx-flt label{margin:0 0 4px;font-size:.9rem}
.vx-m{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid var(--l)}
.vx-m>div{min-width:0}.vx-m .t{font-weight:600;overflow-wrap:anywhere}.vx-m .u{color:var(--mu);font-size:.9rem;overflow-wrap:anywhere}
.vx-m .v{font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}.vx-m .v.pos{color:var(--ok)}.vx-m .v.mu{color:var(--mu);font-weight:500}
.vx-sum{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px 0;font-weight:600}
.vx-empty{color:var(--mu);padding:18px 0 6px}
.vx-err{background:#8a1c2b;border-radius:10px;padding:10px 12px;margin:12px 0 0;font-weight:600}
.vx-dlg{background:var(--c);color:#F3F3F5;border:1px solid var(--l);border-radius:14px;padding:18px;width:min(560px,calc(100% - 24px));max-height:calc(100dvh - 24px);overflow:auto}
.vx-dlg::backdrop{background:rgba(0,0,0,.75)}
.vx-dlg label{margin-top:12px}.vx-dlg .vx-chk{margin-top:12px}
.vx-tipo,.vx-pgs{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.vx-tipo label,.vx-pgs label{flex:1 1 90px;margin:0;position:relative}
.vx-tipo input,.vx-pgs input{position:absolute;opacity:0;width:100%;height:100%;inset:0;margin:0;cursor:pointer}
.vx-tipo span,.vx-pgs span{display:block;text-align:center;padding:12px 10px;border:2px solid var(--l);border-radius:10px;font-weight:700}
.vx-tipo input:checked+span,.vx-pgs input:checked+span{border-color:var(--y);background:#2b2406;color:var(--y)}
.vx-tipo input:focus-visible+span,.vx-pgs input:focus-visible+span{outline:3px solid var(--y);outline-offset:2px}
.vx-pgs{border:0;padding:0;margin:12px 0 0}.vx-pgs legend{font-weight:600;padding:0}
.vx-step{display:flex;gap:8px}.vx-step input{text-align:center;font-weight:700;font-size:1.15rem}.vx-step .vx-btn{flex:0 0 54px;padding:0;font-size:1.4rem}
.vx-tot{display:flex;justify-content:space-between;align-items:baseline;margin:14px 0 0;font-size:1.05rem}.vx-tot b{font-size:1.5rem;color:var(--y);font-variant-numeric:tabular-nums}
.vx-hint{color:var(--mu);font-size:.9rem;margin:6px 0 0}
.vx-act{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.vx-act .vx-btn{flex:1 1 120px}
@media(prefers-reduced-motion:no-preference){.vx-track i,.vx-bar i{transition:width .4s ease}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

root.classList.add('vx');
root.innerHTML = `<h2>💰 Controle de vendas</h2>
<p class="mu" style="margin:0">Produtos, estoque e vendas da banda. Tudo fica salvo e aparece igual em todos os aparelhos.</p>
<div id="vx-sumary"></div>
<div class="vx-seg" role="group" aria-label="Seção"><button type="button" class="vx-btn on" data-vv="p">Produtos</button><button type="button" class="vx-btn" data-vv="h" id="vx-hb">Vendas</button></div>
<div id="vx-body"></div>`;

document.body.insertAdjacentHTML('beforeend', `
<dialog id="vx-dm" class="vx-dlg" aria-labelledby="vx-mt"><form id="vx-fm" novalidate>
 <h2 id="vx-mt">Registrar venda</h2>
 <div class="vx-tipo" role="radiogroup" aria-label="Tipo de lançamento">
  <label><input type="radio" name="vx-tipo" value="venda" checked><span>Venda</span></label>
  <label><input type="radio" name="vx-tipo" value="baixa"><span>Baixa de estoque</span></label></div>
 <label for="vx-mp">Produto</label><select id="vx-mp"></select>
 <label for="vx-mq">Quantidade</label>
 <div class="vx-step"><button type="button" class="vx-btn vx-out" data-st="-1" aria-label="Diminuir quantidade">−</button><input id="vx-mq" inputmode="numeric" value="1" autocomplete="off"><button type="button" class="vx-btn vx-out" data-st="1" aria-label="Aumentar quantidade">+</button></div>
 <p class="vx-hint" id="vx-me"></p>
 <div id="vx-fv">
  <label for="vx-mv">Preço de cada unidade (R$)</label><input id="vx-mv" inputmode="decimal" placeholder="0,00" autocomplete="off">
  <label class="vx-chk" id="vx-dfl"><input type="checkbox" id="vx-md" checked> Usar este preço como padrão do produto</label>
  <p class="vx-tot"><span>Total da venda</span><b id="vx-mtot">R$ 0,00</b></p>
  <fieldset class="vx-pgs"><legend>Forma de pagamento</legend>
   <label><input type="radio" name="vx-pg" value="pix" checked><span>Pix</span></label>
   <label><input type="radio" name="vx-pg" value="dinheiro"><span>Dinheiro</span></label>
   <label><input type="radio" name="vx-pg" value="cartao"><span>Cartão</span></label></fieldset>
 </div>
 <div id="vx-fb" hidden><label for="vx-mr">Motivo da baixa</label><select id="vx-mr"><option value="brinde">Brinde</option><option value="defeito">Defeito</option><option value="perda">Perda</option><option value="outro">Outro</option></select></div>
 <label for="vx-mdt">Data</label><input id="vx-mdt" type="date">
 <label for="vx-mo">Observação (opcional)</label><input id="vx-mo" maxlength="80" placeholder="ex.: Show no Bar do Zé" autocomplete="off">
 <p class="vx-hint">O repositório do site é público: não anote telefone nem dados pessoais de compradores.</p>
 <div class="vx-err" id="vx-merr" role="alert" hidden></div>
 <div class="vx-act"><button type="submit" class="vx-btn vx-pri" id="vx-ms">Salvar venda</button><button type="button" class="vx-btn vx-out" data-close>Cancelar</button><button type="button" class="vx-btn vx-dng" id="vx-mx" hidden>Excluir</button></div>
</form></dialog>
<dialog id="vx-dp" class="vx-dlg" aria-labelledby="vx-pt"><form id="vx-fp" novalidate>
 <h2 id="vx-pt">Cadastrar produto</h2>
 <div class="vx-foto" id="vx-pz"><div class="vx-th" id="vx-pth" aria-hidden="true">📦</div>
  <div><input type="file" id="vx-pf" accept="image/*" hidden><button type="button" class="vx-btn vx-out vx-sm" id="vx-pfb">Escolher foto</button><button type="button" class="vx-btn vx-sm" id="vx-pfx" hidden>Remover foto</button></div></div>
 <p class="vx-hint" id="vx-pfh">Arraste uma imagem para a área acima, cole com Ctrl+V (inclusive uma imagem copiada), ou escolha da galeria. A foto é reduzida automaticamente.</p>
 <label for="vx-pu">Ou cole o link da imagem</label>
 <div class="vx-step"><input id="vx-pu" inputmode="url" placeholder="https://..." autocomplete="off"><button type="button" class="vx-btn vx-out" id="vx-pub" style="flex:0 0 auto;width:auto;padding:0 18px;font-size:1rem">Usar link</button></div>
 <label for="vx-pn">Nome do produto</label><input id="vx-pn" maxlength="60" autocomplete="off">
 <label for="vx-pq">Quantidade comprada</label><input id="vx-pq" inputmode="numeric" autocomplete="off">
 <p class="vx-hint" id="vx-pqh"></p>
 <label for="vx-pc">Custo de cada unidade (R$)</label><input id="vx-pc" inputmode="decimal" placeholder="0,00" autocomplete="off">
 <label for="vx-pv">Preço de venda (R$)</label><input id="vx-pv" inputmode="decimal" placeholder="0,00" autocomplete="off">
 <p class="vx-hint" id="vx-pm"></p>
 <label class="vx-chk"><input type="checkbox" id="vx-pr"> Já recebi este produto</label>
 <div class="vx-err" id="vx-perr" role="alert" hidden></div>
 <div class="vx-act"><button type="submit" class="vx-btn vx-pri" id="vx-ps">Salvar produto</button><button type="button" class="vx-btn vx-out" data-close>Cancelar</button></div>
</form></dialog>`);
const dm = q('vx-dm'), dp = q('vx-dp');

function draw() {
  if (!DB) return;
  const c = calc(DB);
  const pct = c.inv ? Math.min(100, c.rec / c.inv * 100) : 0;
  const payTxt = !c.inv ? 'Cadastre os produtos para acompanhar.' :
    c.rec >= c.inv ? 'Investimento recuperado. Já sobram ' + money(c.rec - c.inv) + '.' :
    'Faltam ' + money(c.inv - c.rec) + ' para recuperar o investimento.';
  q('vx-sumary').innerHTML = `<div class="vx-st">
   <div class="vx-s"><small>Investido</small><b>${money(c.inv)}</b></div>
   <div class="vx-s"><small>Faturado</small><b>${money(c.rec)}</b><span>${c.sold} un. vendidas</span></div>
   <div class="vx-s"><small>Em estoque</small><b>${c.est} un.</b></div>
   <div class="vx-s"><small>Lucro das vendas</small><b class="${c.lucro > 0 ? 'pos' : c.lucro < 0 ? 'neg' : ''}">${money(c.lucro)}</b></div></div>
   <div class="vx-pay"><div class="vx-pay-h"><span>Retorno do investimento</span><span>${Math.floor(pct)}%</span></div>
   <div class="vx-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(pct)}" aria-label="Retorno do investimento"><i class="${c.rec >= c.inv && c.inv ? 'ok' : ''}" style="width:${pct}%"></i></div><p>${payTxt}</p></div>`;
  q('vx-hb').textContent = 'Vendas' + (DB.movs.length ? ' (' + DB.movs.length + ')' : '');
  root.querySelectorAll('[data-vv]').forEach(b => b.classList.toggle('on', b.dataset.vv === view));
  const keep = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.f : null;
  q('vx-body').innerHTML = view === 'p' ? prodHTML(c) : histHTML();
  if (keep) { const e = root.querySelector('[data-f="' + keep + '"]'); if (e) e.focus(); }
}

function prodHTML(c) {
  const head = `<div class="vx-bar-act"><button type="button" class="vx-btn vx-pri" data-a="newsale">Registrar venda</button><button type="button" class="vx-btn vx-out" data-a="newprod">Cadastrar produto</button></div>`;
  if (!DB.produtos.length) return head + '<p class="vx-empty">Nenhum produto cadastrado. Toque em "Cadastrar produto" para começar.</p>';
  return head + DB.produtos.map(p => {
    const x = c.by[p.id], out = x.estoque <= 0, low = !out && x.estoque <= Math.max(1, Math.floor(p.qtd * .1));
    const pctEst = p.qtd ? Math.max(0, Math.min(100, x.estoque / p.qtd * 100)) : 0;
    const tags = (!p.recebido ? '<span class="vx-tag w">Aguardando entrega</span>' : '') + (out ? '<span class="vx-tag r">Esgotado</span>' : low ? '<span class="vx-tag r">Acabando</span>' : '');
    const venda = p.preco ? '<b>' + unit(p.preco) + '</b> (lucro de ' + money(p.preco - p.custo) + ' por unidade)' : '<button type="button" class="vx-tag r" data-a="editprod" data-id="' + p.id + '">Definir preço de venda</button>';
    return `<div class="vx-p"><div class="vx-ph"><div class="vx-th">${p.foto ? '<img src="' + esc(fotoUrl(p.foto)) + '" alt="Foto de ' + esc(p.nome) + '" loading="lazy">' : '<span aria-hidden="true">📦</span>'}</div>
     <div style="min-width:0;flex:1"><div class="vx-pn">${esc(p.nome)}</div>${tags ? '<div class="vx-tags">' + tags + '</div>' : ''}</div></div>
     <div class="vx-stock"><span class="vx-big">${x.estoque}</span><span class="mu">em estoque</span></div>
     <div class="vx-bar" aria-hidden="true"><i class="${out || low ? 'low' : ''}" style="width:${pctEst}%"></i></div>
     <p class="vx-meta">Comprados <b>${p.qtd}</b> · Vendidos <b>${x.vend}</b> · Baixas <b>${x.baixa}</b></p>
     <p class="vx-meta">Custo <b>${unit(p.custo)}</b> · Venda ${venda}</p>
     <label class="vx-chk" style="margin-top:10px"><input type="checkbox" data-rc="${p.id}" ${p.recebido ? 'checked' : ''}> Já recebi este produto</label>
     <div class="vx-acts"><button type="button" class="vx-btn vx-pri vx-sm" data-a="sell" data-id="${p.id}" ${out ? 'disabled' : ''}>Vender</button>
      <button type="button" class="vx-btn vx-out vx-sm" data-a="baixa" data-id="${p.id}" ${out ? 'disabled' : ''}>Baixa</button>
      <button type="button" class="vx-btn vx-out vx-sm" data-a="editprod" data-id="${p.id}">Editar</button>
      <button type="button" class="vx-btn vx-dng vx-sm" data-a="delprod" data-id="${p.id}">Excluir</button></div></div>`;
  }).join('');
}

function filteredMovs() {
  const by = Object.fromEntries(DB.produtos.map(p => [p.id, p]));
  return DB.movs.filter(m => by[m.produto] && (!filt.p || m.produto === filt.p) && (!filt.t || m.tipo === filt.t))
    .sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.c || 0) - (a.c || 0));
}
function histHTML() {
  const by = Object.fromEntries(DB.produtos.map(p => [p.id, p]));
  const head = `<div class="vx-bar-act"><button type="button" class="vx-btn vx-pri" data-a="newsale">Registrar venda</button><button type="button" class="vx-btn vx-out" data-a="csv" ${DB.movs.length ? '' : 'disabled'}>Baixar planilha (CSV)</button></div>`;
  if (!DB.movs.length) return head + '<p class="vx-empty">Nenhuma venda registrada ainda. Toque em "Registrar venda" quando vender algo.</p>';
  const L = filteredMovs();
  const flt = `<div class="vx-flt"><div><label for="vx-fp1">Produto</label><select id="vx-fp1" data-f="p"><option value="">Todos</option>${DB.produtos.map(p => `<option value="${p.id}" ${filt.p === p.id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></div>
   <div><label for="vx-ft1">Tipo</label><select id="vx-ft1" data-f="t"><option value="">Todos</option><option value="venda" ${filt.t === 'venda' ? 'selected' : ''}>Só vendas</option><option value="baixa" ${filt.t === 'baixa' ? 'selected' : ''}>Só baixas</option></select></div></div>`;
  const v = L.filter(m => m.tipo === 'venda');
  const tot = v.reduce((s, m) => s + Math.round(m.qtd * m.preco), 0), un = v.reduce((s, m) => s + m.qtd, 0);
  const rows = L.map(m => {
    const p = by[m.produto];
    const det = m.tipo === 'venda' ? m.qtd + ' × ' + unit(m.preco) + ' · ' + (PG[m.pgto] || '—') : 'Baixa · ' + (MOTIVO[m.motivo] || 'Outro');
    return `<div class="vx-m"><div><div class="t">${esc(p.nome)}</div><div class="u">${fd(m.data)} · ${det}${m.obs ? ' · ' + esc(m.obs) : ''}</div></div>
     <div style="display:flex;align-items:center;gap:10px;flex:none">${m.tipo === 'venda' ? '<span class="v pos">' + money(Math.round(m.qtd * m.preco)) + '</span>' : '<span class="v mu">−' + m.qtd + ' un.</span>'}
     <button type="button" class="vx-btn vx-out vx-sm" data-a="editmov" data-id="${m.id}" aria-label="Editar lançamento">Editar</button></div></div>`;
  }).join('');
  return head + flt + '<div class="vx-sum"><span>' + v.length + (v.length === 1 ? ' venda' : ' vendas') + ' · ' + un + ' un.</span><span>' + money(tot) + '</span></div>' + (rows || '<p class="vx-empty">Nada encontrado com esses filtros.</p>');
}

/* ---------- ações ---------- */
async function act(btn, fn, okMsg, errBox, dlg) {
  if (busy) return;
  busy = true;
  const old = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
  if (errBox) errBox.hidden = true;
  try {
    await fn();
    if (dlg) dlg.close();
    draw();
    msg(okMsg);
  } catch (e) {
    const t = e.message || 'Algo deu errado.';
    if (errBox) { errBox.textContent = t; errBox.hidden = false; } else { msg(t, false); draw(); }
  } finally {
    busy = false;
    if (btn) { btn.disabled = false; btn.textContent = old; }
  }
}

/* --- diálogo de venda / baixa --- */
let editMov = null;
const tipoAtual = () => dm.querySelector('[name=vx-tipo]:checked').value;
function fillProdSelect(sel, ignoreId) {
  q('vx-mp').innerHTML = DB.produtos.map(p => `<option value="${p.id}">${esc(p.nome)} (${avail(DB, p.id, ignoreId)} un.)</option>`).join('');
  if (sel) q('vx-mp').value = sel;
}
function mUpdate() {
  const venda = tipoAtual() === 'venda', p = DB.produtos.find(x => x.id === q('vx-mp').value);
  q('vx-fv').hidden = !venda; q('vx-fb').hidden = venda;
  q('vx-mt').textContent = editMov ? (venda ? 'Editar venda' : 'Editar baixa') : (venda ? 'Registrar venda' : 'Baixa de estoque');
  q('vx-ms').textContent = editMov ? 'Salvar alterações' : (venda ? 'Salvar venda' : 'Salvar baixa');
  const a = p ? avail(DB, p.id, editMov && editMov.id) : 0;
  q('vx-me').textContent = p ? 'Em estoque: ' + a + (a === 1 ? ' unidade' : ' unidades') : '';
  q('vx-dfl').hidden = !(venda && p && !p.preco);
  const n = parseInt(q('vx-mq').value, 10), r = parseReais(q('vx-mv').value);
  q('vx-mtot').textContent = money(isNaN(n) || isNaN(r) ? 0 : Math.round(n * toCents(r)));
}
function openMov(init, mov) {
  if (!DB.produtos.length) { msg('Cadastre um produto primeiro.', false); return; }
  editMov = mov || null;
  q('vx-merr').hidden = true;
  fillProdSelect(init.produto, mov && mov.id);
  dm.querySelector('[name=vx-tipo][value=' + init.tipo + ']').checked = true;
  q('vx-mq').value = init.qtd || 1;
  const p = DB.produtos.find(x => x.id === q('vx-mp').value);
  q('vx-mv').value = mov ? inputMoney(mov.preco) : (p && p.preco ? inputMoney(p.preco) : '');
  q('vx-md').checked = true;
  const last = localStorage.getItem('vx-pg') || 'pix';
  dm.querySelector('[name=vx-pg][value=' + (mov && mov.pgto ? mov.pgto : last) + ']').checked = true;
  q('vx-mr').value = mov && mov.motivo ? mov.motivo : 'brinde';
  q('vx-mdt').value = mov ? mov.data : hoje();
  q('vx-mo').value = mov ? (mov.obs || '') : '';
  q('vx-mx').hidden = !mov;
  mUpdate();
  dm.showModal();
  if (!mov && init.tipo === 'venda' && p && !p.preco) q('vx-mv').focus();
}
dm.addEventListener('input', mUpdate);
dm.addEventListener('change', e => {
  if ((e.target.id === 'vx-mp' || (e.target.name === 'vx-tipo' && !q('vx-mv').value.trim())) && tipoAtual() === 'venda') {
    const p = DB.produtos.find(x => x.id === q('vx-mp').value);
    q('vx-mv').value = p && p.preco ? inputMoney(p.preco) : '';
    q('vx-md').checked = true;
  }
  mUpdate();
});
dm.addEventListener('click', e => {
  const s = e.target.closest('[data-st]');
  if (s) {
    const a = avail(DB, q('vx-mp').value, editMov && editMov.id);
    let n = (parseInt(q('vx-mq').value, 10) || 0) + +s.dataset.st;
    n = Math.max(1, a > 0 ? Math.min(a, n) : n);
    q('vx-mq').value = n; mUpdate();
  }
  if (e.target.closest('[data-close]')) dm.close();
});
function readMov() {
  const tipo = tipoAtual(), v = {tipo, produto:q('vx-mp').value, qtd:Number(q('vx-mq').value.trim()), data:q('vx-mdt').value, obs:q('vx-mo').value.trim()};
  if (tipo === 'venda') { const r = parseReais(q('vx-mv').value); v.preco = isNaN(r) ? 0 : toCents(r); v.pgto = dm.querySelector('[name=vx-pg]:checked').value; }
  else v.motivo = q('vx-mr').value;
  return v;
}
q('vx-fm').addEventListener('submit', e => {
  e.preventDefault();
  const v = readMov(), err = q('vx-merr'), id = editMov && editMov.id;
  const msgErr = checkMov(DB, v, id);
  if (msgErr) { err.textContent = msgErr; err.hidden = false; return; }
  const setDef = v.tipo === 'venda' && !q('vx-dfl').hidden && q('vx-md').checked;
  if (v.tipo === 'venda') localStorage.setItem('vx-pg', v.pgto);
  const nome = DB.produtos.find(p => p.id === v.produto).nome;
  act(q('vx-ms'), () => mutate(d => {
    const er = checkMov(d, v, id); if (er) throw new Error(er);
    const rec = {...v, id:id || newId('m'), c:editMov ? editMov.c : Date.now()};
    if (id) { const i = d.movs.findIndex(m => m.id === id); if (i < 0) throw new Error('Este lançamento não existe mais.'); d.movs[i] = rec; } else d.movs.push(rec);
    if (setDef) d.produtos.find(p => p.id === v.produto).preco = v.preco;
  }, (id ? 'Editar ' : 'Registrar ') + (v.tipo === 'venda' ? 'venda' : 'baixa') + ': ' + nome), id ? 'Alterações salvas!' : (v.tipo === 'venda' ? 'Venda registrada!' : 'Baixa registrada!'), err, dm);
});
q('vx-mx').onclick = () => {
  if (!editMov || !confirm('Excluir este lançamento? O estoque volta ao que era antes.')) return;
  const id = editMov.id;
  act(q('vx-mx'), () => mutate(d => { d.movs = d.movs.filter(m => m.id !== id); }, 'Excluir lançamento'), 'Lançamento excluído!', q('vx-merr'), dm);
};

/* --- diálogo de produto --- */
let editProd = null, pImg = null, pRemove = false, pLink = '';
const DICA = 'Arraste uma imagem para a área acima, cole com Ctrl+V (inclusive uma imagem copiada), ou escolha da galeria. A foto é reduzida automaticamente.';
function pFoto(src) {
  q('vx-pth').innerHTML = src ? '<img src="' + esc(src) + '" alt="">' : '📦';
  q('vx-pfb').textContent = src ? 'Trocar foto' : 'Escolher foto';
  q('vx-pfx').hidden = !src;
}
const usedOf = id => DB.movs.filter(m => m.produto === id).reduce((s, m) => s + m.qtd, 0);
function pUpdate() {
  const c = toCost(parseReais(q('vx-pc').value)), v = toCents(parseReais(q('vx-pv').value));
  q('vx-pm').textContent = v > 0 && !isNaN(c) ? 'Lucro de ' + money(v - c) + ' por unidade' + (v > 0 ? ' (' + Math.round((v - c) / v * 100) + '% do preço).' : '.') : '';
  const used = editProd ? usedOf(editProd.id) : 0;
  q('vx-pqh').textContent = used ? 'Já saíram ' + used + ' unidades (vendas e baixas). Se comprou mais, some aqui o novo total.' : '';
}
function openProd(p) {
  editProd = p || null;
  q('vx-perr').hidden = true;
  q('vx-pt').textContent = p ? 'Editar produto' : 'Cadastrar produto';
  q('vx-pn').value = p ? p.nome : '';
  q('vx-pq').value = p ? p.qtd : '';
  q('vx-pc').value = p ? inputMoney(p.custo) : '';
  q('vx-pv').value = p ? inputMoney(p.preco) : '';
  q('vx-pr').checked = p ? p.recebido : false;
  pImg = null; pRemove = false; pLink = ''; q('vx-pf').value = ''; q('vx-pu').value = p && /^https?:/i.test(p.foto || '') ? p.foto : '';
  q('vx-pfh').textContent = DICA;
  pFoto(p && p.foto ? fotoUrl(p.foto) : '');
  pUpdate();
  dp.showModal();
}
dp.addEventListener('input', pUpdate);
q('vx-pfb').onclick = () => q('vx-pf').click();
const pErr = t => { q('vx-perr').textContent = t; q('vx-perr').hidden = !t; };
async function takeFile(f) {
  if (!f || !/^image\//.test(f.type || 'image/')) return pErr('Esse arquivo não é uma imagem.');
  try { pImg = await shrinkImg(f); pRemove = false; pLink = ''; q('vx-pu').value = ''; pFoto(pImg.dataUrl); pErr(''); }
  catch (x) { pErr('Não consegui ler esta imagem. Escolha uma foto em JPG ou PNG.'); }
}
async function takeUrl(u) {
  u = (u || '').trim();
  if (!/^https?:\/\/\S+$/i.test(u)) return pErr('Cole um link completo, começando com http:// ou https://.');
  pErr(''); q('vx-pu').value = u; q('vx-pfh').textContent = 'Buscando a imagem…';
  try {                                                  // tenta copiar a imagem para o repositório (fica guardada para sempre)
    const r = await fetch(u, {mode:'cors'}); if (!r.ok) throw 0;
    const b = await r.blob(); if (!/^image\//.test(b.type)) throw 0;
    pImg = null; await takeFile(b); if (!pImg) throw 0; q('vx-pu').value = u; q('vx-pfh').textContent = 'Imagem copiada do link. Ela será salva no site junto com o produto.';
  } catch (x) {
    pErr('');                                            // o site de origem não deixa copiar: guarda só o link
    pImg = null; pRemove = false; pLink = u; pFoto(u);
    q('vx-pfh').textContent = 'Esse site não permite copiar a imagem, então vou guardar só o link. Se ele sair do ar, a foto some.';
  }
}
q('vx-pf').onchange = e => { takeFile(e.target.files[0]); e.target.value = ''; };
q('vx-pfx').onclick = () => { pImg = null; pRemove = true; pLink = ''; q('vx-pf').value = ''; q('vx-pu').value = ''; q('vx-pfh').textContent = DICA; pFoto(''); };
q('vx-pub').onclick = () => takeUrl(q('vx-pu').value);
q('vx-pu').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); takeUrl(q('vx-pu').value); } });
dp.addEventListener('paste', e => {                      // Ctrl+V com imagem copiada, ou com um link
  const cd = e.clipboardData; if (!cd) return;
  const it = [...cd.items].find(i => i.kind === 'file' && /^image\//.test(i.type));
  if (it) { e.preventDefault(); takeFile(it.getAsFile()); return; }
  const t = (cd.getData('text') || '').trim();
  if (/^https?:\/\/\S+$/i.test(t) && /\.(jpe?g|png|gif|webp|avif|bmp)(\?|#|$)/i.test(t) && !/^vx-p[nqcv]$/.test(e.target.id)) { e.preventDefault(); takeUrl(t); }
});
['dragenter', 'dragover'].forEach(n => dp.addEventListener(n, e => { e.preventDefault(); q('vx-pz').classList.add('drag'); }));
dp.addEventListener('dragleave', e => { if (e.target === dp || e.target === q('vx-pz')) q('vx-pz').classList.remove('drag'); });
dp.addEventListener('drop', e => {                       // arrastar do computador ou de outra página
  e.preventDefault(); q('vx-pz').classList.remove('drag');
  const f = [...(e.dataTransfer.files || [])].find(x => /^image\//.test(x.type));
  if (f) return takeFile(f);
  const u = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '').split('\n')[0].trim();
  if (u) takeUrl(u); else pErr('Não encontrei uma imagem no que foi solto aqui.');
});
dp.addEventListener('click', e => { if (e.target.closest('[data-close]')) dp.close(); });
q('vx-fp').addEventListener('submit', e => {
  e.preventDefault();
  const rc = parseReais(q('vx-pc').value), rv = q('vx-pv').value.trim() ? parseReais(q('vx-pv').value) : 0;
  const v = {nome:q('vx-pn').value.trim(), qtd:Number(q('vx-pq').value.trim() || NaN), custo:q('vx-pc').value.trim() ? toCost(rc) : NaN, preco:isNaN(rv) ? NaN : toCents(rv), recebido:q('vx-pr').checked};
  const err = q('vx-perr'), id = editProd && editProd.id;
  const er = checkProd(DB, v, id);
  if (er) { err.textContent = er; err.hidden = false; return; }
  act(q('vx-ps'), async () => {
    let novo = '', velha = '';
    if (pImg) {
      novo = 'controle/fotos/' + Date.now().toString(36) + '.jpg';
      const r = await put(novo, pImg.b64, 'Foto de produto: ' + v.nome);
      if (!r) throw new Error('Não consegui enviar a foto. Confira se o código de acesso tem a permissão "Contents: Read and write".');
      fotoCache[novo] = pImg.dataUrl;
    }
    try {
      await mutate(d => {
        const e2 = checkProd(d, v, id); if (e2) throw new Error(e2);
        if (id) {
          const p = d.produtos.find(x => x.id === id); if (!p) throw new Error('Este produto não existe mais.');
          velha = p.foto; Object.assign(p, v);
          if (novo) p.foto = novo; else if (pLink) p.foto = pLink; else if (pRemove) p.foto = '';
        } else d.produtos.push({id:newId('p'), ...v, foto:novo || pLink});
      }, (id ? 'Editar produto: ' : 'Novo produto: ') + v.nome);
    } catch (e) { if (novo) apagaFoto(novo); throw e; }
    if (velha && (novo || pLink || pRemove)) apagaFoto(velha);
  }, id ? 'Produto atualizado!' : 'Produto cadastrado!', err, dp);
});

/* --- cliques na tela principal --- */
root.addEventListener('click', e => {
  const vv = e.target.closest('[data-vv]');
  if (vv) { view = vv.dataset.vv; draw(); return; }
  const b = e.target.closest('[data-a]');
  if (!b || busy || !DB) return;
  const id = b.dataset.id, a = b.dataset.a;
  if (a === 'newsale') openMov({tipo:'venda', produto:(DB.produtos.find(p => avail(DB, p.id) > 0) || DB.produtos[0] || {}).id});
  else if (a === 'sell') openMov({tipo:'venda', produto:id});
  else if (a === 'baixa') openMov({tipo:'baixa', produto:id});
  else if (a === 'newprod') openProd(null);
  else if (a === 'editprod') openProd(DB.produtos.find(p => p.id === id));
  else if (a === 'editmov') { const m = DB.movs.find(x => x.id === id); if (m) openMov({tipo:m.tipo, produto:m.produto, qtd:m.qtd}, m); }
  else if (a === 'delprod') {
    const p = DB.produtos.find(x => x.id === id), n = DB.movs.filter(m => m.produto === id).length;
    if (!confirm('Excluir "' + p.nome + '"?' + (n ? '\n\nIsso também apaga ' + n + (n === 1 ? ' lançamento' : ' lançamentos') + ' de venda/baixa dele.' : ''))) return;
    act(b, async () => { await mutate(d => { d.produtos = d.produtos.filter(x => x.id !== id); d.movs = d.movs.filter(m => m.produto !== id); }, 'Excluir produto: ' + p.nome); if (p.foto) apagaFoto(p.foto); }, 'Produto excluído!');
  }
  else if (a === 'csv') csv();
  else if (a === 'retry') VX.open(true);
});
root.addEventListener('change', e => {
  const rc = e.target.dataset.rc;
  if (rc) {
    const val = e.target.checked, el = e.target;
    el.disabled = true;
    act(null, () => mutate(d => { const p = d.produtos.find(x => x.id === rc); if (p) p.recebido = val; }, 'Marcar produto como ' + (val ? 'recebido' : 'não recebido')), val ? 'Marcado como recebido!' : 'Marcado como não recebido.')
      .finally(() => { el.disabled = false; });
  } else if (e.target.dataset.f) { filt[e.target.dataset.f] = e.target.value; draw(); }
});

/* --- planilha --- */
function csv() {
  const n = c => (c / 100).toFixed(2).replace('.', ','), qt = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const by = Object.fromEntries(DB.produtos.map(p => [p.id, p]));
  const lines = [['Data', 'Tipo', 'Produto', 'Quantidade', 'Preço unitário', 'Total', 'Pagamento ou motivo', 'Observação'].map(qt).join(';')];
  filteredMovs().slice().reverse().forEach(m => lines.push([fd(m.data), m.tipo === 'venda' ? 'Venda' : 'Baixa', by[m.produto].nome, m.qtd,
    m.tipo === 'venda' ? n(m.preco) : '', m.tipo === 'venda' ? n(Math.round(m.qtd * m.preco)) : '', m.tipo === 'venda' ? (PG[m.pgto] || '') : (MOTIVO[m.motivo] || ''), m.obs || ''].map(qt).join(';')));
  const url = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\r\n')], {type:'text/csv;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = 'vendas-rock-na-veia-' + hoje() + '.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* --- entrada --- */
window.VX = {
  open(force) {
    if (loaded && !force) return;
    loaded = true;
    q('vx-body').innerHTML = '<p class="vx-empty">Carregando…</p>';
    load().catch(e => {
      loaded = false;
      q('vx-body').innerHTML = '<div class="vx-err">' + esc(e.message || 'Não consegui carregar.') + '</div><div class="vx-bar-act"><button type="button" class="vx-btn vx-out" data-a="retry">Tentar de novo</button></div>';
    });
  }
};
})();
