(() => {
"use strict";
const css = [
".orbia-control-wrap{position:relative;width:100%;margin:0 0 13px}",
".orbia-control-native{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}",
".orbia-control-trigger{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:48px;padding:12px 14px;border:1px solid var(--border);border-radius:14px;background:var(--surface);color:var(--text);font:600 14px Inter,Arial,sans-serif;text-align:left;cursor:pointer;box-shadow:var(--shadow)}",
".orbia-control-trigger:focus-visible{outline:2px solid var(--accent);outline-offset:2px}",
".orbia-control-value{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.orbia-control-icon{color:var(--accent);font-size:17px;flex:none}",
".orbia-picker-backdrop{position:fixed;inset:0;z-index:3000;display:flex;align-items:flex-end;justify-content:center;padding:14px;background:rgba(10,18,32,.58);opacity:0;transition:opacity .18s ease}",
".orbia-picker-backdrop.is-open{opacity:1}.orbia-picker-panel{width:100%;max-width:440px;max-height:82vh;overflow:auto;padding:20px;border:1px solid var(--border);border-radius:24px;background:var(--surface);color:var(--text);box-shadow:0 18px 55px rgba(0,0,0,.24);transform:translateY(18px);transition:transform .2s ease}",
".orbia-picker-backdrop.is-open .orbia-picker-panel{transform:translateY(0)}.orbia-picker-grabber{width:38px;height:4px;margin:0 auto 17px;border-radius:10px;background:var(--border)}",
".orbia-picker-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.orbia-picker-heading h3{margin:0;color:var(--text);font-size:18px;font-weight:750}",
".orbia-picker-close{width:34px;height:34px;border:0;border-radius:50%;background:var(--background);color:var(--muted);font-size:20px}",
".orbia-calendar-nav{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}.orbia-calendar-nav strong{color:var(--primary);font-size:15px;text-transform:capitalize}",
".orbia-calendar-nav button{width:38px;height:38px;border:1px solid var(--border);border-radius:12px;background:var(--background);color:var(--text);font-size:20px}",
".orbia-calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}.orbia-calendar-weekday{padding:7px 0;color:var(--muted);font-size:11px;font-weight:700;text-align:center}",
".orbia-calendar-day{min-width:0;aspect-ratio:1;border:0;border-radius:12px;background:transparent;color:var(--text);font-size:13px;font-weight:600}.orbia-calendar-day.is-outside{color:var(--muted);opacity:.45}",
".orbia-calendar-day.is-today{box-shadow:inset 0 0 0 1px var(--accent)}.orbia-calendar-day.is-selected{background:var(--accent);color:#fff}.orbia-calendar-day:disabled{opacity:.22}",
".orbia-picker-actions{display:flex;gap:10px;margin-top:18px}.orbia-picker-actions button{flex:1;min-height:46px;border:0;border-radius:13px;background:var(--background);color:var(--text);font-size:14px;font-weight:700}.orbia-picker-actions .is-primary{background:var(--accent);color:#fff}",
".orbia-time-fields{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin:22px 0}.orbia-time-field{display:flex;flex-direction:column;gap:8px;text-align:center}.orbia-time-field label{color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px}",
".orbia-time-field input{width:100%;min-height:76px;border:1px solid var(--border);border-radius:17px;background:var(--background);color:var(--primary);font-size:34px;font-weight:750;text-align:center}.orbia-time-separator{margin-top:20px;color:var(--muted);font-size:28px;font-weight:700}",
".orbia-select-options{display:flex;flex-direction:column;gap:7px}.orbia-select-option{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:48px;padding:12px 14px;border:1px solid var(--border);border-radius:13px;background:var(--background);color:var(--text);font-size:14px;text-align:left}",
".orbia-select-option.is-selected{border-color:var(--accent);background:var(--background);color:var(--primary);font-weight:750}.orbia-select-option:disabled{opacity:.45}",
"@media(min-width:600px){.orbia-picker-backdrop{align-items:center}}@media(prefers-reduced-motion:reduce){.orbia-picker-backdrop,.orbia-picker-panel{transition:none}}"
].join("");
const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);
const months=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const weekdays=["D","S","T","Q","Q","S","S"];
const pad=n=>String(n).padStart(2,"0");
const iso=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parseDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||"")?new Date(+v.slice(0,4),+v.slice(5,7)-1,+v.slice(8,10),12):new Date();
const parseMonth=v=>/^\d{4}-\d{2}$/.test(v||"")?new Date(+v.slice(0,4),+v.slice(5,7)-1,1,12):new Date();
function backdrop(title){
 const el=document.createElement("div");el.className="orbia-picker-backdrop";
 el.innerHTML='<section class="orbia-picker-panel" role="dialog" aria-modal="true"><div class="orbia-picker-grabber"></div><header class="orbia-picker-heading"><h3></h3><button type="button" class="orbia-picker-close" aria-label="Fechar">×</button></header><div class="orbia-picker-body"></div></section>';
 el.querySelector("h3").textContent=title;document.body.appendChild(el);
 const close=()=>{el.classList.remove("is-open");setTimeout(()=>el.remove(),190);};
 el.addEventListener("click",e=>{if(e.target===el)close();});el.querySelector(".orbia-picker-close").addEventListener("click",close);
 requestAnimationFrame(()=>el.classList.add("is-open"));return{body:el.querySelector(".orbia-picker-body"),close};
}
function changed(input){input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));}
function initDateTime(input){
 if(input.dataset.orbiaPickerReady)return;input.dataset.orbiaPickerReady="1";const type=input.type;
 const wrap=document.createElement("div");wrap.className="orbia-control-wrap";input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);input.classList.add("orbia-control-native");
 const button=document.createElement("button");button.type="button";button.className="orbia-control-trigger";if(input.id){button.id=input.id+"-orbia-trigger";const label=Array.from(document.querySelectorAll("label[for]")).find(item=>item.htmlFor===input.id);if(label)label.htmlFor=button.id;}button.innerHTML='<span class="orbia-control-value"></span><span class="orbia-control-icon" aria-hidden="true">⌄</span>';wrap.appendChild(button);
 const value=button.querySelector(".orbia-control-value");
 const update=()=>{if(type==="time")value.textContent=input.value||"Selecionar horário";else if(type==="month")value.textContent=input.value?parseMonth(input.value).toLocaleDateString("pt-BR",{month:"long",year:"numeric"}):"Selecionar mês";else value.textContent=input.value?parseDate(input.value).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).replace(".",""):"Selecionar data";};
 input.addEventListener("change",update);if(input.form)input.form.addEventListener("reset",()=>setTimeout(update,0));update();
 button.addEventListener("click",()=>{update();if(type==="time")timePicker(input,update);else datePicker(input,update,type==="month");});
}
function datePicker(input,update,isMonth){
 let view=isMonth?parseMonth(input.value):parseDate(input.value);view=new Date(view.getFullYear(),view.getMonth(),1,12);
 let selected=input.value||(isMonth?(view.getFullYear()+"-"+pad(view.getMonth()+1)):iso(new Date()));
 const ui=backdrop(isMonth?"Escolher mês":"Escolher data"),body=ui.body;
 function render(){
  body.innerHTML="";const nav=document.createElement("div");nav.className="orbia-calendar-nav";
  const prev=document.createElement("button"),next=document.createElement("button"),label=document.createElement("strong");
  prev.type=next.type="button";prev.textContent="‹";next.textContent="›";label.textContent=months[view.getMonth()]+" de "+view.getFullYear();
  prev.addEventListener("click",()=>{view.setMonth(view.getMonth()-1);render();});next.addEventListener("click",()=>{view.setMonth(view.getMonth()+1);render();});nav.append(prev,label,next);body.append(nav);
  const grid=document.createElement("div");grid.className="orbia-calendar-grid";
  if(isMonth){grid.style.gridTemplateColumns="repeat(3,minmax(0,1fr))";months.forEach((name,i)=>{const b=document.createElement("button");b.type="button";b.className="orbia-calendar-day";b.style.aspectRatio="auto";b.style.minHeight="58px";b.textContent=name.slice(0,3);const v=view.getFullYear()+"-"+pad(i+1);if(v===selected)b.classList.add("is-selected");b.addEventListener("click",()=>{selected=v;render();});grid.append(b);});}
  else{
   weekdays.forEach(d=>{const w=document.createElement("span");w.className="orbia-calendar-weekday";w.textContent=d;grid.append(w);});
   const first=new Date(view.getFullYear(),view.getMonth(),1,12),start=new Date(first);start.setDate(1-first.getDay());
   for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const v=iso(d),b=document.createElement("button");b.type="button";b.className="orbia-calendar-day";b.textContent=d.getDate();if(d.getMonth()!==view.getMonth())b.classList.add("is-outside");if(v===iso(new Date()))b.classList.add("is-today");if(v===selected)b.classList.add("is-selected");if((input.min&&v<input.min)||(input.max&&v>input.max))b.disabled=true;b.addEventListener("click",()=>{selected=v;render();});grid.append(b);}
  }
  body.append(grid);const actions=document.createElement("div");actions.className="orbia-picker-actions";
  const cancel=document.createElement("button"),ok=document.createElement("button");cancel.type=ok.type="button";cancel.textContent="Cancelar";ok.textContent=isMonth?"Confirmar mês":"Confirmar data";ok.className="is-primary";cancel.addEventListener("click",ui.close);
  ok.addEventListener("click",()=>{if(!selected)return;input.value=selected;changed(input);update();ui.close();});actions.append(cancel,ok);body.append(actions);
 }
 render();
}
function timePicker(input,update){
 const parts=(input.value||"09:00").split(":"),ui=backdrop("Escolher horário"),body=ui.body;
 const fields=document.createElement("div");fields.className="orbia-time-fields";
 function field(name,val,max){const box=document.createElement("div");box.className="orbia-time-field";const label=document.createElement("label");label.textContent=name;const input=document.createElement("input");input.type="number";input.inputMode="numeric";input.min="0";input.max=String(max);input.value=val;box.append(label,input);return{box,input};}
 const h=field("Hora",parts[0]||"09",23),m=field("Minutos",parts[1]||"00",59),sep=document.createElement("span");sep.className="orbia-time-separator";sep.textContent=":";fields.append(h.box,sep,m.box);body.append(fields);
 const actions=document.createElement("div");actions.className="orbia-picker-actions";const cancel=document.createElement("button"),ok=document.createElement("button");cancel.type=ok.type="button";cancel.textContent="Cancelar";ok.textContent="Confirmar horário";ok.className="is-primary";cancel.addEventListener("click",ui.close);
 ok.addEventListener("click",()=>{const hour=Number(h.input.value),minute=Number(m.input.value);if(!Number.isInteger(hour)||hour<0||hour>23||!Number.isInteger(minute)||minute<0||minute>59){h.input.setAttribute("aria-invalid",String(hour<0||hour>23));m.input.setAttribute("aria-invalid",String(minute<0||minute>59));return;}input.value=pad(hour)+":"+pad(minute);changed(input);update();ui.close();});actions.append(cancel,ok);body.append(actions);h.input.focus();
}
function initSelect(select){
 if(select.dataset.orbiaPickerReady)return;select.dataset.orbiaPickerReady="1";const wrap=document.createElement("div");wrap.className="orbia-control-wrap";select.parentNode.insertBefore(wrap,select);wrap.appendChild(select);select.classList.add("orbia-control-native");
 const button=document.createElement("button");button.type="button";button.className="orbia-control-trigger";if(select.id){button.id=select.id+"-orbia-trigger";const label=Array.from(document.querySelectorAll("label[for]")).find(item=>item.htmlFor===select.id);if(label)label.htmlFor=button.id;}button.innerHTML='<span class="orbia-control-value"></span><span class="orbia-control-icon" aria-hidden="true">⌄</span>';wrap.appendChild(button);const value=button.querySelector(".orbia-control-value");
 const update=()=>{const option=select.options[select.selectedIndex];value.textContent=option?option.textContent:"Selecionar";button.disabled=select.disabled;};select.addEventListener("change",update);if(select.form)select.form.addEventListener("reset",()=>setTimeout(update,0));update();
 button.addEventListener("click",()=>{update();const ui=backdrop(select.labels&&select.labels[0]?select.labels[0].textContent:"Escolher opção"),list=document.createElement("div");list.className="orbia-select-options";
 Array.from(select.options).forEach((option,index)=>{const b=document.createElement("button");b.type="button";b.className="orbia-select-option"+(option.selected?" is-selected":"");b.disabled=option.disabled;const t=document.createElement("span");t.textContent=option.textContent;b.append(t);if(option.selected){const check=document.createElement("span");check.textContent="✓";check.style.color="var(--accent)";b.append(check);}b.addEventListener("click",()=>{select.selectedIndex=index;changed(select);update();ui.close();});list.append(b);});ui.body.append(list);});
}
function init(root){
 if(root.matches&&root.matches('input[type="date"],input[type="time"],input[type="month"]'))initDateTime(root);
 if(root.matches&&root.matches("select"))initSelect(root);
 root.querySelectorAll('input[type="date"],input[type="time"],input[type="month"]').forEach(initDateTime);root.querySelectorAll("select").forEach(initSelect);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>init(document));else init(document);
new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1)init(node);}))).observe(document.body,{childList:true,subtree:true});
})();