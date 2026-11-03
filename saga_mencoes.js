/* Menções em comentários: seleção local e catálogo autorizado por registro. */
(function(global){
  'use strict';
  var campos=new WeakMap(),catalogos=new WeakMap(),nomes=new Set(),sequencia=0;
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function normalizar(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');}
  function palavra(c){return !!c&&/[\p{L}\p{M}\p{N}_@]/u.test(c);}
  function estilos(){
    if(document.getElementById('sagaMencoesCss'))return;
    var css=document.createElement('style');css.id='sagaMencoesCss';css.textContent=`
      .sm-campo{width:100%;min-width:0;flex:1}.sm-campo>textarea{width:100%;box-sizing:border-box}
      .sm-menu{margin:5px 0;padding:5px;border:1px solid var(--border-soft);border-radius:10px;background:var(--panel-solid,var(--panel));max-height:240px;overflow-y:auto;overscroll-behavior:contain;animation:smAbrir .2s cubic-bezier(.2,1.4,.4,1)}
      .sm-menu[hidden]{display:none}.sm-opcao{display:block;width:100%;min-height:36px;height:auto;padding:9px 11px;border:0;border-radius:7px;background:transparent;color:var(--text);font:inherit;font-size:12px;text-align:left;white-space:normal;overflow-wrap:anywhere;cursor:pointer}
      .sm-opcao[aria-selected=true],.sm-opcao:hover{background:color-mix(in srgb,var(--gold) 14%,transparent)}.sm-opcao:active{transform:scale(.98)}.sm-aviso{padding:9px;font-size:12px;color:var(--muted)}
      .mencao{display:inline;padding:1px 5px;border-radius:5px;background:color-mix(in srgb,var(--info) 15%,transparent);color:var(--info);font-weight:600;overflow-wrap:anywhere}
      @keyframes smAbrir{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}@media(max-width:600px){.sm-opcao{min-height:44px;padding:12px}.sm-menu{max-height:220px}}@media(prefers-reduced-motion:reduce){.sm-menu{animation:none}}
    `;document.head.appendChild(css);
  }
  function fechar(s){s.menu.hidden=true;s.aberto=false;s.campo.setAttribute('aria-expanded','false');s.campo.removeAttribute('aria-activedescendant');}
  function mostrarOpcao(s){requestAnimationFrame(function(){if(s.aberto&&!s.menu.hidden){var opcao=s.menu.children[s.indice]||s.menu.firstChild;if(opcao)opcao.scrollIntoView({block:'nearest'});}});}
  function consulta(s){
    var t=s.campo,pos=t.selectionStart;if(t.selectionEnd!==pos)return null;
    var antes=t.value.slice(0,pos),inicio=antes.lastIndexOf('@');
    if(inicio<0||palavra(antes[inicio-1]))return null;
    var busca=antes.slice(inicio+1);if(/[\n\r@]/.test(busca)||busca.length>100)return null;
    if(s.marcas.some(function(m){return inicio>=m.inicio&&inicio<m.fim;}))return null;
    return {inicio:inicio,fim:pos,busca:normalizar(busca)};
  }
  function validar(s){
    s.marcas=s.marcas.filter(function(m){return s.campo.value.slice(m.inicio,m.fim)===m.texto&&!palavra(s.campo.value[m.inicio-1])&&!palavra(s.campo.value[m.fim]);});
  }
  function sincronizar(s,evento){
    var antigo=s.anterior,novo=s.campo.value;if(antigo===novo){validar(s);return;}
    if(evento&&/^history/.test(evento.inputType||'')){s.marcas=[];s.anterior=novo;return;}
    var a=s.edicao,inicio,fim,inseridos,delta=novo.length-antigo.length;
    if(a&&a.texto===antigo){
      inicio=a.inicio;fim=a.fim;
      if(inicio===fim&&delta<0){if(/Backward$/.test(a.tipo))inicio+=delta;else if(/Forward$/.test(a.tipo))fim-=delta;}
      inseridos=novo.length-(antigo.length-(fim-inicio));
      if(inseridos<0||novo!==antigo.slice(0,inicio)+novo.slice(inicio,inicio+inseridos)+antigo.slice(fim))inicio=undefined;
    }
    if(inicio===undefined){
      inicio=0;while(inicio<antigo.length&&inicio<novo.length&&antigo[inicio]===novo[inicio])inicio++;
      var cauda=0;while(cauda<antigo.length-inicio&&cauda<novo.length-inicio&&antigo[antigo.length-1-cauda]===novo[novo.length-1-cauda])cauda++;
      fim=antigo.length-cauda;inseridos=novo.length-inicio-cauda;
      // Sem a posição original da edição, nomes repetidos não identificam uma pessoa com segurança.
      if(!evento)s.marcas=[];
    }
    s.marcas=s.marcas.filter(function(m){
      if(fim<=m.inicio){m.inicio+=delta;m.fim+=delta;return true;}
      if(inicio>=m.fim)return true;
      return false;
    });
    s.anterior=novo;s.edicao=null;validar(s);
  }
  function render(s){
    var q=consulta(s);if(!q||document.activeElement!==s.campo){fechar(s);return;}
    s.query=q;s.menu.replaceChildren();s.aberto=true;s.menu.hidden=false;s.campo.setAttribute('aria-expanded','true');
    s.opcoes=(s.colegas||[]).filter(function(c){return normalizar(c.nome_completo).indexOf(q.busca)!==-1;});
    s.indice=Math.min(Math.max(s.indice,0),Math.max(0,s.opcoes.length-1));
    if(!s.pronto||!s.opcoes.length){var aviso=document.createElement('div');aviso.className='sm-aviso';aviso.textContent=!s.pronto?'Carregando colegas...':s.erro?'Não foi possível carregar os colegas. Você pode salvar o comentário sem marcações.':'Nenhum colega encontrado.';s.menu.appendChild(aviso);s.campo.removeAttribute('aria-activedescendant');mostrarOpcao(s);return;}
    s.opcoes.forEach(function(c,index){
      var b=document.createElement('button');b.type='button';b.className='sm-opcao';b.id=s.menu.id+'-'+index;b.setAttribute('role','option');b.setAttribute('aria-selected',String(index===s.indice));b.textContent=c.nome_completo;
      b.onmousedown=function(e){e.preventDefault();};b.onclick=function(){escolher(s,index);};s.menu.appendChild(b);
    });
    s.campo.setAttribute('aria-activedescendant',s.menu.id+'-'+s.indice);
    mostrarOpcao(s);
  }
  function escolher(s,index){
    var q=consulta(s),c=s.opcoes[index];if(!q||!c)return;
    var texto='@'+c.nome_completo;
    s.campo.setRangeText(texto+' ',q.inicio,q.fim,'end');
    s.edicao={inicio:q.inicio,fim:q.fim,texto:s.anterior,tipo:'insertText'};sincronizar(s,{inputType:'insertText'});
    s.marcas.push({id:c.id,inicio:q.inicio,fim:q.inicio+texto.length,texto:texto});s.anterior=s.campo.value;
    fechar(s);s.campo.focus({preventScroll:true});
    s.campo.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function carregar(sb,tabela,id){
    var cache=catalogos.get(sb);if(!cache){cache=new Map();catalogos.set(sb,cache);}
    var chave=JSON.stringify([tabela,id]);
    if(!cache.has(chave))cache.set(chave,Promise.resolve().then(function(){return sb.rpc('colegas_para_marcar',{p_tabela:tabela,p_registro_id:id});}).then(function(r){if(r.error)throw r.error;return {colegas:(r.data||[]).filter(function(c){return c.id&&typeof c.nome_completo==='string'&&c.nome_completo.trim();})};}).catch(function(){return {colegas:[],erro:true};}));
    return cache.get(chave);
  }
  function anexar(campo,o){
    if(!campo||!o||!o.sb||!o.registroId)return;estilos();
    var s=campos.get(campo);
    if(!s){
      var wrap=document.createElement('div');wrap.className='sm-campo';campo.before(wrap);wrap.appendChild(campo);
      var menu=document.createElement('div');menu.className='sm-menu';menu.id='smLista'+(++sequencia);menu.setAttribute('role','listbox');menu.setAttribute('aria-label','Colegas para marcar');menu.hidden=true;wrap.appendChild(menu);
      s={campo:campo,menu:menu,marcas:[],anterior:campo.value,indice:0};campos.set(campo,s);
      campo.setAttribute('aria-controls',menu.id);campo.setAttribute('aria-autocomplete','list');campo.setAttribute('aria-haspopup','listbox');campo.setAttribute('aria-expanded','false');
      campo.addEventListener('beforeinput',function(e){s.edicao={inicio:campo.selectionStart,fim:campo.selectionEnd,texto:campo.value,tipo:e.inputType};});
      campo.addEventListener('input',function(e){sincronizar(s,e);s.indice=0;if(!e.isComposing)render(s);});
      campo.addEventListener('compositionend',function(){render(s);});
      campo.addEventListener('click',function(){render(s);});
      campo.addEventListener('keydown',function(e){
        if(e.isComposing||!s.aberto)return;
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fechar(s);}
        else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();s.indice=(s.indice+(e.key==='ArrowDown'?1:-1)+s.opcoes.length)%Math.max(1,s.opcoes.length);render(s);var ativo=document.getElementById(menu.id+'-'+s.indice);if(ativo)ativo.scrollIntoView({block:'nearest'});}
        else if((e.key==='Enter'||e.key==='Tab')&&s.pronto&&s.opcoes.length){e.preventDefault();e.stopPropagation();escolher(s,s.indice);}
        else if(e.key==='Tab')fechar(s);
      });
      document.addEventListener('pointerdown',function(e){if(!wrap.contains(e.target))fechar(s);});
      wrap.addEventListener('focusout',function(){setTimeout(function(){if(!wrap.contains(document.activeElement))fechar(s);},0);});
    }
    if(s.config&&s.config.sb===o.sb&&s.config.tabela===o.tabela&&s.config.registroId===o.registroId)return;
    limpar(campo);s.config=o;s.colegas=[];s.pronto=false;s.erro=false;
    campo.placeholder='Escreva um comentário... use @ para marcar um colega';
    carregar(o.sb,o.tabela,o.registroId).then(function(r){if(s.config!==o)return;s.colegas=r.colegas;s.erro=r.erro;s.pronto=true;r.colegas.forEach(function(c){nomes.add(c.nome_completo);});if(s.aberto)render(s);});
  }
  function marcados(campo){var s=campos.get(campo);if(!s)return [];sincronizar(s);return Array.from(new Set(s.marcas.map(function(m){return m.id;})));}
  function limpar(campo){var s=campos.get(campo);if(!s)return;s.marcas=[];s.anterior=campo.value;s.edicao=null;fechar(s);}
  function destacar(texto){
    estilos();texto=String(texto||'');var re=/@[\p{L}][\p{L}\p{M}'-]*(?:[ \t]+(?:d[aeo]s?[ \t]+)?\p{Lu}[\p{L}\p{M}'-]*)*/gu,saida='',fim=0,m;
    while((m=re.exec(texto))){if(palavra(texto[m.index-1]))continue;var token=m[0];
      var conhecidos=Array.from(nomes).sort(function(a,b){return b.length-a.length;});
      var nome=conhecidos.find(function(n){return texto.slice(m.index,m.index+n.length+1)==='@'+n&&!palavra(texto[m.index+n.length+1]);});if(nome)token='@'+nome;
      saida+=esc(texto.slice(fim,m.index))+'<span class="mencao">'+esc(token)+'</span>';fim=m.index+token.length;re.lastIndex=fim;
    }
    return saida+esc(texto.slice(fim));
  }
  global.SagaMencoes={anexar:anexar,marcados:marcados,limpar:limpar,destacar:destacar};
})(window);
