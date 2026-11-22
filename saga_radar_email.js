/* =====================================================================
   RADAR DO E-MAIL (22/11/2026, pedido do Dr. Victor; blocos 380 e 381; função do servidor radar-email)
   Intimações > "Radar do e-mail" (botão ao lado de "OABs monitoradas"), SÓ o administrador geral:
   senha de app do Gmail (vai para o cofre do banco; a tela mostra só os 4 últimos caracteres), caixa, remetentes,
   liga/desliga, "Testar a ligação", "Rodar agora", última rodada, e-mails NÃO ENTENDIDOS (erros sempre à vista) e
   o passo a passo para criar a senha de app no Google. Carregado por 1 linha no fim do monitoramento_multi_oab.html.
   ?radar_email=1 abre direto (link da Saúde do sistema).
   ===================================================================== */
(function(){
  'use strict';
  var esc=function(v){return window.sagaEsc?window.sagaEsc(v):String(v==null?'':v).replace(/[&<>"'`]/g,function(c){return '&#'+c.charCodeAt(0)+';';});};
  var url=function(u){return window.sagaUrlSegura?window.sagaUrlSegura(u):'';};
  var erroTxt=function(e){return (window.sagaErroBanco?window.sagaErroBanco(e):(e&&e.message))||String(e||'erro');};
  var sb=function(){return window._sb;};
  var S={dados:null,ocupado:false,admin:false};
  var dataHora=function(t){if(!t)return '—';var d=new Date(t);if(isNaN(d))return '—';return d.toLocaleString('pt-BR',{timeZone:'America/Maceio',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(',','');};

  var css=document.createElement('style');
  css.textContent=
    '#reJanela .re-sec{margin:16px 0 6px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}'+
    '#reJanela .re-sit{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:12px;border:1px solid var(--border-soft);background:var(--panel);font-size:13px;line-height:1.5}'+
    '#reJanela .re-bola{width:12px;height:12px;border-radius:50%;flex:0 0 12px;margin-top:4px;background:var(--muted)}'+
    '#reJanela .re-sit.verde .re-bola{background:var(--success,#2fa36b)}#reJanela .re-sit.amarelo .re-bola{background:var(--warning,#d79b1f)}#reJanela .re-sit.vermelho .re-bola{background:var(--danger,#e5484d)}'+
    '#reJanela .re-sit.vermelho{border-color:var(--danger,#e5484d)}#reJanela .re-sit.amarelo{border-color:var(--warning,#d79b1f)}'+
    '#reJanela .re-grade{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px 14px}'+
    '#reJanela .re-campo label{display:block;font-size:11.5px;font-weight:700;color:var(--muted);margin-bottom:4px}'+
    '#reJanela .re-campo input:not([type=checkbox]),#reJanela .re-campo textarea{width:100%;box-sizing:border-box}#reJanela .re-chave input{width:18px;height:18px;flex:0 0 18px;margin:0}'+
    '#reJanela .re-campo textarea{min-height:120px;font-family:inherit;font-size:12.5px}'+
    '#reJanela .re-dica{font-size:11.5px;color:var(--muted);margin-top:4px;line-height:1.45}'+
    '#reJanela .re-botoes{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}'+
    '#reJanela .re-msg{margin-top:10px;font-size:12.5px;line-height:1.5;padding:9px 12px;border-radius:10px;border:1px solid var(--border-soft);overflow-wrap:anywhere}'+
    '#reJanela .re-msg.ok{border-color:var(--success,#2fa36b)}#reJanela .re-msg.erro{border-color:var(--danger,#e5484d);color:var(--danger,#e5484d)}'+
    '#reJanela .re-lista{display:grid;gap:6px}'+
    '#reJanela .re-item{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:9px 11px;border:1px solid var(--border-soft);border-radius:10px;font-size:12.5px;line-height:1.45;overflow-wrap:anywhere}'+
    '#reJanela .re-item>div{min-width:0}#reJanela .re-item .re-acoes{display:flex;gap:6px;flex-wrap:wrap;flex:0 0 auto}'+
    '#reJanela .re-item.erro{border-color:var(--danger,#e5484d)}#reJanela .re-item.falhou{border-left:3px solid var(--danger,#e5484d)}#reJanela .re-item.certa{border-left:3px solid var(--success,#2fa36b)}'+
    '#reJanela .re-sub{font-size:11.5px;color:var(--muted)}'+
    '#reJanela details.re-passos{border:1px solid var(--border-soft);border-radius:12px;padding:10px 14px;margin-top:12px}'+
    '#reJanela details.re-passos summary{cursor:pointer;font-weight:700;font-size:13px}'+
    '#reJanela details.re-passos ol{margin:10px 0 4px;padding-left:20px;font-size:12.5px;line-height:1.6}'+
    '#reJanela .re-chave{display:flex;align-items:center;gap:8px;font-size:12.5px}'+
    '@media(max-width:640px){#reJanela .re-grade{grid-template-columns:minmax(0,1fr)}#reJanela .re-item{flex-direction:column}#reJanela .re-botoes .si-btn{flex:1 1 auto}}';
  document.head.appendChild(css);

  function janela(){
    var j=document.getElementById('reJanela');
    if(j)return j;
    document.body.insertAdjacentHTML('beforeend',
      '<div class="si-ov" id="reJanela"><div class="si-modal peq" role="dialog" aria-modal="true" aria-labelledby="reTitulo">'+
        '<div class="si-mh"><div><h2 id="reTitulo">Radar do e-mail</h2><p>Robô do SAGA que lê a caixa das intimações de hora em hora (só leitura: não apaga, não marca como lido, não move nada) e grava cada publicação nas Intimações, sem repetir o que já veio pelo CNJ.</p></div><button class="si-x" type="button" data-re-fechar aria-label="Fechar">✕</button></div>'+
        '<div class="si-mb" id="reCorpo"><div class="re-sub">Carregando…</div></div>'+
        '<div class="si-mf"><button class="si-btn" type="button" data-re-fechar>Fechar</button></div>'+
      '</div></div>');
    j=document.getElementById('reJanela');
    j.addEventListener('click',function(e){
      if(e.target===j||e.target.closest('[data-re-fechar]')){fechar();return;}
      var b=e.target.closest('[data-re]');if(!b||S.ocupado)return;
      var a=b.getAttribute('data-re');
      if(a==='salvar')salvar();
      else if(a==='testar')chamar('testar',b);
      else if(a==='rodar')chamar('rodar',b);
      else if(a==='resolver')resolver(b.getAttribute('data-msgid'));
      else if(a==='atualizar')carregar();
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&j.classList.contains('open'))fechar();});
    return j;
  }
  function abrir(){janela().classList.add('open');carregar();}
  function fechar(){var j=document.getElementById('reJanela');if(j)j.classList.remove('open');}

  async function carregar(){
    var c=document.getElementById('reCorpo');
    try{
      var r=await sb().rpc('radar_email_situacao');
      if(r.error)throw r.error;
      S.dados=r.data||{};desenhar();
    }catch(e){c.innerHTML='<div class="re-msg erro">Não consegui ler a situação do radar: '+esc(erroTxt(e))+'. <button class="si-btn" type="button" data-re="atualizar">Tentar de novo</button></div>';}
  }
  function situacao(d){
    var u=(d.rodadas||[])[0];
    if(!d.ativo)return {cor:'cinza',txt:'Desligado. Ligue abaixo para o robô voltar a ler a caixa.'};
    if(!d.tem_senha)return {cor:'cinza',txt:'Esperando a senha de app do Gmail. Siga o passo a passo abaixo e cole a senha.'};
    if(!u)return {cor:'cinza',txt:'Ainda não rodou. Use "Testar a ligação" e depois "Rodar agora" (ou espere a próxima rodada).'};
    var cod=u.detalhe&&u.detalhe.codigo;
    if(!u.ok&&cod)return {cor:/LOGIN|SENHA|BLOQUEIO|CONFIG|COFRE/.test(cod)?'vermelho':'amarelo',txt:'A última rodada falhou em '+dataHora(u.inicio)+': '+(u.mensagem||'sem mensagem')};
    if((d.erros||[]).length)return {cor:'amarelo',txt:'Última rodada em '+dataHora(u.inicio)+': '+(u.mensagem||'')+' Há e-mails não entendidos na lista abaixo.'};
    return {cor:'verde',txt:'Lendo normalmente. Última rodada em '+dataHora(u.inicio)+': '+(u.mensagem||'')};
  }
  function desenhar(){
    var d=S.dados||{},s=situacao(d),h=d.h24||{};
    var rod=(d.rodadas||[]).map(function(r){
      return '<div class="re-item '+(r.ok?'certa':(r.detalhe&&r.detalhe.codigo?'falhou':''))+'"><div><b>'+esc(dataHora(r.inicio))+'</b> · '+esc(r.detalhe&&r.detalhe.origem==='manual'?'Rodar agora':'automática')+'<div>'+esc(r.mensagem||'')+'</div></div></div>';
    }).join('')||'<div class="re-sub">Nenhuma rodada ainda.</div>';
    var erros=(d.erros||[]).map(function(e){
      var lk=url(e.link);
      return '<div class="re-item erro"><div><b>'+esc(e.assunto||'(sem assunto)')+'</b><div class="re-sub">'+esc(e.remetente||'')+' · chegou '+esc(dataHora(e.recebido_em))+'</div><div>'+esc(e.motivo||'')+'</div></div>'+
        '<div class="re-acoes">'+(lk?'<a class="si-btn" href="'+esc(lk)+'" target="_blank" rel="noopener">Abrir no Gmail ↗</a>':'')+'<button class="si-btn" type="button" data-re="resolver" data-msgid="'+esc(e.msgid)+'">Já tratei</button></div></div>';
    }).join('');
    var ign=(d.ignoradas||[]).map(function(e){return '<div class="re-item"><div><b>'+esc(e.assunto||'(sem assunto)')+'</b><div class="re-sub">'+esc(e.remetente||'')+' · '+esc(dataHora(e.recebido_em))+' · '+esc(e.motivo||'')+'</div></div></div>';}).join('');
    document.getElementById('reCorpo').innerHTML=
      '<div class="re-sit '+s.cor+'" role="status"><span class="re-bola" aria-hidden="true"></span><div>'+esc(s.txt)+
        '<div class="re-sub" style="margin-top:4px">Próxima rodada: '+esc(dataHora(d.proxima))+' · Últimas 24 h: '+esc(h.emails||0)+' e-mail(s), '+esc(h.novas||0)+' intimação(ões) nova(s), '+esc(h.ja_tinha||0)+' já tinham chegado, '+esc(h.ignoradas||0)+' não eram intimação'+(h.nao_entendidas?', <b>'+esc(h.nao_entendidas)+' não entendido(s)</b>':'')+'</div></div></div>'+
      (erros?'<div class="re-sec">E-mails não entendidos ('+(d.erros||[]).length+')</div><div class="re-dica" style="margin:0 0 6px">Nada foi descartado: abra no Gmail, confira e, se for intimação, lance à mão. "Já tratei" tira da lista (fica no registro).</div><div class="re-lista">'+erros+'</div>':'')+
      '<div class="re-sec">Ligação com o Gmail</div>'+
      '<div class="re-grade">'+
        '<div class="re-campo"><label for="reConta">Caixa das intimações</label><input id="reConta" type="email" autocomplete="off" value="'+esc(d.conta||'')+'"></div>'+
        '<div class="re-campo"><label for="reSenha">Senha de app do Gmail</label><input id="reSenha" type="password" autocomplete="new-password" spellcheck="false" placeholder="'+(d.tem_senha?esc('Gravada: termina em '+(d.senha_final||'????')+' (cole outra para trocar)'):'Cole aqui as 16 letras')+'">'+
          '<div class="re-dica">'+(d.tem_senha?'Gravada em '+esc(dataHora(d.senha_em))+'. ':'')+'Vai direto para o cofre do banco: ninguém vê a senha depois de salva, nem aqui.</div></div>'+
        '<div class="re-campo"><label for="reDias">Ler os e-mails dos últimos (dias)</label><input id="reDias" type="number" min="1" max="30" value="'+esc(d.dias||3)+'"></div>'+
        '<div class="re-campo"><label>Situação do robô</label><label class="re-chave" style="font-weight:400;color:var(--text)"><input id="reAtivo" type="checkbox"'+(d.ativo?' checked':'')+'> Ligado (lê de hora em hora)</label></div>'+
      '</div>'+
      '<div class="re-campo" style="margin-top:10px"><label for="reRem">Remetentes (um por linha)</label><textarea id="reRem" spellcheck="false">'+esc((d.remetentes||[]).join('\n'))+'</textarea>'+
        '<div class="re-dica">E-mail completo (pje@trf5.jus.br) ou o fim do endereço (jus.br = qualquer tribunal). Não entram: juntada de petição ou de certidão, expedição de mandado, confirmação de protocolo e aviso de login do CNJ (aparecem em "Não eram intimação").</div></div>'+
      '<div class="re-botoes"><button class="si-btn pri" type="button" data-re="salvar">Salvar</button><button class="si-btn" type="button" data-re="testar"'+(d.tem_senha?'':' disabled')+'>Testar a ligação</button><button class="si-btn" type="button" data-re="rodar"'+(d.tem_senha?'':' disabled')+'>Rodar agora</button><button class="si-btn" type="button" data-re="atualizar">Atualizar</button></div>'+
      '<div id="reMsg" aria-live="polite">'+(d.ultimo_teste_em?'<div class="re-msg '+(d.ultimo_teste_ok?'ok':'erro')+'">Último teste ('+esc(dataHora(d.ultimo_teste_em))+'): '+esc(d.ultimo_teste_msg||'')+'</div>':'')+'</div>'+
      '<details class="re-passos"'+(d.tem_senha?'':' open')+'><summary>Como criar a senha de app no Google (5 minutos)</summary><ol>'+
        '<li>No computador, entre no Gmail com a conta <b>'+esc(d.conta||'da caixa das intimações')+'</b>.</li>'+
        '<li>Abra <a href="https://myaccount.google.com/security" target="_blank" rel="noopener">myaccount.google.com/security</a> e confira se a <b>Verificação em duas etapas</b> está ATIVADA (sem ela o Google não mostra a senha de app). Se não estiver, ative primeiro.</li>'+
        '<li>Abra <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">myaccount.google.com/apppasswords</a> (o Google pode pedir a senha da conta de novo).</li>'+
        '<li>Em "Nome do app", escreva <b>SAGA radar</b> e clique em <b>Criar</b>.</li>'+
        '<li>Aparece uma caixa amarela com <b>16 letras</b> em 4 grupos (ex.: abcd efgh ijkl mnop). Copie e cole no campo "Senha de app do Gmail" acima (os espaços podem ficar) e clique em <b>Salvar</b>.</li>'+
        '<li>Clique em <b>Testar a ligação</b>. Deu certo? Clique em <b>Rodar agora</b> para a primeira leitura.</li>'+
        '<li>Não guarde a senha em outro lugar e não mande pelo chat: se precisar trocar, apague a antiga no mesmo endereço do passo 3 e crie outra.</li>'+
      '</ol><div class="re-dica">O robô só LÊ: entra pela pasta "Todos os e-mails" em modo somente leitura, então nada muda na caixa (os e-mails continuam como não lidos).</div></details>'+
      '<div class="re-sec">Últimas rodadas</div><div class="re-lista">'+rod+'</div>'+
      (ign?'<details class="re-passos"><summary>Não eram intimação, últimos 7 dias ('+(d.ignoradas||[]).length+')</summary><div class="re-lista" style="margin-top:10px">'+ign+'</div></details>':'');
  }
  function mostrar(txt,ok){var m=document.getElementById('reMsg');if(m)m.innerHTML='<div class="re-msg '+(ok?'ok':'erro')+'">'+esc(txt)+'</div>';}

  async function salvar(){
    var senha=document.getElementById('reSenha').value;
    var p={p_conta:document.getElementById('reConta').value.trim(),
      p_remetentes:document.getElementById('reRem').value.split(/[\n,;]+/).map(function(x){return x.trim();}).filter(Boolean),
      p_ativo:document.getElementById('reAtivo').checked,p_dias:parseInt(document.getElementById('reDias').value,10)||3};
    if(senha.trim())p.p_senha=senha;
    S.ocupado=true;
    try{
      var r=await sb().rpc('radar_email_config_salvar',p);
      if(r.error)throw r.error;
      S.dados=r.data||S.dados;desenhar();
      mostrar(senha.trim()?'Salvo. A senha foi para o cofre do banco. Agora clique em "Testar a ligação".':'Salvo.',true);
    }catch(e){mostrar('Não salvou: '+erroTxt(e),false);}
    finally{S.ocupado=false;document.getElementById('reSenha')&&(document.getElementById('reSenha').value='');}
  }
  async function chamar(acao,botao){
    S.ocupado=true;var t=botao.textContent;botao.disabled=true;botao.textContent=acao==='testar'?'Testando…':'Lendo a caixa…';
    try{
      var r=await sb().functions.invoke('radar-email',{body:{acao:acao}});
      var d=r.data;
      if(r.error&&!d){try{d=await r.error.context.json();}catch(x){d=null;}}
      if(!d)throw r.error||new Error('sem resposta do servidor');
      await carregar();
      mostrar(d.mensagem||(d.ok?'Feito.':'Falhou sem mensagem.'),!!d.ok);
    }catch(e){mostrar('Não consegui falar com o robô: '+erroTxt(e)+' (código FUNCAO)',false);}
    finally{S.ocupado=false;botao.disabled=false;botao.textContent=t;}
  }
  async function resolver(msgid){
    var ok=window.sagaConfirmar?await window.sagaConfirmar('Tirar da lista de erros','Você já conferiu este e-mail no Gmail e lançou à mão o que precisava? Ele sai da lista (nada é apagado; fica no registro).','Já tratei'):window.confirm('Tirar da lista de erros?');
    if(!ok)return;
    S.ocupado=true;
    try{var r=await sb().rpc('radar_email_resolver',{p_msgid:msgid});if(r.error)throw r.error;S.dados=r.data||S.dados;desenhar();mostrar('Tirado da lista de erros.',true);}
    catch(e){mostrar('Não consegui tirar da lista: '+erroTxt(e),false);}
    finally{S.ocupado=false;}
  }

  // botão ao lado de "OABs monitoradas" (a barra é redesenhada pelo saga_intimacoes.js: o vigia põe de novo)
  function porBotao(){
    if(!S.admin)return;
    var o=document.querySelector('[data-acao="oabs"]');
    if(!o||o.parentNode.querySelector('[data-re-abrir]'))return;
    o.insertAdjacentHTML('afterend','<button class="si-btn" type="button" data-re-abrir title="Robô que lê os e-mails de intimação dos tribunais (só o administrador)">Radar do e-mail</button>');
  }
  document.addEventListener('click',function(e){if(e.target.closest('[data-re-abrir]'))abrir();});
  async function iniciar(){
    try{
      var p=window.sagaPerfil?await window.sagaPerfil():null;
      if(p)S.admin=!!p.eh_administrador;
      else{var r=await sb().rpc('eh_admin_sistema');S.admin=r.data===true;}
    }catch(e){S.admin=false;}
    if(!S.admin)return;
    porBotao();
    new MutationObserver(porBotao).observe(document.body,{childList:true,subtree:true});
    var qs=new URLSearchParams(location.search);
    if(qs.get('radar_email')){abrir();qs.delete('radar_email');history.replaceState(history.state,'',location.pathname+(qs.toString()?'?'+qs:''));}
  }
  window.SagaRadarEmail={abrir:abrir};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
