/* ORBIA — PLANEJAMENTO FINANCEIRO LOCAL */
(() => {
"use strict";
const RECORDS_KEY="orbia-finance-records", BUDGETS_KEY="orbia-finance-budgets";
const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
function read(key,fallback){try{const raw=localStorage.getItem(key);const v=JSON.parse(raw||"null");return v??fallback}catch(e){try{const raw=localStorage.getItem(key);if(raw!==null)localStorage.setItem("orbia-recovery-"+key,raw)}catch(recoveryError){console.error("Não foi possível preservar dados financeiros inválidos:",recoveryError)}console.error("Dados financeiros inválidos em "+key,e);return fallback}}
let records=read(RECORDS_KEY,[]), budgets=read(BUDGETS_KEY,{});
if(!Array.isArray(records)){try{const raw=localStorage.getItem(RECORDS_KEY);if(raw!==null)localStorage.setItem("orbia-recovery-"+RECORDS_KEY,raw)}catch(e){console.error("Falha ao preservar lançamentos inválidos:",e)}records=[]}
if(!budgets||typeof budgets!=="object"||Array.isArray(budgets)){try{const raw=localStorage.getItem(BUDGETS_KEY);if(raw!==null)localStorage.setItem("orbia-recovery-"+BUDGETS_KEY,raw)}catch(e){console.error("Falha ao preservar orçamentos inválidos:",e)}budgets={}}
const validRecords=records.filter(x=>x&&typeof x==="object"&&x.id!==undefined&&["income","expense"].includes(x.type)&&Number(x.amount)>0&&typeof x.date==="string"&&typeof x.description==="string");
if(validRecords.length!==records.length){try{const raw=localStorage.getItem(RECORDS_KEY);if(raw!==null)localStorage.setItem("orbia-recovery-"+RECORDS_KEY,raw)}catch(e){console.error("Falha ao preservar lançamentos incompletos:",e)}}
records=validRecords;
function save(){localStorage.setItem(RECORDS_KEY,JSON.stringify(records));localStorage.setItem(BUDGETS_KEY,JSON.stringify(budgets));window.dispatchEvent(new Event("orbia:data-changed"))}
function today(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function month(){return today().slice(0,7)}
const section=document.createElement("section");section.id="finance-section";section.style.display="none";
section.innerHTML=`
<div class="finance-intro"><span>PLANEJAMENTO FINANCEIRO</span><h2>Seu dinheiro, em equilíbrio.</h2><p>Acompanhe receitas, despesas e orçamento mensal em um só lugar.</p></div>
<div class="finance-month"><label for="finance-month">Mês de referência</label><input type="month" id="finance-month"></div>
<div class="finance-summary">
<article><span>Saldo do mês</span><strong id="finance-balance">R$ 0,00</strong></article>
<article><span>Receitas</span><strong id="finance-income">R$ 0,00</strong></article>
<article><span>Despesas</span><strong id="finance-expense">R$ 0,00</strong></article></div>
<article class="finance-panel"><div class="finance-panel-head"><div><small>CONTROLE DE GASTOS</small><h3>Orçamento mensal</h3></div><strong id="finance-budget-percent">—</strong></div>
<p id="finance-budget-caption">Defina um limite de despesas para este mês.</p><div class="finance-track"><i id="finance-budget-bar"></i></div>
<form id="finance-budget-form"><label for="finance-budget">Limite de gastos (R$)</label><div class="finance-inline"><input id="finance-budget" type="number" min="0" step=".01" placeholder="Ex.: 2500"><button>Salvar</button></div></form></article>
<article class="finance-panel"><h3>Novo lançamento</h3><form id="finance-form">
<div class="finance-type"><label><input type="radio" name="finance-type" value="expense" checked><span>Despesa</span></label><label><input type="radio" name="finance-type" value="income"><span>Receita</span></label></div>
<label for="finance-description">Descrição</label><input id="finance-description" maxlength="70" required placeholder="Ex.: Mercado, salário...">
<div class="finance-fields"><div><label for="finance-amount">Valor (R$)</label><input id="finance-amount" type="number" min=".01" step=".01" inputmode="decimal" required placeholder="0,00"></div><div><label for="finance-category">Categoria</label><select id="finance-category"><option>Moradia</option><option>Alimentação</option><option>Transporte</option><option>Saúde</option><option>Educação</option><option>Lazer</option><option>Contas</option><option>Salário</option><option>Freelance</option><option>Investimentos</option><option>Outros</option></select></div></div>
<label for="finance-date">Data</label><input id="finance-date" type="date" required><button class="finance-submit">Adicionar lançamento</button><p id="finance-feedback" aria-live="polite"></p></form></article>
<div class="finance-list-head"><h3>Lançamentos</h3><span id="finance-count">0 itens</span></div><div id="finance-list"></div>
<p class="finance-note">Os dados ficam salvos somente neste dispositivo. Inclua-os nos backups para manter uma cópia segura.</p>`;
document.querySelector("main").insertBefore(section,document.getElementById("settings-section"));
const css=document.createElement("style");css.textContent=`
#finance-section{margin:5px 0 32px}.finance-intro{padding:21px;border-radius:19px;background:var(--primary);color:white;margin-bottom:16px}.finance-intro>span{font-size:9px;letter-spacing:1.3px;font-weight:800;opacity:.75}.finance-intro h2{font-size:21px;margin:8px 0}.finance-intro p{font-size:12px;line-height:1.6;opacity:.82}
.finance-month{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;font-size:12px;color:var(--muted)}.finance-month input,#finance-section input,#finance-section select{min-width:0;padding:11px;border:1px solid var(--border);border-radius:10px;background:var(--background);color:var(--text);font:inherit}
.finance-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-bottom:13px}.finance-summary article{min-width:0;padding:12px 8px;border:1px solid var(--border);border-radius:13px;background:var(--surface)}.finance-summary span{display:block;font-size:9px;color:var(--muted);margin-bottom:7px}.finance-summary strong{font-size:clamp(11px,3.4vw,16px);color:var(--primary);overflow-wrap:anywhere}
.finance-panel{padding:16px;margin-bottom:13px;border:1px solid var(--border);border-radius:16px;background:var(--surface);box-shadow:var(--shadow)}.finance-panel h3,.finance-list-head h3{font-size:15px}.finance-panel-head,.finance-list-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.finance-panel-head small{font-size:9px;letter-spacing:1px;color:var(--muted);font-weight:800}.finance-panel-head strong{color:var(--accent)}#finance-budget-caption{font-size:11px;color:var(--muted);margin:11px 0}.finance-track{height:8px;background:var(--background);border-radius:20px;overflow:hidden}.finance-track i{display:block;height:100%;width:0;background:var(--accent);border-radius:20px}.finance-track i.over{background:#D96B6B}
#finance-section form>label,#finance-section .finance-fields label{display:block;font-size:11px;font-weight:700;color:var(--muted);margin:11px 0 6px}.finance-inline,.finance-fields{display:flex;gap:8px}.finance-inline input{flex:1;width:50%}.finance-inline button{padding:0 14px;border:0;border-radius:10px;background:var(--primary);color:white;font-weight:700}.finance-type{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:13px 0}.finance-type input{position:absolute;opacity:0}.finance-type span{display:block;text-align:center;padding:10px;border:1px solid var(--border);border-radius:10px;color:var(--muted);font-size:12px;font-weight:700}.finance-type input:checked+span{border-color:var(--accent);background:rgba(53,184,154,.12);color:var(--accent)}#finance-form>input,#finance-form select{width:100%;min-height:43px}.finance-fields>div{flex:1;min-width:0}.finance-submit{width:100%;min-height:44px;margin-top:14px;border:0;border-radius:11px;background:var(--accent);color:white;font-weight:700}#finance-feedback{min-height:16px;font-size:11px;color:var(--accent);margin-top:8px}
.finance-list-head{margin:21px 0 11px}.finance-list-head span{font-size:11px;color:var(--muted)}#finance-list{display:flex;flex-direction:column;gap:8px}.finance-row{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--border);border-radius:13px;background:var(--surface)}.finance-row-icon{width:35px;height:35px;display:grid;place-items:center;border-radius:11px;background:var(--background);color:var(--accent);font-size:18px}.finance-row-info{flex:1;min-width:0}.finance-row-info b{display:block;font-size:12px;overflow-wrap:anywhere}.finance-row-info small{display:block;color:var(--muted);font-size:10px;margin-top:4px}.finance-row-value{font-size:11px;white-space:nowrap}.finance-row-value.income{color:var(--accent)}.finance-row-value.expense{color:#D96B6B}.finance-delete{border:0;background:transparent;color:var(--muted);font-size:18px;padding:4px}.finance-empty{padding:20px;border:1px dashed var(--border);border-radius:13px;text-align:center;color:var(--muted);font-size:12px;line-height:1.6}.finance-note{font-size:10px;line-height:1.5;color:var(--muted);margin-top:13px}@media(max-width:360px){.finance-summary{gap:4px}.finance-summary article{padding:10px 5px}}`;
document.head.appendChild(css);
const monthInput=document.getElementById("finance-month"),form=document.getElementById("finance-form"),list=document.getElementById("finance-list");
monthInput.value=month();document.getElementById("finance-date").value=today();
function render(){const monthRecords=records.filter(x=>x.date.slice(0,7)===monthInput.value);const income=monthRecords.filter(x=>x.type==="income").reduce((s,x)=>s+Number(x.amount),0);const expense=monthRecords.filter(x=>x.type==="expense").reduce((s,x)=>s+Number(x.amount),0);const budget=Math.max(0,Number(budgets[monthInput.value])||0);const percent=budget?Math.round(expense/budget*100):0;
document.getElementById("finance-balance").textContent=money.format(income-expense);document.getElementById("finance-income").textContent=money.format(income);document.getElementById("finance-expense").textContent=money.format(expense);document.getElementById("finance-budget-percent").textContent=budget?percent+"%":"—";document.getElementById("finance-budget-caption").textContent=budget?money.format(expense)+" de "+money.format(budget)+" • "+money.format(Math.max(0,budget-expense))+" restantes":"Defina um limite de despesas para este mês.";const bar=document.getElementById("finance-budget-bar");bar.style.width=budget?Math.min(100,percent)+"%":"0%";bar.classList.toggle("over",budget&&expense>budget);document.getElementById("finance-budget").value=budget||"";document.getElementById("finance-count").textContent=monthRecords.length+" "+(monthRecords.length===1?"item":"itens");list.replaceChildren();
if(!monthRecords.length){const e=document.createElement("div");e.className="finance-empty";e.textContent="Nenhum lançamento neste mês. Adicione sua primeira receita ou despesa.";list.append(e);return}
monthRecords.sort((a,b)=>b.date.localeCompare(a.date)||Number(b.id)-Number(a.id)).forEach(item=>{const row=document.createElement("article");row.className="finance-row";const ico=document.createElement("span");ico.className="finance-row-icon";ico.textContent=item.type==="income"?"↗":"↘";const info=document.createElement("div");info.className="finance-row-info";const title=document.createElement("b");title.textContent=item.description;const meta=document.createElement("small");meta.textContent=item.category+" • "+item.date.split("-").reverse().join("/");info.append(title,meta);const value=document.createElement("b");value.className="finance-row-value "+item.type;value.textContent=(item.type==="income"?"+ ":"− ")+money.format(Number(item.amount));const del=document.createElement("button");del.className="finance-delete";del.type="button";del.textContent="×";del.setAttribute("aria-label","Excluir lançamento");del.addEventListener("click",()=>{if(confirm("Excluir este lançamento?")){records=records.filter(x=>String(x.id)!==String(item.id));save();render()}});row.append(ico,info,value,del);list.append(row)})}
form.addEventListener("submit",e=>{e.preventDefault();const description=document.getElementById("finance-description").value.trim(),amount=Number(document.getElementById("finance-amount").value),date=document.getElementById("finance-date").value,type=form.querySelector('input[name="finance-type"]:checked').value,category=document.getElementById("finance-category").value;if(!description||!date||!Number.isFinite(amount)||amount<=0){document.getElementById("finance-feedback").textContent="Confira descrição, valor e data.";return}records.push({id:Date.now(),description,amount,date,type,category});save();form.reset();document.getElementById("finance-date").value=today();document.getElementById("finance-feedback").textContent="Lançamento salvo neste dispositivo.";render()});
document.getElementById("finance-budget-form").addEventListener("submit",e=>{e.preventDefault();const amount=Number(document.getElementById("finance-budget").value);if(!Number.isFinite(amount)||amount<0)return;budgets[monthInput.value]=amount;save();render();document.getElementById("finance-feedback").textContent="Orçamento atualizado."});
monthInput.addEventListener("change",render);
const previousShowPage=window.showPage||showPage;
function showFinanceAwarePage(page){
if(page==="finance"){
document.querySelectorAll("main > section").forEach(x=>x.style.display="none");
const goals=document.getElementById("goals-section");if(goals)goals.style.display="none";
section.style.display="";
document.querySelectorAll(".bottom-navigation button").forEach(b=>b.classList.toggle("active",b.id==="nav-finance"));
document.getElementById("add-activity").style.display="none";
document.getElementById("add-habit").style.display="none";
window.scrollTo({top:0,behavior:"smooth"});render();return;
}
section.style.display="none";
previousShowPage(page);
const financeButton=document.getElementById("nav-finance");if(financeButton)financeButton.classList.remove("active");
}
window.showPage=showFinanceAwarePage;
showPage=showFinanceAwarePage;
document.getElementById("nav-finance").addEventListener("click",()=>showFinanceAwarePage("finance"));
window.OrbiaFinance={getBackupData:()=>({records,budgets}),restoreData:data=>{records=Array.isArray(data?.records)?data.records:[];budgets=data?.budgets&&typeof data.budgets==="object"&&!Array.isArray(data.budgets)?data.budgets:{};save();render()}};
save();render();
})();
