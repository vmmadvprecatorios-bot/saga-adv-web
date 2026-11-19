/* =====================================================================
   SAGA · Relatórios dos clientes (T192, blocos 244, 244b/c e 245; 17/11/2026, pedido do Dr. Victor)
   Pedidos de relatório processual ligados ao documento guardado na pasta "Relatórios processuais"
   da ficha. A tela Relatórios (relatorios_clientes.html) e a ficha do cliente usam este arquivo:
   o que se faz num lugar aparece no outro (o relatório É o documento da pasta; não há cópia).
   Funções do banco: relatorio_pedir, relatorio_situacao, relatorio_ligar_documento,
   relatorio_registrar_envio, relatorio_pasta_garantir, relatorios_do_processo, relatorios_config.
   ===================================================================== */
(function(global){
  'use strict';
  var BUCKET='documentos-clientes';
  var FICHA='ficha_cliente_padrao_metalico_FINAL.html';
  var SIT={pedido:'Pedido',em_preparacao:'Em preparação',pronto:'Pronto, falta enviar',enviado:'Enviado ao cliente',cancelado:'Cancelado'};
  var CANAIS=['WhatsApp','E-mail','Em mãos','Correio','Área do cliente','Outro'];
  var S={cfg:null,perms:null,usuarios:null,det:null};
  function sb(){return global._sb;}
  function $(id){return document.getElementById(id);}
  function esc(v){var d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML;}
  function dataBR(d){if(!d)return '';var s=String(d).slice(0,10).split('-');return s[2]+'/'+s[1]+'/'+s[0];}
  function dataHoraBR(d){if(!d)return '';var x=new Date(d);return x.toLocaleDateString('pt-BR')+' às '+x.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}
  function dataLoc(d){return d?new Date(d).toLocaleDateString('pt-BR'):'';}
  function diaLocal(d){var x=new Date(d);return new Date(x.getFullYear(),x.getMonth(),x.getDate());}
  function diasDesde(d){if(!d)return null;var h=new Date();h=new Date(h.getFullYear(),h.getMonth(),h.getDate());return Math.round((h-diaLocal(d))/86400000);}
  function hojeISO(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function cnj(n){try{return global.sagaFmt&&global.sagaFmt.cnj?global.sagaFmt.cnj(n):n;}catch(e){return n;}}
  function msgErro(e){return (e&&(e.message||e.error_description))||String(e||'erro desconhecido');}
  function toast(msg,tipo){
    var w=$('srToast');if(!w){w=document.createElement('div');w.id='srToast';w.className='sr-toast-wrap';document.body.appendChild(w);}
    var t=document.createElement('div');t.className='sr-toast '+(tipo||'');t.textContent=msg;w.appendChild(t);setTimeout(function(){t.remove();},5200);
  }
  function admin(){return typeof global.sagaPodeApagar==='function'&&global.sagaPodeApagar();}

  // ---------- estilos (só variáveis do tema) ----------
  function estilos(){
    if($('srEstilos'))return;
    var s=document.createElement('style');s.id='srEstilos';
    s.textContent=
      '.sr-mo{position:fixed;inset:0;z-index:2600;display:flex;align-items:safe center;justify-content:center;padding:24px 16px;background:rgba(6,10,20,.6);backdrop-filter:blur(3px);overflow:auto;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .28s cubic-bezier(.22,.78,.25,1),visibility 0s linear .28s}'+
      // 19/11 (Dr. Victor): janela de formulário abre NO MEIO da tela; a larga (lista que chega depois) fica no alto
      '.sr-mo:has(.sr-md.largo){align-items:flex-start;padding-top:6vh}'+
      '.sr-mo.aberto{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .28s cubic-bezier(.22,.78,.25,1),visibility 0s}'+
      'html.sem-movimento .sr-mo,html.sem-movimento .sr-md{transition:none!important}'+
      '.sr-md{width:100%;max-width:560px;border-radius:18px;background:var(--panel-solid);border:1px solid var(--border);box-shadow:var(--shadow);color:var(--text);font-family:Montserrat,Arial,sans-serif;transform:translateY(10px) scale(.985);transition:transform .34s cubic-bezier(.22,.78,.25,1)}'+
      '.sr-mo.aberto .sr-md{transform:none}.sr-md.largo{max-width:820px}'+
      '.sr-cab{padding:16px 18px 10px;border-bottom:1px solid var(--border-soft);display:flex;gap:10px;align-items:flex-start;justify-content:space-between}'+
      '.sr-cab h2{font-family:"Cormorant Garamond",serif;font-size:22px;font-weight:600;line-height:1.15}.sr-cab p{font-size:12px;color:var(--muted);margin-top:3px;line-height:1.5}'+
      '.sr-x{width:32px;height:32px;border-radius:9px;border:1px solid var(--border-soft);background:var(--panel);color:var(--muted);font-size:14px;flex:0 0 auto;cursor:pointer}'+
      '.sr-corpo{padding:14px 18px;display:flex;flex-direction:column;gap:10px;font-size:12.5px}'+
      '.sr-campo{display:flex;flex-direction:column;gap:5px}.sr-campo>label{font-size:10.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);font-weight:600}'+
      '.sr-campo input,.sr-campo select,.sr-campo textarea{height:36px;border-radius:10px;border:1px solid var(--border-soft);background:var(--panel);color:var(--text);padding:0 10px;font:inherit;font-size:12.5px;outline:0}'+
      '.sr-campo textarea{height:auto;min-height:72px;padding:9px 10px;resize:vertical}.sr-campo input:focus,.sr-campo select:focus,.sr-campo textarea:focus{border-color:var(--gold)}'+
      '.sr-linha2{display:grid;grid-template-columns:1fr 1fr;gap:10px}'+
      '.sr-esc{display:inline-flex;gap:3px;padding:3px;border:1px solid var(--border-soft);border-radius:11px;background:var(--panel);flex-wrap:wrap}'+
      '.sr-esc button{height:30px;padding:0 12px;border-radius:8px;font-size:11.5px;color:var(--muted);border:1px solid transparent;background:none;cursor:pointer}'+
      '.sr-esc button.active{color:var(--text);background:color-mix(in srgb,var(--gold) 14%,transparent);border-color:color-mix(in srgb,var(--gold) 45%,transparent)}'+
      '.sr-rod{display:flex;justify-content:flex-end;gap:8px;padding:10px 18px 16px;flex-wrap:wrap}'+
      '.sr-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 13px;border-radius:10px;font-size:12px;border:1px solid var(--border-soft);background:var(--panel);color:var(--text);cursor:pointer;font-family:inherit;text-decoration:none;white-space:nowrap;transition:border-color .2s,transform .15s}'+
      '.sr-btn:hover{border-color:var(--gold)}.sr-btn:active{transform:scale(.97)}.sr-btn:disabled{opacity:.45;cursor:default;transform:none}'+
      '.sr-btn.ouro{border-color:color-mix(in srgb,var(--gold) 55%,transparent);background:color-mix(in srgb,var(--gold) 14%,var(--panel))}'+
      '.sr-btn.perigo{color:var(--danger,#e5484d);border-color:color-mix(in srgb,var(--danger,#e5484d) 45%,transparent)}'+
      '.sr-btn.peq{height:28px;padding:0 10px;font-size:11px;border-radius:8px}'+
      '.sr-erro{display:none;padding:9px 11px;border-radius:10px;border:1px solid color-mix(in srgb,var(--danger,#e5484d) 55%,transparent);background:color-mix(in srgb,var(--danger,#e5484d) 9%,transparent);font-size:12px;line-height:1.5}.sr-erro.ver{display:block}'+
      '.sr-aviso{padding:9px 11px;border-radius:10px;border:1px solid var(--border-soft);background:color-mix(in srgb,var(--text) 4%,transparent);font-size:12px;line-height:1.5;color:var(--muted)}'+
      '.sr-selo{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;padding:2px 8px;border-radius:999px;border:1px solid var(--border-soft);color:var(--muted);white-space:nowrap;font-variant-numeric:tabular-nums}'+
      '.sr-selo.verde{color:var(--success,#16a34a);border-color:color-mix(in srgb,var(--success,#16a34a) 50%,transparent)}'+
      '.sr-selo.amarelo{color:var(--warning,#d97706);border-color:color-mix(in srgb,var(--warning,#d97706) 50%,transparent)}'+
      '.sr-selo.vermelho{color:var(--danger,#e5484d);border-color:color-mix(in srgb,var(--danger,#e5484d) 55%,transparent)}'+
      '.sr-selo.nunca{border-style:dashed}'+
      '.sr-sec{border:1px solid var(--border-soft);border-radius:13px;overflow:hidden}.sr-sec h3{font-size:10.5px;letter-spacing:.7px;text-transform:uppercase;color:var(--muted);font-weight:600;padding:9px 12px;border-bottom:1px solid var(--border-soft);background:color-mix(in srgb,var(--text) 3%,transparent)}'+
      '.sr-item{padding:10px 12px;border-bottom:1px solid var(--border-soft);display:flex;gap:10px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}.sr-item:last-child{border-bottom:0}'+
      '.sr-item .t{font-weight:600;font-size:12.5px;line-height:1.4;word-break:break-word}.sr-item .d{font-size:11.5px;color:var(--muted);line-height:1.5;margin-top:2px}.sr-item .ac{display:flex;gap:6px;flex-wrap:wrap}'+
      '.sr-hist{margin:6px 0 0 0;padding-left:14px;border-left:2px solid var(--border-soft);font-size:11px;color:var(--muted);line-height:1.6}'+
      '.sr-vazio{padding:14px 12px;color:var(--muted);font-size:12px}'+
      '.sr-arq{display:flex;align-items:center;gap:10px;padding:12px;border:1px dashed var(--border);border-radius:12px;cursor:pointer;font-size:12px;color:var(--muted);transition:border-color .2s}.sr-arq:hover,.sr-arq.sobre{border-color:var(--gold)}.sr-arq b{color:var(--text);font-weight:600}'+
      '.sr-prog{height:4px;border-radius:4px;background:var(--border-soft);overflow:hidden;display:none}.sr-prog.ver{display:block}.sr-prog i{display:block;height:100%;width:0;background:var(--gold);transition:width .3s cubic-bezier(.22,.78,.25,1)}'+
      '.sr-ficha{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;border:1px solid var(--border-soft);border-radius:12px;background:var(--panel);font-size:12px;margin:8px 0}'+
      '.sr-ficha .rot{font-size:10.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);font-weight:600}'+
      '.sr-toast-wrap{position:fixed;right:18px;bottom:18px;z-index:3100;display:flex;flex-direction:column;gap:8px}'+
      '.sr-toast{padding:11px 14px;border-radius:11px;background:var(--panel-solid);border:1px solid var(--border);box-shadow:var(--shadow);font-size:12px;max-width:380px;color:var(--text)}'+
      '.sr-toast.success{border-color:color-mix(in srgb,#16a34a 50%,var(--border))}.sr-toast.error{border-color:color-mix(in srgb,#e5484d 60%,var(--border))}'+
      '@media(max-width:640px){.sr-linha2{grid-template-columns:1fr}.sr-mo{padding:12px 8px}}';
    document.head.appendChild(s);
    try{if(localStorage.getItem('saga-movimento')==='reduzido')document.documentElement.classList.add('sem-movimento');}catch(e){}
  }

  // ---------- dados de apoio ----------
  async function config(){
    if(S.cfg)return S.cfg;
    try{var r=await sb().rpc('relatorios_config');if(!r.error&&r.data)S.cfg=r.data;}catch(e){}
    return S.cfg||{verde:60,amarelo:120,aviso_dias:5};
  }
  async function permissoes(){
    if(S.perms)return S.perms;
    try{var r=await sb().rpc('minhas_permissoes');S.perms=(!r.error&&Array.isArray(r.data))?r.data:[];}catch(e){S.perms=[];}
    return S.perms;
  }
  async function podeDocs(){var p=await permissoes();return p.indexOf('documentos.criar')>=0;}
  async function usuarios(){
    if(S.usuarios)return S.usuarios;
    var r=await sb().from('usuarios').select('id,nome_completo').eq('ativo',true).order('nome_completo');
    S.usuarios=r.error?[]:(r.data||[]);return S.usuarios;
  }
  function corDias(dias,cfg){
    if(dias==null)return 'nunca';
    cfg=cfg||S.cfg||{verde:60,amarelo:120};
    return dias<=cfg.verde?'verde':(dias<=cfg.amarelo?'amarelo':'vermelho');
  }
  function seloUltimo(ultimo,canal){
    var d=diasDesde(ultimo),c=corDias(d);
    if(d==null)return '<span class="sr-selo nunca" title="Nenhum relatório marcado como enviado">Nenhum relatório enviado</span>';
    var quando=d===0?'hoje':(d===1?'ontem':'há '+d+' dias');
    return '<span class="sr-selo '+c+'" title="Último relatório enviado em '+esc(dataHoraBR(ultimo))+(canal?' por '+esc(canal):'')+'">Último relatório: '+esc(dataLoc(ultimo))+' ('+quando+')</span>';
  }
  function seloSituacao(s){
    var cls=s==='enviado'?'verde':(s==='pronto'?'amarelo':(s==='cancelado'?'':''));
    return '<span class="sr-selo '+cls+'">'+esc(SIT[s]||s)+'</span>';
  }

  // ---------- janela genérica ----------
  function janela(id,largo){
    estilos();
    var mo=$(id);
    if(!mo){
      mo=document.createElement('div');mo.id=id;mo.className='sr-mo';mo.setAttribute('role','dialog');mo.setAttribute('aria-modal','true');
      mo.setAttribute('data-saga-movimento-proprio','');
      mo.innerHTML='<div class="sr-md'+(largo?' largo':'')+'"></div>';
      document.body.appendChild(mo);
      mo.addEventListener('mousedown',function(e){if(e.target===mo)fechar(mo);});
    }
    return mo;
  }
  function abrir(mo){requestAnimationFrame(function(){mo.classList.add('aberto');});}
  function fechar(mo){if(typeof mo==='string')mo=$(mo);if(mo)mo.classList.remove('aberto');}
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    var abertas=document.querySelectorAll('.sr-mo.aberto');if(abertas.length)fechar(abertas[abertas.length-1]);
  });
  function mostrarErro(el,msg){el.innerHTML='<b>Não deu certo.</b> '+esc(msg);el.classList.add('ver');}

  // ---------- PEDIR RELATÓRIO ----------
  async function pedir(op){
    op=op||{};
    var mo=janela('srPedir');var md=mo.firstChild;
    var us=await usuarios();
    md.innerHTML='<div class="sr-cab"><div><h2>Pedir relatório</h2><p>'+esc(op.rotulo||'')+'</p></div><button class="sr-x" type="button" data-f>✕</button></div>'+
      '<div class="sr-corpo">'+
        '<div class="sr-campo"><label>Quem pediu</label><div class="sr-esc" id="srSol"><button type="button" class="active" data-v="cliente">O cliente pediu</button><button type="button" data-v="interno">Pedido interno</button></div></div>'+
        '<div class="sr-linha2"><div class="sr-campo"><label for="srResp">Quem prepara</label><select id="srResp"><option value="">Responsável do processo</option>'+us.map(function(u){return '<option value="'+esc(u.id)+'">'+esc(u.nome_completo)+'</option>';}).join('')+'</select></div>'+
        '<div class="sr-campo"><label for="srPrazo">Prazo (opcional)</label><input id="srPrazo" type="date" min="'+hojeISO()+'"></div></div>'+
        '<div class="sr-campo"><label for="srObs">Observação (opcional)</label><textarea id="srObs" maxlength="2000" placeholder="Ex.: o cliente quer saber quando sai o pagamento"></textarea></div>'+
        '<div class="sr-erro" id="srPedirErro"></div>'+
      '</div><div class="sr-rod"><button class="sr-btn" type="button" data-f>Cancelar</button><button class="sr-btn ouro" type="button" id="srPedirOk">Pedir relatório</button></div>';
    var sol='cliente';
    md.querySelectorAll('#srSol button').forEach(function(b){b.addEventListener('click',function(){md.querySelectorAll('#srSol button').forEach(function(x){x.classList.toggle('active',x===b);});sol=b.dataset.v;});});
    md.querySelectorAll('[data-f]').forEach(function(b){b.addEventListener('click',function(){fechar(mo);});});
    $('srPedirOk').addEventListener('click',async function(){
      var bt=this;bt.disabled=true;$('srPedirErro').classList.remove('ver');
      var r=await sb().rpc('relatorio_pedir',{p_processo:op.processo_id,p_solicitante:sol,p_responsavel:$('srResp').value||null,p_prazo:$('srPrazo').value||null,p_observacao:$('srObs').value.trim()||null});
      bt.disabled=false;
      if(r.error){mostrarErro($('srPedirErro'),msgErro(r.error));return;}
      fechar(mo);toast('Pedido de relatório registrado.','success');
      if(op.depois)op.depois();
    });
    abrir(mo);
  }

  // ---------- ENVIADO AO CLIENTE (canal + data) ----------
  function perguntarEnvio(titulo,sub){
    return new Promise(function(res){
      var mo=janela('srEnvio');var md=mo.firstChild;
      var agora=new Date();var loc=new Date(agora.getTime()-agora.getTimezoneOffset()*60000).toISOString().slice(0,16);
      md.innerHTML='<div class="sr-cab"><div><h2>'+esc(titulo||'Enviado ao cliente')+'</h2><p>'+esc(sub||'')+'</p></div><button class="sr-x" type="button" data-f>✕</button></div>'+
        '<div class="sr-corpo">'+
        '<div class="sr-campo"><label>Por onde foi enviado</label><div class="sr-esc" id="srCanal">'+CANAIS.map(function(c,i){return '<button type="button" data-v="'+esc(c)+'"'+(i===0?' class="active"':'')+'>'+esc(c)+'</button>';}).join('')+'</div></div>'+
        '<div class="sr-campo"><label for="srQuando">Quando foi enviado</label><input id="srQuando" type="datetime-local" max="'+loc+'" value="'+loc+'"></div>'+
        '<div class="sr-campo"><label for="srObsEnv">Observação (opcional)</label><textarea id="srObsEnv" maxlength="1000" placeholder="Ex.: enviado para a filha, a pedido do cliente"></textarea></div>'+
        '</div><div class="sr-rod"><button class="sr-btn" type="button" data-f>Cancelar</button><button class="sr-btn ouro" type="button" id="srEnvOk">Marcar como enviado</button></div>';
      var canal=CANAIS[0],feito=false;
      md.querySelectorAll('#srCanal button').forEach(function(b){b.addEventListener('click',function(){md.querySelectorAll('#srCanal button').forEach(function(x){x.classList.toggle('active',x===b);});canal=b.dataset.v;});});
      function sair(v){if(feito)return;feito=true;fechar(mo);res(v);}
      md.querySelectorAll('[data-f]').forEach(function(b){b.addEventListener('click',function(){sair(null);});});
      mo.addEventListener('transitionend',function f(){if(!mo.classList.contains('aberto')){mo.removeEventListener('transitionend',f);sair(null);}});
      $('srEnvOk').addEventListener('click',function(){var q=$('srQuando').value;sair({canal:canal,quando:q?new Date(q).toISOString():null,texto:$('srObsEnv').value.trim()||null});});
      abrir(mo);
    });
  }

  // ---------- GUARDAR O RELATÓRIO (sobe para a pasta oficial da ficha) ----------
  async function guardarArquivo(proc,arquivo,aoProgresso){
    var tam=arquivo.size||0;
    if(tam>50*1024*1024)throw new Error('o arquivo tem '+(tam/1048576).toFixed(1)+' MB; o limite é 50 MB');
    var s=await sb().auth.getSession();var uid=s.data&&s.data.session&&s.data.session.user&&s.data.session.user.id;
    if(!uid)throw new Error('sua sessão expirou; entre de novo no SAGA');
    var us=await sb().from('usuarios').select('id').eq('auth_user_id',uid).maybeSingle();
    if(us.error||!us.data)throw new Error('não achei o seu cadastro de usuário');
    if(aoProgresso)aoProgresso(15);
    var pa=await sb().rpc('relatorio_pasta_garantir',{p_pessoa:proc.pessoa_id});
    if(pa.error)throw pa.error;
    var nome=String(arquivo.name||'Relatório.pdf').replace(/[\\/:*?"<>|]+/g,'-');
    var caminho=proc.processo_id+'/'+(global.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now())+'_'+nome.replace(/[^a-zA-Z0-9._-]/g,'_');
    if(aoProgresso)aoProgresso(35);
    var up=await sb().storage.from(BUCKET).upload(caminho,arquivo,{contentType:arquivo.type||'application/octet-stream'});
    if(up.error)throw up.error;
    if(aoProgresso)aoProgresso(80);
    var ext=(nome.match(/\.([a-z0-9]+)$/i)||[])[1];
    var ins=await sb().from('documentos').insert({processo_id:proc.processo_id,pessoa_id:proc.pessoa_id,usuario_id:us.data.id,nome_arquivo:nome,caminho_storage:caminho,tipo_documento:ext?ext.toLowerCase():null,tamanho_bytes:tam,pasta_id:pa.data,visivel_portal_cliente:false,excluido_logico:false}).select('id').single();
    if(ins.error){var rm=await sb().storage.from(BUCKET).remove([caminho]);throw new Error(msgErro(ins.error)+(rm.error?' (e o arquivo enviado ficou solto: avise o administrador)':''));}
    if(aoProgresso)aoProgresso(100);
    return ins.data.id;
  }

  // ---------- DETALHE DO PROCESSO (pedidos, histórico, relatórios da pasta) ----------
  async function detalhe(op){
    op=op||{};S.det=op;
    var mo=janela('srDetalhe',true);var md=mo.firstChild;
    md.innerHTML='<div class="sr-cab"><div><h2>Relatórios do processo</h2><p>'+esc(op.rotulo||'')+'</p></div><button class="sr-x" type="button" data-f>✕</button></div><div class="sr-corpo"><div class="sr-aviso">Carregando…</div></div>';
    md.querySelector('[data-f]').addEventListener('click',function(){fechar(mo);});
    abrir(mo);
    await desenharDetalhe();
  }
  async function desenharDetalhe(){
    var op=S.det;if(!op)return;
    var mo=$('srDetalhe');var md=mo.firstChild;
    var r=await sb().rpc('relatorios_do_processo',{p_processo:op.processo_id});
    await config();
    var docsOk=await podeDocs();
    var corpo;
    if(r.error){
      corpo='<div class="sr-erro ver"><b>Não consegui ler os relatórios deste processo.</b> Motivo: '+esc(msgErro(r.error))+'. Tente de novo; se continuar, avise o administrador com esta mensagem.</div>';
    }else{
      var d=r.data||{},peds=d.pedidos||[],docs=d.documentos||[],nomes=d.nomes||{};
      var aberto=peds.filter(function(p){return ['pedido','em_preparacao','pronto'].indexOf(p.situacao)>=0;})[0];
      var envs=peds.filter(function(p){return p.situacao==='enviado'&&p.enviado_em;}).sort(function(a,b){return a.enviado_em<b.enviado_em?1:-1;});
      var ult=envs[0];
      corpo='<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+seloUltimo(ult&&ult.enviado_em,ult&&ult.canal_envio)+
        (op.pessoa_id?'<a class="sr-btn peq" href="'+esc(FICHA+'?pessoa_id='+encodeURIComponent(op.pessoa_id)+'&processo_id='+encodeURIComponent(op.processo_id))+'">Abrir ficha ↗</a>':'')+
        (!aberto?'<button class="sr-btn peq ouro" type="button" data-acao="pedir">+ Pedir relatório</button>':'')+'</div>';
      // pedido em aberto
      if(aberto){
        var acoes='';
        if(docsOk){
          if(aberto.situacao==='pedido')acoes+='<button class="sr-btn peq" type="button" data-sit="em_preparacao">Começar a preparar</button>';
          if(aberto.situacao!=='pedido')acoes+='<button class="sr-btn peq" type="button" data-sit="pedido">Voltar para pedido</button>';
          if(aberto.situacao==='em_preparacao'&&aberto.documento_id)acoes+='<button class="sr-btn peq" type="button" data-sit="pronto">Pronto</button>';
          if(aberto.documento_id)acoes+='<button class="sr-btn peq ouro" type="button" data-sit="enviado">Enviado ao cliente</button>';
        }
        if(admin())acoes+='<button class="sr-btn peq perigo" type="button" data-sit="cancelado">Cancelar pedido</button>';
        corpo+='<div class="sr-sec"><h3>Pedido em aberto</h3><div class="sr-item"><div style="flex:1;min-width:220px">'+
          '<div class="t">'+seloSituacao(aberto.situacao)+' '+(aberto.solicitante==='cliente'?'O cliente pediu':'Pedido interno')+'</div>'+
          '<div class="d">Pedido por <b>'+esc(aberto.pedido_por||'—')+'</b> em '+esc(dataHoraBR(aberto.criado_em))+' · prepara: <b>'+esc(aberto.responsavel||'—')+'</b>'+(aberto.prazo?' · prazo '+esc(dataBR(aberto.prazo)):'')+'</div>'+
          (aberto.observacao?'<div class="d">'+esc(aberto.observacao)+'</div>':'')+
          '<div class="d">Relatório: '+(aberto.documento?'<b>'+esc(aberto.documento)+'</b>':'ainda não guardado na pasta "Relatórios processuais"')+'</div>'+
          '</div><div class="ac">'+acoes+'</div></div>'+
          (docsOk&&!aberto.documento_id?'<div class="sr-item" style="display:block"><label class="sr-arq" id="srArq"><input type="file" id="srArqIn" hidden accept=".pdf,.doc,.docx,.odt,image/*"><span>📄</span><span><b>Guardar o relatório</b> (clique ou solte o arquivo aqui). Ele vai para a pasta "Relatórios processuais" do cliente e o pedido fica pronto.</span></label><div class="sr-prog" id="srProg"><i></i></div><div class="sr-erro" id="srArqErro"></div></div>':'')+
          '</div>';
      }
      // relatórios da pasta
      corpo+='<div class="sr-sec"><h3>Relatórios guardados na pasta ('+docs.length+')</h3>'+(docs.length?docs.map(function(x){
        var usado=peds.some(function(p){return p.documento_id===x.id&&p.situacao!=='cancelado';});
        var ac='<button class="sr-btn peq" type="button" data-abrir="'+esc(x.caminho)+'" data-nome="'+esc(x.nome)+'">Abrir</button>';
        if(docsOk&&!x.enviado_em){
          if(aberto&&!aberto.documento_id&&!usado)ac+='<button class="sr-btn peq" type="button" data-ligar="'+esc(x.id)+'">Usar neste pedido</button>';
          if(!aberto||aberto.documento_id===x.id||!usado)ac+='<button class="sr-btn peq ouro" type="button" data-envio="'+esc(x.id)+'">Registrar envio</button>';
        }
        return '<div class="sr-item"><div style="flex:1;min-width:200px"><div class="t">'+esc(x.nome)+'</div><div class="d">'+esc(x.pasta)+' · guardado em '+esc(dataHoraBR(x.criado_em))+
          ' · '+(x.enviado_em?'<span class="sr-selo verde">Enviado em '+esc(dataLoc(x.enviado_em))+'</span>':'<span class="sr-selo">Não marcado como enviado</span>')+'</div></div><div class="ac">'+ac+'</div></div>';
      }).join(''):'<div class="sr-vazio">Nenhum relatório na pasta "Relatórios processuais" deste processo.'+(docsOk&&!aberto?' Para guardar um, peça o relatório (ou suba direto pela ficha, na pasta).':'')+'</div>')+'</div>';
      // histórico
      var fechados=peds.filter(function(p){return p!==aberto;});
      corpo+='<div class="sr-sec"><h3>Histórico de pedidos e envios ('+fechados.length+')</h3>'+(fechados.length?fechados.map(function(p){
        return '<div class="sr-item" style="display:block"><div class="t">'+seloSituacao(p.situacao)+' '+(p.situacao==='enviado'?'em '+esc(dataHoraBR(p.enviado_em))+(p.canal_envio?' por '+esc(p.canal_envio):'')+(p.enviado_por?' · '+esc(p.enviado_por):''):'')+'</div>'+
          '<div class="d">'+(p.solicitante==='cliente'?'O cliente pediu':'Pedido interno')+' · pedido por '+esc(p.pedido_por||'—')+' em '+esc(dataLoc(p.criado_em))+(p.documento?' · relatório: '+esc(p.documento):'')+'</div>'+
          historico(p.historico,nomes)+'</div>';
      }).join(''):'<div class="sr-vazio">Ainda não há relatórios enviados neste processo.</div>')+'</div>';
      if(aberto)corpo+='<details class="sr-aviso"><summary style="cursor:pointer">Histórico do pedido em aberto</summary>'+historico(aberto.historico,nomes)+'</details>';
      op._aberto=aberto;
    }
    md.innerHTML='<div class="sr-cab"><div><h2>Relatórios do processo</h2><p>'+esc(op.rotulo||'')+'</p></div><button class="sr-x" type="button" data-f>✕</button></div><div class="sr-corpo">'+corpo+'<div class="sr-erro" id="srDetErro"></div></div>';
    ligarDetalhe(md);
  }
  function historico(h,nomes){
    if(!h||!h.length)return '';
    return '<div class="sr-hist">'+h.map(function(e){return esc(dataHoraBR(e.em))+' · '+esc(e.evento)+(e.por&&nomes[e.por]?' · '+esc(nomes[e.por]):'')+(e.texto?' · '+esc(e.texto):'');}).join('<br>')+'</div>';
  }
  function depoisMudar(){if(S.det&&S.det.depois)try{S.det.depois();}catch(e){} return desenharDetalhe();}
  function ligarDetalhe(md){
    var op=S.det,mo=$('srDetalhe');
    md.querySelector('[data-f]').addEventListener('click',function(){fechar(mo);});
    var erro=$('srDetErro');
    md.querySelectorAll('[data-acao="pedir"]').forEach(function(b){b.addEventListener('click',function(){pedir({processo_id:op.processo_id,rotulo:op.rotulo,depois:depoisMudar});});});
    md.querySelectorAll('[data-sit]').forEach(function(b){b.addEventListener('click',async function(){
      var sit=b.dataset.sit,ab=op._aberto;if(!ab)return;var extra={};
      if(sit==='enviado'){var e=await perguntarEnvio('Relatório enviado ao cliente',op.rotulo);if(!e)return;extra={p_canal:e.canal,p_enviado_em:e.quando,p_texto:e.texto};}
      if(sit==='cancelado'){
        var ok=global.sagaConfirmar?await global.sagaConfirmar('Cancelar pedido de relatório','O pedido sai da lista de abertos (o histórico fica guardado).','Cancelar pedido',true):confirm('Cancelar este pedido?');
        if(!ok)return;
      }
      b.disabled=true;
      var r=await sb().rpc('relatorio_situacao',Object.assign({p_id:ab.id,p_situacao:sit},extra));
      b.disabled=false;
      if(r.error){mostrarErro(erro,msgErro(r.error));return;}
      toast(sit==='enviado'?'Envio registrado: o último relatório agora é de hoje.':'Pedido atualizado: '+(SIT[sit]||sit)+'.','success');
      depoisMudar();
    });});
    md.querySelectorAll('[data-abrir]').forEach(function(b){b.addEventListener('click',async function(){
      var w=window.open('about:blank','_blank');
      var u=await sb().storage.from(BUCKET).createSignedUrl(b.dataset.abrir,300);
      if(u.error||!u.data){if(w)w.close();mostrarErro(erro,'não consegui abrir o arquivo: '+msgErro(u.error));return;}
      if(w)w.location.href=u.data.signedUrl;else location.href=u.data.signedUrl;
    });});
    md.querySelectorAll('[data-ligar]').forEach(function(b){b.addEventListener('click',async function(){
      b.disabled=true;var r=await sb().rpc('relatorio_ligar_documento',{p_id:op._aberto.id,p_documento:b.dataset.ligar});b.disabled=false;
      if(r.error){mostrarErro(erro,msgErro(r.error));return;}
      toast('Relatório ligado ao pedido: ele está pronto para enviar.','success');depoisMudar();
    });});
    md.querySelectorAll('[data-envio]').forEach(function(b){b.addEventListener('click',async function(){
      var e=await perguntarEnvio('Registrar envio do relatório',op.rotulo);if(!e)return;
      b.disabled=true;var r=await sb().rpc('relatorio_registrar_envio',{p_documento:b.dataset.envio,p_canal:e.canal,p_enviado_em:e.quando,p_solicitante:'cliente',p_texto:e.texto});b.disabled=false;
      if(r.error){mostrarErro(erro,msgErro(r.error));return;}
      toast('Envio registrado.','success');depoisMudar();
    });});
    var arq=$('srArq'),inp=$('srArqIn');
    if(arq&&inp){
      async function subir(f){
        if(!f)return;var prog=$('srProg'),bar=prog.firstChild;prog.classList.add('ver');$('srArqErro').classList.remove('ver');
        try{await guardarArquivo(op,f,function(p){bar.style.width=p+'%';});toast('Relatório guardado na pasta "Relatórios processuais".','success');depoisMudar();}
        catch(e){prog.classList.remove('ver');mostrarErro($('srArqErro'),msgErro(e));}
      }
      inp.addEventListener('change',function(){subir(inp.files&&inp.files[0]);inp.value='';});
      arq.addEventListener('dragover',function(e){e.preventDefault();arq.classList.add('sobre');});
      arq.addEventListener('dragleave',function(){arq.classList.remove('sobre');});
      arq.addEventListener('drop',function(e){e.preventDefault();arq.classList.remove('sobre');subir(e.dataTransfer.files&&e.dataTransfer.files[0]);});
    }
  }

  // ---------- QUADRO NA FICHA (um por processo) ----------
  // el: onde desenhar; op: {processo_id, pessoa_id, rotulo}
  async function blocoFicha(el,op){
    estilos();if(!el||!op||!op.processo_id)return;
    await config();
    el.innerHTML='<div class="sr-ficha"><span class="rot">Relatórios</span><span class="sr-selo">Carregando…</span></div>';
    var r=await sb().rpc('relatorios_do_processo',{p_processo:op.processo_id});
    if(r.error){el.innerHTML='<div class="sr-ficha"><span class="rot">Relatórios</span><span class="sr-selo vermelho" title="'+esc(msgErro(r.error))+'">Não consegui ler: '+esc(msgErro(r.error))+'</span></div>';return;}
    var peds=(r.data&&r.data.pedidos)||[];
    var envs=peds.filter(function(p){return p.situacao==='enviado'&&p.enviado_em;}).sort(function(a,b){return a.enviado_em<b.enviado_em?1:-1;});
    var ab=peds.filter(function(p){return ['pedido','em_preparacao','pronto'].indexOf(p.situacao)>=0;})[0];
    el.innerHTML='<div class="sr-ficha"><span class="rot">Relatórios</span>'+seloUltimo(envs[0]&&envs[0].enviado_em,envs[0]&&envs[0].canal_envio)+
      (ab?seloSituacao(ab.situacao)+'<span class="sr-selo">pedido em '+esc(dataLoc(ab.criado_em))+'</span>':'')+
      '<span style="flex:1"></span>'+(!ab?'<button class="sr-btn peq" type="button" data-sr-pedir>Pedir relatório</button>':'')+
      '<button class="sr-btn peq" type="button" data-sr-ver>Ver relatórios</button></div>';
    var recarregar=function(){blocoFicha(el,op);if(op.depois)try{op.depois();}catch(e){}};
    var bp=el.querySelector('[data-sr-pedir]');if(bp)bp.addEventListener('click',function(){pedir({processo_id:op.processo_id,rotulo:op.rotulo,depois:recarregar});});
    el.querySelector('[data-sr-ver]').addEventListener('click',function(){detalhe({processo_id:op.processo_id,pessoa_id:op.pessoa_id,rotulo:op.rotulo,depois:recarregar});});
  }

  global.SagaRelatorios={pedir:pedir,detalhe:detalhe,blocoFicha:blocoFicha,config:config,corDias:corDias,diasDesde:diasDesde,seloUltimo:seloUltimo,
    seloSituacao:seloSituacao,SIT:SIT,podeDocs:podeDocs,usuarios:usuarios,limparCache:function(){S.cfg=null;S.perms=null;S.usuarios=null;},estilos:estilos,cnj:cnj,toast:toast};
})(window);
