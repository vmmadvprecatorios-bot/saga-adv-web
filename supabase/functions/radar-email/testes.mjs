// Testes do leitor do radar-email com textos INVENTADOS (nomes e números fictícios; nenhum dado de cliente).
// Rodar: node supabase/functions/radar-email/testes.mjs
import { ler, htmlParaTexto, tribunalDoNumero, movimentoFora } from "./leitores.js";
let falhas = 0;
const ok = (c, msg) => { if (!c) { falhas++; console.log("FALHOU:", msg); } else console.log("ok -", msg); };
const D = "2026-11-22T10:00:00Z";

// 1. PJe Push TRF5 (HTML), com juntada de petição que deve ficar de fora
const pje = `<html><body>Justiça Federal da 5ª Região <br><br>PJe Push - Serviço de Acompanhamento automático de processos <br>
Informamos que o processo a seguir sofreu movimentação: <br>Número do Processo: 0000001-11.2025.4.05.8000 <br>
Polo Ativo: FULANO DE TAL FICTICIO <br>Polo Passivo: FAZENDA NACIONAL <br>Classe Judicial: PROCEDIMENTO DO JUIZADO ESPECIAL CÍVEL <br>
Órgão: 1ª VARA FEDERAL AL <br>Assunto: Contribuições <br><table border="1"><tbody><tr><th>Data - Movimento</th></tr>
<tr><td>10/11/2026 19:01 - Expedida intimação eletrônica - Sentença</td></tr><tr><td>10/11/2026 15:01 - Juntada de Petição de ciência</td></tr></tbody></table>
<br>Caso não tenha mais interesse em receber o push, acessar o link</body></html>`;
let r = ler({ id: "aaa1", remetente: "pje@trf5.jus.br", assunto: "[Push] Movimentação processual do processo 0000001-11.2025.4.05.8000", data: D, html: pje });
ok(r.situacao === "ok" && r.itens.length === 1, "PJe Push: 1 publicação");
ok(r.itens?.[0].numero === "00000011120254058000" && r.itens[0].tribunal === "TRF5", "PJe Push: número e tribunal");
ok(r.itens?.[0].data === "10/11/2026" && /Expedida intima/.test(r.itens[0].resumo) && r.itens[0].tipo === "Intimação", "PJe Push: data, resumo e tipo");
ok(!/Juntada de Peti/.test(r.itens?.[0].texto || ""), "PJe Push: juntada de petição fora do texto");
ok(r.itens?.[0].id_externo === "aaa1#1", "PJe Push: id_externo");

// 2. PJe Push só com juntada -> ignorado
r = ler({ id: "aaa2", remetente: "pje@trf5.jus.br", assunto: "[Push] x", data: D, html: pje.replace(/<tr><td>10\/11\/2026 19:01[^<]*<\/td><\/tr>/, "") });
ok(r.situacao === "ignorado", "PJe Push só com juntada: ignorado");

// 3. PJe Push TRF1 (texto simples, sem traço entre a hora e o movimento)
r = ler({ id: "aaa3", remetente: "naoresponda.pje.push1@trf1.jus.br", assunto: "Movimentação processual do processo 0000002-22.2004.4.01.3400", data: D,
  texto: "TRIBUNAL REGIONAL FEDERAL DA 1ª REGIÃO\nPJe Push - Serviço de Acompanhamento automático de processos\nNúmero do Processo: 0000002-22.2004.4.01.3400\nClasse Judicial: APELAÇÃO CÍVEL\nÓrgão: Gab. 99 - DESEMBARGADOR FICTICIO\n\nData Movimento Documento\n16/11/2026 08:25 Remetidos os Autos (por julgamento definitivo do recurso) para Juízo de origem\n16/11/2026 08:24 Transitado em Julgado em 16/11/2026 Certidão<https://exemplo.invalido/doc>\n\nCaso não tenha mais interesse" });
ok(r.situacao === "ok" && r.itens[0].tribunal === "TRF1" && r.itens[0].data === "16/11/2026", "PJe Push TRF1 texto: lido");

// 4. e-Proc com 2 processos (um deles juntada)
const ep = `<html><body>Os seguintes processos tiveram uma nova movimentação relacionada a um prazo processual<br><hr><table>
<tr><td>Num. Processo:</td><td>5000001-11.2025.4.04.7100</td></tr><tr><td>Movimentação:</td><td>Decorrido prazo - </td></tr><tr><td>Evento Número:</td><td>12</td></tr>
<tr><td>Partes:</td></tr><tr><td>AUTOR</td></tr><tr><td>BELTRANO FICTICIO</td></tr><tr><td><small>Advogado(s)<br>ADVOGADO FICTICIO (AL000001)<br></small></td></tr><tr><td>X</td></tr><tr><td>UNIÃO</td></tr></table>
<table><tr><td>Num. Processo:</td><td>5000002-22.2025.4.04.7100</td></tr><tr><td>Movimentação:</td><td>Juntada de Petição - </td></tr><tr><td>Evento Número:</td><td>3</td></tr></table>
<br>ATENÇÃO:<br><ol><li>Esta comunicação é meramente informativa</li></ol></body></html>`;
r = ler({ id: "bbb1", remetente: "eproc@jfrs.jus.br", assunto: "Movimentações Processuais - EPROC Seção Judiciária do Rio Grande do Sul", data: D, html: ep });
ok(r.situacao === "ok" && r.itens.length === 1, "e-Proc: só o decorrido prazo");
ok(r.itens?.[0].tribunal === "TRF4" && r.itens[0].tipo === "Prazo" && /evento 12/.test(r.itens[0].resumo), "e-Proc: tribunal, tipo e evento");
ok(r.itens?.[0].orgao === "Seção Judiciária do Rio Grande do Sul (e-Proc)", "e-Proc: órgão pela seção");
ok(r.itens?.[0].data === "22/11/2026", "e-Proc: data do e-mail (Maceió)");

// 5. Recorte Digital com 2 publicações
const rec = `Recorte Digital - 2 publicações - ADVOGADO FICTICIO\nRecorte Digital\nSumário · 2 publicações\n\nPUBLICAÇÃO 1 / 2\nProcesso: 0700001-11.2023.8.02.0001\nData da Disponibilização: 19/11/2026\nData da Publicação: 23/11/2026\nFonte: Tribunal de Justiça de Alagoas - DJEN - 1ª Câmara Cível\nPróximos Julgados - Intimação\n\nPROCESSO: 0700001-11.2023.8.02.0001 - APELACAO CIVEL\n\nRelator Des. Fictício - PAUTADO EM SESSAO ORDINARIA A REALIZAR-SE EM 2 DE DEZEMBRO.\nPOLO ATIVO: PESSOA FICTICIA\nAcesso ao documento:\nIdentificador do documento: 1\n\nPUBLICAÇÃO 2 / 2\nProcesso: 0700002-22.2024.8.02.0001\nData da Disponibilização: 19/11/2026\nFonte: Tribunal de Justiça de Alagoas - DJEN - 32ª Vara Cível da Capital\nIntimação\n\nPROCESSO: 0700002-22.2024.8.02.0001 - CUMPRIMENTO DE SENTENCA\nADV: FICTICIO - Intime-se a parte exequente para que, no prazo de 10 dias, tome ciência.\nAcesso ao documento: https://exemplo.invalido/cdje\n\nTotal de Publicações: 2\n`;
r = ler({ id: "ccc1", remetente: "oabal@recortedigital.adv.br", assunto: "Public. 2. DJAL 19/11/26", data: D, texto: rec });
ok(r.situacao === "ok" && r.itens.length === 2, "Recorte: 2 publicações");
ok(r.itens?.[0].tribunal === "TJAL" && r.itens[0].orgao === "1ª Câmara Cível" && /PAUTADO/.test(r.itens[0].resumo), "Recorte: órgão e resumo da 1ª");
ok(r.itens?.[1].id_externo === "ccc1#2" && /^Intime-se/.test(r.itens[1].resumo) && r.itens[1].link === "https://exemplo.invalido/cdje", "Recorte: 2ª com link");
r = ler({ id: "ccc2", remetente: "oabal@recortedigital.adv.br", assunto: "Public. 0. DJAL 17/11/26", data: D, texto: "Recorte Digital - 0 publicações\nTotal de Publicações: 0" });
ok(r.situacao === "ignorado", "Recorte sem publicações: ignorado");

// 6. Filtros: login do CNJ, protocolo do e-SAJ
ok(ler({ id: "d1", remetente: "sso@cnj.jus.br", assunto: "Alerta de novo acesso", data: D, texto: "x" }).situacao === "ignorado", "aviso de login: ignorado");
ok(ler({ id: "d2", remetente: "esaj@tjal.jus.br", assunto: "Protocolo Eletrônico e-Saj - Petição Intermediária Protocolada (0700001-11.2023.8.02.0001)", data: D, texto: "x" }).situacao === "ignorado", "protocolo e-SAJ: ignorado");

// 7. Genérico e não entendido
r = ler({ id: "e1", remetente: "vara99@trf6.jus.br", remetenteNome: "Vara Fictícia", assunto: "Solicitação de informações, Processo nº 1000001-11.2023.4.01.0001", data: D, texto: "Prezado, pedimos informações." });
ok(r.situacao === "ok" && r.itens[0].tribunal === "TRF1", "genérico com número: lido");
ok(ler({ id: "e2", remetente: "x@tjsp.jus.br", assunto: "Comunicado", data: D, texto: "sem número" }).situacao === "nao_entendido", "sem número: não entendido");
ok(ler({ id: "e3", remetente: "eproc@trf6.jus.br", assunto: "Movimentações Processuais - EPROC", data: D, texto: "formato novo sem os campos" }).situacao === "nao_entendido", "e-Proc em formato novo: não entendido");

// 8. utilitários
ok(tribunalDoNumero("07000011120238020001") === "TJAL", "tribunal TJAL");
ok(movimentoFora("Juntada de Certidão") && movimentoFora("Expedição de mandado") && !movimentoFora("Expedida intimação"), "movimentos fora");
ok(htmlParaTexto("a&nbsp;&aacute;&#231;<br>b") === "a áç\nb", "HTML para texto");

console.log(falhas ? `\n${falhas} FALHA(S)` : "\nTudo certo.");
process.exit(falhas ? 1 : 0);
