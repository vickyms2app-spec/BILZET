(function(){
'use strict';

const VERSION='10.2.0';
const STORAGE_PREFIX='bilzet_pharmacy_v9_'; // retained for backward-compatible pharmacy data migration
const PHARMACY_SECTIONS=new Set([
  'pharmacyDashboard','pharmacySale','pharmacyMedicines','pharmacyPurchase','pharmacyStock',
  'pharmacyExpiry','pharmacyRx','pharmacyReturns','pharmacyReports','pharmacySettings','pharmacyPlans'
]);
const NORMAL_TO_PHARMACY={
  dashboard:'pharmacyDashboard',billing:'pharmacySale',invoices:'pharmacyReports',inventory:'pharmacyStock',
  customers:'pharmacyDashboard',gst:'pharmacyReports',ca:'pharmacyDashboard',referral:'pharmacyDashboard',
  settings:'pharmacySettings',keys:'pharmacyDashboard'
};
const FORM_OPTIONS=['Tablet','Capsule','Syrup','Injection','Cream','Ointment','Drops','Inhaler','Powder','Device','Other'];
const DRUG_CLASSES=[
  ['OTC','OTC / General'],['Rx','Prescription'],['H','Schedule H'],['H1','Schedule H1'],['X','Schedule X'],['Other','Other / Verify']
];
const state={injected:false,draft:[],lastPatient:{name:'',address:'',phone:'',doctorName:'',doctorAddress:'',rxRef:''}};
const el=id=>document.getElementById(id);
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const num=v=>Number(v||0);
const round2=v=>Math.round((num(v)+Number.EPSILON)*100)/100;
const today=()=>new Date().toISOString().slice(0,10);
const uidp=p=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const moneyP=v=>typeof window.money==='function'?window.money(v):`₹${round2(v).toFixed(2)}`;

function current(){try{return typeof window.currentUser==='function'?window.currentUser():null}catch{return null}}
function isCurrent(){const u=current();return !!u&&u.role==='business'&&u.businessType==='pharmacy'}
function storageKey(){const u=current();return u?STORAGE_PREFIX+u.id:null}
function coreSettings(){try{return typeof window.userSettings==='function'?window.userSettings():{}}catch{return {}}}
function defaultData(){
  const s=coreSettings(),u=current()||{};
  return {
    version:VERSION,
    settings:{
      pharmacyName:s.companyName||u.name||'My Pharmacy',logo:s.logo||'',address:s.address||'',siteNo:'',street:'',city:'',state:s.state||'Tamil Nadu',pincode:'',phone:s.phone||'',email:u.email||'',gstin:s.gstin||'',
      drugLicenseNo:'',drugLicenseNo2:'',pharmacistName:'',pharmacistRegNo:'',invoicePrefix:'MED',footer:'Thank you. Medicines are dispensed subject to applicable prescription and pharmacy rules.',nextInvoice:1,nearExpiryDays:90
    },
    medicines:[],batches:[],sales:[],purchases:[],h1Register:[],returns:[],audit:[]
  };
}
function load(){
  const k=storageKey(); if(!k)return defaultData();
  try{
    const raw=JSON.parse(localStorage.getItem(k)||'null')||defaultData();
    const base=defaultData();
    return {...base,...raw,settings:{...base.settings,...(raw.settings||{})},medicines:raw.medicines||[],batches:raw.batches||[],sales:raw.sales||[],purchases:raw.purchases||[],h1Register:raw.h1Register||[],returns:raw.returns||[],audit:raw.audit||[]};
  }catch{return defaultData()}
}
function saveData(d){const k=storageKey();if(k)localStorage.setItem(k,JSON.stringify(d))}
function audit(d,action,details={}){d.audit.unshift({id:uidp('audit'),action,details,at:new Date().toISOString()});d.audit=d.audit.slice(0,1000)}
function notify(m){if(typeof window.toast==='function')window.toast(m);else alert(m)}
function modalP(html){if(typeof window.modal==='function')window.modal(html);else alert('Modal unavailable')}
function closeP(){if(typeof window.closeModal==='function')window.closeModal()}
function requirePlanP(plan,feature){return typeof window.requirePlan==='function'?window.requirePlan(plan,feature):true}
function quota(){try{return window.billQuotaInfo(current())}catch{return {used:0,included:100,extra:0,remaining:100,unlimited:false,expired:false}}}
function planName(){try{return PLANS[planKey(current())]?.name||'Free'}catch{return 'Free'}}
function planExpiry(){try{return window.planExpiryLabel(current())}catch{return '-'}}

function injectUI(){
  if(state.injected)return;
  state.injected=true;
  const style=document.createElement('style');
  style.textContent=`
  .pharmacy-only{display:none!important}
  #appView.pharmacy-mode{--ph-accent:#0f766e;--ph-soft:#ecfdf5}
  #appView.pharmacy-mode .sidebar{background:#083344}
  #appView.pharmacy-mode .navbtn.pharmacy-only{display:block!important;color:#ccfbf1}
  #appView.pharmacy-mode .navbtn.pharmacy-only.active,#appView.pharmacy-mode .navbtn.pharmacy-only:hover{background:#115e59;color:#fff}
  #appView.pharmacy-mode .sidebar .navbtn:not(.pharmacy-only){display:none!important}
  #appView.pharmacy-mode .top-actions .business-only{display:none!important}
  #appView.pharmacy-mode .top-actions .pharmacy-only{display:inline-flex!important}
  #appView.pharmacy-mode .content>.business-only{display:none!important}
  #appView.pharmacy-mode .pharmacy-section{display:none!important}
  #appView.pharmacy-mode .pharmacy-section.pharmacy-only.active{display:block!important}
  .ph-hero{background:linear-gradient(135deg,#064e3b,#0f766e 58%,#14b8a6);color:#fff;border-radius:20px;padding:22px;box-shadow:var(--shadow)}
  .ph-hero h3{font-size:25px;margin:0}.ph-hero .muted{color:#ccfbf1}.ph-logo-hero{width:72px;height:72px;border-radius:16px;background:#fff;display:grid;place-items:center;overflow:hidden;padding:6px;flex:0 0 auto}.ph-logo-hero img{max-width:100%;max-height:100%;object-fit:contain}.ph-actions{display:flex;gap:6px;flex-wrap:wrap}.ph-logo-preview{width:140px;height:88px;border:1px dashed #99a3b3;border-radius:12px;background:#f8fafc;display:grid;place-items:center;overflow:hidden}.ph-logo-preview img{max-width:100%;max-height:100%;object-fit:contain}
  .ph-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
  .ph-card{background:#fff;border:1px solid var(--line);border-radius:15px;padding:16px;box-shadow:var(--shadow)}
  .ph-stat{background:#fff;border:1px solid #d1fae5;border-radius:14px;padding:15px}.ph-stat .v{font-size:25px;font-weight:950;margin-top:5px;color:#065f46}
  .ph-warn{border-color:#fed7aa;background:#fff7ed}.ph-danger{border-color:#fecaca;background:#fef2f2}.ph-ok{border-color:#bbf7d0;background:#f0fdf4}
  .ph-table{width:100%;border-collapse:collapse;min-width:880px}.ph-table th,.ph-table td{padding:10px 11px;border-bottom:1px solid var(--line);text-align:left;font-size:12px}.ph-table th{background:#f0fdfa;color:#115e59;text-transform:uppercase;font-size:10px;letter-spacing:.04em}
  .ph-pill{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:850;background:#ecfdf5;color:#047857}.ph-pill.warn{background:#ffedd5;color:#9a3412}.ph-pill.danger{background:#fee2e2;color:#991b1b}.ph-pill.gray{background:#f3f4f6;color:#475569}
  .ph-sale-line{display:grid;grid-template-columns:2fr 1fr .8fr .7fr .8fr auto;gap:8px;align-items:center;padding:10px;border:1px solid #d1fae5;border-radius:12px;background:#fbfffd;margin-bottom:8px}
  .ph-total{font-size:30px;font-weight:950;color:#065f46}.ph-section-title{display:flex;align-items:center;gap:10px;margin-bottom:12px}.ph-section-title h3{margin:0}.ph-note{padding:11px 13px;border-radius:11px;background:#f0fdfa;border:1px solid #99f6e4;color:#115e59;font-size:12px}
  .ph-expired{opacity:.6;text-decoration:line-through}.ph-regulated{border-left:4px solid #d97706}.ph-x{border-left:4px solid #dc2626}
  @media(max-width:900px){.ph-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ph-sale-line{grid-template-columns:1fr 1fr}.ph-sale-line>*:first-child{grid-column:1/-1}}
  @media(max-width:620px){.ph-grid{grid-template-columns:1fr}.ph-sale-line{grid-template-columns:1fr}.ph-sale-line>*:first-child{grid-column:auto}}
  `;
  document.head.appendChild(style);

  const footer=document.querySelector('.sidebar-footer');
  if(footer){
    const nav=document.createElement('div');
    nav.id='pharmacyNav';
    nav.innerHTML=`
      <button class="navbtn pharmacy-only" data-section="pharmacyDashboard" data-short="Home"><span>Pharmacy Home</span></button>
      <button class="navbtn pharmacy-only" data-section="pharmacySale" data-short="Sale"><span>New Medicine Bill</span></button>
      <button class="navbtn pharmacy-only" data-section="pharmacyMedicines" data-short="Med"><span>Medicine Master</span></button>
      <button class="navbtn pharmacy-only" data-section="pharmacyPurchase" data-short="In"><span>Purchase Inward</span></button>
      <button class="navbtn pharmacy-only" data-section="pharmacyStock" data-short="Stock"><span>Batch Stock</span></button>
      <button class="navbtn pharmacy-only" data-section="pharmacyExpiry" data-short="Exp"><span>Expiry</span></button>
      <button class="navbtn pharmacy-only" data-section="pharmacyRx" data-short="Rx"><span>Rx / H1 Register</span></button>
      <button class="navbtn pharmacy-only" data-section="pharmacyReturns" data-short="Ret"><span>Returns</span></button>
      <button class="navbtn pharmacy-only" data-section="pharmacyReports" data-short="Rpt"><span>Sales & Reports</span></button>
      <button class="navbtn pharmacy-only" data-section="pharmacyPlans" data-short="Plan"><span>Plan & Usage</span></button>
      <button class="navbtn pharmacy-only" data-section="support" data-short="Help"><span>Support</span></button>
      <button class="navbtn pharmacy-only" data-section="pharmacySettings" data-short="Set"><span>Pharmacy Settings</span></button>`;
    footer.parentNode.insertBefore(nav,footer);
  }
  const content=document.querySelector('.content');
  if(content){
    ['pharmacyDashboard','pharmacySale','pharmacyMedicines','pharmacyPurchase','pharmacyStock','pharmacyExpiry','pharmacyRx','pharmacyReturns','pharmacyReports','pharmacyPlans','pharmacySettings'].forEach(id=>{
      const sec=document.createElement('section');sec.id=id;sec.className='section pharmacy-section pharmacy-only';content.appendChild(sec);
    });
  }
  const actions=document.querySelector('.top-actions');
  if(actions){const b=document.createElement('button');b.className='btn primary small pharmacy-only';b.dataset.go='pharmacySale';b.textContent='+ Medicine Bill';actions.appendChild(b)}
}

function activate(){injectUI();const app=el('appView');if(!app)return;app.classList.add('pharmacy-mode');document.body.dataset.bilzetMode='pharmacy';applyRoleUI()}
function deactivate(){const app=el('appView');if(app)app.classList.remove('pharmacy-mode');delete document.body.dataset.bilzetMode}
function applyRoleUI(){
  injectUI();const app=el('appView');if(!app)return;
  const yes=isCurrent();app.classList.toggle('pharmacy-mode',yes);
  document.querySelectorAll('.pharmacy-only').forEach(x=>{if(!yes)x.classList.remove('active')});
  if(yes){
    const u=current();if(el('sideRole'))el('sideRole').textContent='Pharmacy / Medical Store';
    const q=quota();if(el('planBadge')){el('planBadge').textContent=`${planName().toUpperCase()}${q.expired?' · EXPIRED':''}`;el('planBadge').title=`Pharmacy plan expires: ${planExpiry()}`}
  }
}
function normalizeSection(id){if(!isCurrent())return id;if(id==='plans')return 'pharmacyPlans';return NORMAL_TO_PHARMACY[id]||id}
function renderSection(id){if(!isCurrent()||!PHARMACY_SECTIONS.has(id))return false;injectUI();({
  pharmacyDashboard:renderDashboard,pharmacySale:renderSale,pharmacyMedicines:renderMedicines,pharmacyPurchase:renderPurchase,
  pharmacyStock:renderStock,pharmacyExpiry:renderExpiry,pharmacyRx:renderRx,pharmacyReturns:renderReturns,
  pharmacyReports:renderReports,pharmacyPlans:renderPlans,pharmacySettings:renderSettings
}[id]||(()=>{}))();return true}
function pageP(title,sub){if(typeof window.page==='function')window.page(title,sub);else{if(el('pageTitle'))el('pageTitle').textContent=title;if(el('pageSub'))el('pageSub').textContent=sub}}

function medicineById(d,id){return d.medicines.find(m=>m.id===id)}
function batchById(d,id){return d.batches.find(b=>b.id===id)}
function expiryDate(exp){if(!exp)return null;const [y,m]=String(exp).split('-').map(Number);if(!y||!m)return null;return new Date(Date.UTC(y,m,0,23,59,59))}
function isExpired(b){const x=expiryDate(b.expiry);return !x||x.getTime()<Date.now()}
function daysToExpiry(b){const x=expiryDate(b.expiry);return x?Math.ceil((x.getTime()-Date.now())/86400000):-99999}
function eligibleBatches(d,medicineId){return d.batches.filter(b=>b.medicineId===medicineId&&b.status==='saleable'&&num(b.qtyBase)>0&&!isExpired(b)).sort((a,b)=>String(a.expiry).localeCompare(String(b.expiry))||String(a.inwardDate).localeCompare(String(b.inwardDate)))}
function qtyDisplay(m,b){const units=Math.max(1,num(m.unitsPerPack)||1),packs=Math.floor(num(b.qtyBase)/units),loose=Math.round((num(b.qtyBase)-packs*units)*1000)/1000;return `${packs} ${h(m.packLabel||'pack')}${loose?` + ${loose} unit`:''}`}
function regulatedClass(m){return ['Rx','H','H1','X'].includes(m?.drugClass)}
function classPill(c){const cls=c==='X'?'danger':c==='H1'||c==='H'||c==='Rx'?'warn':'';return `<span class="ph-pill ${cls}">${h(c||'OTC')}</span>`}
function pharmacyAddressLines(ps){
  const line1=[ps.siteNo,ps.street].filter(Boolean).join(', '),line2=[ps.city,ps.state,ps.pincode].filter(Boolean).join(', ');
  return [line1,line2,ps.address].filter(Boolean).map(h).join('<br>');
}
function pharmacyContactLine(ps){return [ps.phone,ps.email].filter(Boolean).map(h).join(' · ')}
function pharmacyLicenceLine(ps){return [ps.drugLicenseNo,ps.drugLicenseNo2].filter(Boolean).map(h).join(' / ')}
function nextInvoiceNo(d){const p=String(d.settings.invoicePrefix||'MED').trim().toUpperCase()||'MED';return `${p}-${String(num(d.settings.nextInvoice)||1).padStart(5,'0')}`}
function lineBaseQty(m,line){const q=Math.max(0,num(line.qty)),upp=Math.max(1,num(m.unitsPerPack)||1),ppb=Math.max(1,num(m.packsPerBox)||1);return line.mode==='box'?q*upp*ppb:line.mode==='pack'?q*upp:q}
function lineAmount(m,b,line){const upp=Math.max(1,num(m.unitsPerPack)||1),perBase=num(b.sellingRatePack)/upp;return round2(perBase*lineBaseQty(m,line))}
function totalDraft(d){return round2(state.draft.reduce((a,l)=>{const m=medicineById(d,l.medicineId),b=batchById(d,l.batchId);return a+(m&&b?lineAmount(m,b,l):0)},0))}
function hasRestrictedDraft(d){return state.draft.some(l=>regulatedClass(medicineById(d,l.medicineId)))}
function hasXDraft(d){return state.draft.some(l=>medicineById(d,l.medicineId)?.drugClass==='X')}

function renderDashboard(){
  const d=load(),q=quota(),sales=d.sales.filter(s=>s.status!=='Cancelled'),todaySales=sales.filter(s=>s.date===today()).reduce((a,s)=>a+num(s.total),0),stock=d.batches.reduce((a,b)=>a+(b.status==='saleable'&&!isExpired(b)?num(b.qtyBase):0),0),near=d.batches.filter(b=>b.status==='saleable'&&num(b.qtyBase)>0&&daysToExpiry(b)>=0&&daysToExpiry(b)<=num(d.settings.nearExpiryDays||90)).length,expired=d.batches.filter(b=>b.status==='saleable'&&num(b.qtyBase)>0&&isExpired(b)).length;
  pageP('Pharmacy Home','Medicine billing, batch stock, expiry and prescription records');
  el('pharmacyDashboard').innerHTML=`
    <div class="ph-hero"><div class="row wrap">${d.settings.logo?`<div class="ph-logo-hero"><img src="${d.settings.logo}" alt="Pharmacy logo"></div>`:''}<div><h3>${h(d.settings.pharmacyName)}</h3><div class="muted mt8">${pharmacyAddressLines(d.settings)}${pharmacyContactLine(d.settings)?`<br>${pharmacyContactLine(d.settings)}`:''}${pharmacyLicenceLine(d.settings)?`<br>Drug Licence: ${pharmacyLicenceLine(d.settings)}`:''}</div></div><div class="right"><span class="badge ok">${h(planName())}</span></div></div></div>
    <div class="ph-grid mt16">
      <div class="ph-stat"><div class="small muted">Today's medicine sales</div><div class="v">${moneyP(todaySales)}</div></div>
      <div class="ph-stat"><div class="small muted">Active medicines</div><div class="v">${d.medicines.filter(m=>m.active!==false).length}</div></div>
      <div class="ph-stat ${near?'ph-warn':''}"><div class="small muted">Near-expiry batches</div><div class="v">${near}</div></div>
      <div class="ph-stat ${expired?'ph-danger':''}"><div class="small muted">Expired batches blocked</div><div class="v">${expired}</div></div>
    </div>
    <div class="grid2 mt16">
      <div class="ph-card"><div class="ph-section-title"><h3>Quick Actions</h3></div><div class="row wrap"><button class="btn primary" data-go="pharmacySale">New Medicine Bill</button><button class="btn" data-go="pharmacyPurchase">Purchase Inward</button><button class="btn" data-go="pharmacyMedicines">Medicine Master</button><button class="btn" data-go="pharmacyExpiry">Expiry Review</button></div></div>
      <div class="ph-card"><h3>Plan & bill quota</h3><div class="small muted mt8">${q.unlimited?'Unlimited pharmacy bills':`${q.used} used · ${q.remaining} remaining`} · Expires ${h(planExpiry())}</div><div class="progress mt12"><div style="width:${q.unlimited?100:Math.min(100,q.included?100*q.used/(q.included+q.extra):0)}%"></div></div><button class="btn ghost mt16" data-go="pharmacyPlans">View Pharmacy Plan</button></div>
    </div>
    <div class="ph-card mt16"><div class="ph-section-title"><h3>Safety queue</h3><span class="small muted">FEFO + expiry block</span></div>${expiryRows(d,8)}</div>`;
}

function renderMedicines(){
  const d=load();pageP('Medicine Master','Brand, salt, strength, tax, schedule class and pack conversion');
  const rows=d.medicines.slice().sort((a,b)=>(a.active===false)-(b.active===false)||a.brand.localeCompare(b.brand)).map(m=>`<tr class="${m.active===false?'ph-expired':''}"><td><b>${h(m.brand)}</b><div class="tiny muted">${h(m.generic||'')}</div>${m.active===false?'<span class="ph-pill gray">Archived</span>':''}</td><td>${h(m.strength||'-')}</td><td>${h(m.form||'-')}</td><td>${classPill(m.drugClass)}</td><td>${h(m.packLabel||'Pack')} × ${num(m.unitsPerPack)||1}${num(m.packsPerBox)>1?` · Box × ${num(m.packsPerBox)}`:''}</td><td>${num(m.gst)}%</td><td>${h(m.manufacturer||'-')}</td><td>${h(m.rack||'-')}</td><td><div class="ph-actions"><button class="btn small" onclick="BILZET_PHARMACY.medicineForm('${m.id}')">Edit</button>${m.active===false?`<button class="btn ok small" onclick="BILZET_PHARMACY.restoreMedicine('${m.id}')">Restore</button>`:`<button class="btn danger small" onclick="BILZET_PHARMACY.deleteMedicine('${m.id}')">Delete</button>`}</div></td></tr>`).join('');
  el('pharmacyMedicines').innerHTML=`<div class="row mb12 wrap"><button class="btn primary" onclick="BILZET_PHARMACY.medicineForm()">+ Add Medicine</button><div class="small muted">GST is product-specific; select the actual applicable rate. Drug schedule classification must be verified by the pharmacy.</div></div><div class="ph-card"><div class="table-wrap"><table class="ph-table"><thead><tr><th>Medicine</th><th>Strength</th><th>Form</th><th>Class</th><th>Pack</th><th>GST</th><th>Manufacturer</th><th>Rack</th><th>Actions</th></tr></thead><tbody>${rows||'<tr><td colspan="9" class="empty">No medicines yet. Add medicine master first.</td></tr>'}</tbody></table></div></div>`;
}
function medicineForm(id=''){
  const d=load(),m=d.medicines.find(x=>x.id===id)||{brand:'',generic:'',strength:'',form:'Tablet',manufacturer:'',hsn:'',gst:5,drugClass:'OTC',packLabel:'Strip',unitsPerPack:10,packsPerBox:10,barcode:'',rack:'',active:true,allowLoose:true};
  modalP(`<div class="row"><h3>${id?'Edit':'Add'} Medicine</h3><button class="btn ghost small right" onclick="closeModal()">Close</button></div><div class="grid2 mt12"><div><label class="label">Brand / Product Name</label><input class="input" id="phBrand" value="${h(m.brand)}"></div><div><label class="label">Generic / Salt</label><input class="input" id="phGeneric" value="${h(m.generic)}"></div><div><label class="label">Strength</label><input class="input" id="phStrength" value="${h(m.strength)}" placeholder="650 mg"></div><div><label class="label">Form</label><select class="select" id="phForm">${FORM_OPTIONS.map(x=>`<option ${x===m.form?'selected':''}>${x}</option>`).join('')}</select></div><div><label class="label">Manufacturer</label><input class="input" id="phManufacturer" value="${h(m.manufacturer)}"></div><div><label class="label">Drug class</label><select class="select" id="phClass">${DRUG_CLASSES.map(([v,n])=>`<option value="${v}" ${v===m.drugClass?'selected':''}>${n}</option>`).join('')}</select></div><div><label class="label">HSN</label><input class="input" id="phHsn" value="${h(m.hsn)}"></div><div><label class="label">GST % (as applicable)</label><select class="select" id="phGst">${[0,5,12,18,28].map(g=>`<option value="${g}" ${num(m.gst)===g?'selected':''}>${g}%</option>`).join('')}</select><div class="tiny muted mt8">Do not infer GST from prescription class; choose the product's current tax rate.</div></div><div><label class="label">Billing pack label</label><input class="input" id="phPackLabel" value="${h(m.packLabel)}" placeholder="Strip / Bottle / Tube"></div><div><label class="label">Base units per pack</label><input class="input" id="phUnitsPerPack" type="number" min="1" step="1" value="${num(m.unitsPerPack)||1}"></div><div><label class="label">Packs per box</label><input class="input" id="phPacksPerBox" type="number" min="1" step="1" value="${num(m.packsPerBox)||1}"></div><div><label class="label">Barcode</label><input class="input" id="phBarcode" value="${h(m.barcode)}"></div><div><label class="label">Rack / Shelf</label><input class="input" id="phRack" value="${h(m.rack)}"></div><div><label class="label">Loose unit sale</label><select class="select" id="phLoose"><option value="yes" ${m.allowLoose!==false?'selected':''}>Allowed</option><option value="no" ${m.allowLoose===false?'selected':''}>Not allowed</option></select></div></div><div class="ph-note mt16">Pack conversion is locked after stock inward to protect batch quantities. Schedule X remains blocked in BILZET Pharmacy Core.</div><div class="row mt16"><button class="btn primary" onclick="BILZET_PHARMACY.saveMedicine('${id}')">Save Medicine</button>${id&&m.active!==false?`<button class="btn danger" onclick="BILZET_PHARMACY.deleteMedicine('${id}')">Delete</button>`:''}<button class="btn ghost" onclick="closeModal()">Cancel</button></div>`);
}
function saveMedicine(id=''){
  const brand=el('phBrand')?.value.trim();if(!brand)return notify('Enter medicine brand / product name');
  const units=Math.max(1,Math.floor(num(el('phUnitsPerPack')?.value)||1)),ppb=Math.max(1,Math.floor(num(el('phPacksPerBox')?.value)||1));
  const d=load(),m=id?d.medicines.find(x=>x.id===id):null,obj=m||{id:uidp('med'),createdAt:new Date().toISOString()};
  if(m&&d.batches.some(b=>b.medicineId===m.id)&&(units!==num(m.unitsPerPack)||ppb!==num(m.packsPerBox)))return notify('Pack conversion cannot be changed after batch stock exists. This protects sold/remaining quantity history.');
  Object.assign(obj,{brand,generic:el('phGeneric').value.trim(),strength:el('phStrength').value.trim(),form:el('phForm').value,manufacturer:el('phManufacturer').value.trim(),drugClass:el('phClass').value,hsn:el('phHsn').value.trim(),gst:num(el('phGst').value),packLabel:el('phPackLabel').value.trim()||'Pack',unitsPerPack:units,packsPerBox:ppb,barcode:el('phBarcode').value.trim(),rack:el('phRack').value.trim(),allowLoose:el('phLoose').value==='yes',active:m?m.active!==false:true,updatedAt:new Date().toISOString()});
  if(!m)d.medicines.push(obj);audit(d,id?'medicine_updated':'medicine_created',{medicineId:obj.id,brand});saveData(d);closeP();renderMedicines();notify('Medicine master saved');
}
function deleteMedicine(id){
  const d=load(),m=medicineById(d,id);if(!m)return; if(!confirm(`Delete ${m.brand}?`))return;
  const referenced=d.batches.some(b=>b.medicineId===id)||d.purchases.some(p=>p.medicineId===id)||d.sales.some(s=>s.lines?.some(l=>l.medicineId===id));
  if(referenced){m.active=false;m.archivedAt=new Date().toISOString();audit(d,'medicine_archived',{medicineId:id,brand:m.brand});saveData(d);closeP();renderMedicines();notify('Medicine has transaction history, so it was safely archived instead of destroying old bills.');return}
  d.medicines=d.medicines.filter(x=>x.id!==id);audit(d,'medicine_deleted',{medicineId:id,brand:m.brand});saveData(d);closeP();renderMedicines();notify('Unused medicine deleted permanently');
}
function restoreMedicine(id){const d=load(),m=medicineById(d,id);if(!m)return;m.active=true;delete m.archivedAt;audit(d,'medicine_restored',{medicineId:id});saveData(d);renderMedicines();notify('Medicine restored')}

function renderPurchase(){
  const d=load();pageP('Purchase Inward','Receive and correct medicine stock with mandatory batch and expiry');
  const opts=d.medicines.filter(m=>m.active!==false).sort((a,b)=>a.brand.localeCompare(b.brand)).map(m=>`<option value="${m.id}">${h(m.brand)} ${h(m.strength||'')}</option>`).join('');
  const recent=d.purchases.slice(0,30).map(p=>{const m=medicineById(d,p.medicineId),b=batchById(d,p.batchId);return `<tr><td>${h(p.inwardDate)}</td><td>${h(m?.brand||'-')}</td><td>${h(b?.batchNo||'-')}</td><td>${h(b?.expiry||'-')}</td><td>${num(p.qtyPacks)} + ${num(p.freePacks)} free</td><td>${h(p.supplier||'-')}</td><td><div class="ph-actions"><button class="btn small" onclick="BILZET_PHARMACY.purchaseForm('${p.id}')">Edit</button><button class="btn ghost small" onclick="BILZET_PHARMACY.batchForm('${p.batchId}')">Batch</button></div></td></tr>`}).join('');
  el('pharmacyPurchase').innerHTML=`${d.medicines.filter(m=>m.active!==false).length?`<div class="grid2"><div class="ph-card"><h3>Receive Stock</h3><label class="label">Medicine</label><select class="select" id="inMed">${opts}</select><div class="grid2 mt12"><div><label class="label">Supplier</label><input class="input" id="inSupplier"></div><div><label class="label">Supplier Invoice No.</label><input class="input" id="inInvoice"></div><div><label class="label">Batch No.</label><input class="input" id="inBatch"></div><div><label class="label">Expiry (month)</label><input class="input" id="inExpiry" type="month"></div><div><label class="label">Manufacturing month</label><input class="input" id="inMfg" type="month"></div><div><label class="label">Quantity in billing packs</label><input class="input" id="inQty" type="number" min="0.01" step="0.01"></div><div><label class="label">Free packs / scheme</label><input class="input" id="inFree" type="number" min="0" step="0.01" value="0"></div><div><label class="label">MRP per pack</label><input class="input" id="inMrp" type="number" min="0" step="0.01"></div><div><label class="label">Purchase rate / pack</label><input class="input" id="inPurchase" type="number" min="0" step="0.01"></div><div><label class="label">Selling rate / pack</label><input class="input" id="inSelling" type="number" min="0" step="0.01"></div></div><button class="btn primary mt16" onclick="BILZET_PHARMACY.receiveStock()">Receive Batch</button></div><div class="ph-card"><h3>Inward rules</h3><div class="ph-note">Batch and expiry are mandatory. Selling rate cannot exceed MRP. If a received entry is wrong, use Edit; BILZET will block quantity corrections that would erase already-sold stock.</div><div class="small muted mt16">Stock is stored internally in base units so strip / bottle / loose sales stay accurate.</div></div></div>`:`<div class="ph-card"><div class="empty">Create an active Medicine Master before purchase inward.<br><button class="btn primary mt12" data-go="pharmacyMedicines">Add Medicine</button></div></div>`}<div class="ph-card mt16"><h3>Purchase / Inward History</h3><div class="table-wrap"><table class="ph-table"><thead><tr><th>Date</th><th>Medicine</th><th>Batch</th><th>Expiry</th><th>Received</th><th>Supplier</th><th>Actions</th></tr></thead><tbody>${recent||'<tr><td colspan="7" class="empty">No purchase inward yet.</td></tr>'}</tbody></table></div></div>`;
}
function receiveStock(){
  const d=load(),m=medicineById(d,el('inMed')?.value),supplier=el('inSupplier')?.value.trim(),batchNo=el('inBatch')?.value.trim(),expiry=el('inExpiry')?.value,qty=Math.max(0,num(el('inQty')?.value)),free=Math.max(0,num(el('inFree')?.value)),mrp=Math.max(0,num(el('inMrp')?.value)),purchase=Math.max(0,num(el('inPurchase')?.value)),selling=Math.max(0,num(el('inSelling')?.value));
  if(!m)return notify('Choose medicine');if(!batchNo)return notify('Batch number is mandatory');if(!expiry)return notify('Expiry is mandatory');if(qty<=0)return notify('Enter inward quantity');if(mrp>0&&selling>mrp)return notify('Selling rate cannot exceed entered MRP');
  if(d.batches.some(b=>b.medicineId===m.id&&String(b.batchNo).toLowerCase()===batchNo.toLowerCase()&&b.expiry===expiry))return notify('This medicine batch and expiry already exist. Use Edit on the existing inward entry instead of creating a duplicate batch.');
  const batch={id:uidp('batch'),medicineId:m.id,batchNo,expiry,mfg:el('inMfg')?.value||'',mrpPack:mrp,purchaseRatePack:purchase,sellingRatePack:selling||mrp,qtyBase:round2((qty+free)*Math.max(1,num(m.unitsPerPack)||1)),supplier,purchaseInvoiceNo:el('inInvoice')?.value.trim()||'',inwardDate:today(),status:'saleable',createdAt:new Date().toISOString()};
  d.batches.push(batch);d.purchases.unshift({id:uidp('pur'),medicineId:m.id,batchId:batch.id,supplier,purchaseInvoiceNo:batch.purchaseInvoiceNo,qtyPacks:qty,freePacks:free,inwardDate:today(),createdAt:new Date().toISOString()});audit(d,'purchase_inward',{medicineId:m.id,batchId:batch.id,batchNo,qtyPacks:qty});saveData(d);renderPurchase();notify(isExpired(batch)?'Batch recorded. It is expired and blocked from sale.':'Batch stock received');
}
function purchaseForm(id){
  const d=load(),p=d.purchases.find(x=>x.id===id),b=p?batchById(d,p.batchId):null,m=p?medicineById(d,p.medicineId):null;if(!p||!b||!m)return notify('Purchase inward record not found');
  modalP(`<div class="row"><h3>Edit Purchase Inward</h3><button class="btn ghost small right" onclick="closeModal()">Close</button></div><div class="ph-note mt12">Medicine and pack conversion stay fixed. Quantity corrections adjust only the remaining stock and cannot go below quantities already sold/returned.</div><div class="grid2 mt16"><div><label class="label">Medicine</label><input class="input" value="${h(m.brand)} ${h(m.strength||'')}" disabled></div><div><label class="label">Inward Date</label><input class="input" id="epDate" type="date" value="${h(p.inwardDate||today())}"></div><div><label class="label">Supplier</label><input class="input" id="epSupplier" value="${h(p.supplier||b.supplier||'')}"></div><div><label class="label">Supplier Invoice No.</label><input class="input" id="epInvoice" value="${h(p.purchaseInvoiceNo||b.purchaseInvoiceNo||'')}"></div><div><label class="label">Batch No.</label><input class="input" id="epBatch" value="${h(b.batchNo)}"></div><div><label class="label">Expiry</label><input class="input" id="epExpiry" type="month" value="${h(b.expiry)}"></div><div><label class="label">Manufacturing month</label><input class="input" id="epMfg" type="month" value="${h(b.mfg||'')}"></div><div><label class="label">Purchased packs</label><input class="input" id="epQty" type="number" min="0.01" step="0.01" value="${num(p.qtyPacks)}"></div><div><label class="label">Free packs</label><input class="input" id="epFree" type="number" min="0" step="0.01" value="${num(p.freePacks)}"></div><div><label class="label">MRP / pack</label><input class="input" id="epMrp" type="number" min="0" step="0.01" value="${num(b.mrpPack)}"></div><div><label class="label">Purchase rate / pack</label><input class="input" id="epPurchase" type="number" min="0" step="0.01" value="${num(b.purchaseRatePack)}"></div><div><label class="label">Selling rate / pack</label><input class="input" id="epSelling" type="number" min="0" step="0.01" value="${num(b.sellingRatePack)}"></div></div><button class="btn primary mt16" onclick="BILZET_PHARMACY.savePurchaseEdit('${id}')">Save Correction</button>`);
}
function savePurchaseEdit(id){
  const d=load(),p=d.purchases.find(x=>x.id===id),b=p?batchById(d,p.batchId):null,m=p?medicineById(d,p.medicineId):null;if(!p||!b||!m)return notify('Purchase inward record not found');
  const batchNo=el('epBatch')?.value.trim(),expiry=el('epExpiry')?.value,qty=Math.max(0,num(el('epQty')?.value)),free=Math.max(0,num(el('epFree')?.value)),mrp=Math.max(0,num(el('epMrp')?.value)),purchase=Math.max(0,num(el('epPurchase')?.value)),selling=Math.max(0,num(el('epSelling')?.value));
  if(!batchNo||!expiry||qty<=0)return notify('Batch, expiry and purchased quantity are required');if(mrp>0&&selling>mrp)return notify('Selling rate cannot exceed MRP');
  const units=Math.max(1,num(m.unitsPerPack)||1),oldReceived=round2((num(p.qtyPacks)+num(p.freePacks))*units),newReceived=round2((qty+free)*units),newAvailable=round2(num(b.qtyBase)+(newReceived-oldReceived));
  if(newAvailable<0)return notify('Cannot reduce received quantity below stock already sold / returned.');
  const duplicate=d.batches.some(x=>x.id!==b.id&&x.medicineId===m.id&&String(x.batchNo).toLowerCase()===batchNo.toLowerCase()&&x.expiry===expiry);if(duplicate)return notify('Another identical medicine batch + expiry already exists.');
  Object.assign(p,{supplier:el('epSupplier')?.value.trim()||'',purchaseInvoiceNo:el('epInvoice')?.value.trim()||'',qtyPacks:qty,freePacks:free,inwardDate:el('epDate')?.value||p.inwardDate,updatedAt:new Date().toISOString()});
  Object.assign(b,{batchNo,expiry,mfg:el('epMfg')?.value||'',mrpPack:mrp,purchaseRatePack:purchase,sellingRatePack:selling||mrp,qtyBase:newAvailable,supplier:p.supplier,purchaseInvoiceNo:p.purchaseInvoiceNo,inwardDate:p.inwardDate,updatedAt:new Date().toISOString()});
  audit(d,'purchase_inward_corrected',{purchaseId:p.id,batchId:b.id});saveData(d);closeP();renderPurchase();notify('Purchase inward corrected safely');
}

function renderStock(){
  const d=load();pageP('Batch Stock','Every medicine batch is tracked separately');
  const rows=d.batches.slice().sort((a,b)=>String(a.expiry).localeCompare(String(b.expiry))).map(b=>{const m=medicineById(d,b.medicineId),days=daysToExpiry(b),expired=isExpired(b);return `<tr class="${expired?'ph-expired':''}"><td><b>${h(m?.brand||'-')}</b><div class="tiny muted">${h(m?.generic||'')}</div></td><td>${h(b.batchNo)}</td><td>${h(b.expiry)}</td><td>${qtyDisplay(m||{unitsPerPack:1,packLabel:'pack'},b)}</td><td>${moneyP(b.mrpPack)}</td><td>${moneyP(b.sellingRatePack)}</td><td>${h(b.supplier||'-')}</td><td>${b.status!=='saleable'?`<span class="ph-pill gray">${h(b.status)}</span>`:expired?'<span class="ph-pill danger">Expired · Blocked</span>':days<=30?'<span class="ph-pill warn">≤30 days</span>':'<span class="ph-pill">Saleable</span>'}</td><td><button class="btn small" onclick="BILZET_PHARMACY.batchForm('${b.id}')">Edit</button></td></tr>`}).join('');
  el('pharmacyStock').innerHTML=`<div class="ph-card"><div class="table-wrap"><table class="ph-table"><thead><tr><th>Medicine</th><th>Batch</th><th>Expiry</th><th>Available</th><th>MRP / pack</th><th>Sale / pack</th><th>Supplier</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows||'<tr><td colspan="9" class="empty">No batches. Use Purchase Inward.</td></tr>'}</tbody></table></div></div>`;
}

function expiryRows(d,limit=999,withActions=false){
  const list=d.batches.filter(b=>num(b.qtyBase)>0).map(b=>({b,m:medicineById(d,b.medicineId),days:daysToExpiry(b)})).filter(x=>x.days<=num(d.settings.nearExpiryDays||90)||x.b.status!=='saleable').sort((a,b)=>a.days-b.days).slice(0,limit);
  if(!list.length)return '<div class="empty">No expired or near-expiry stock.</div>';
  return `<div class="table-wrap"><table class="ph-table"><thead><tr><th>Medicine</th><th>Batch</th><th>Expiry</th><th>Stock</th><th>Status</th>${withActions?'<th>Action</th>':''}</tr></thead><tbody>${list.map(x=>`<tr><td>${h(x.m?.brand||'-')}</td><td>${h(x.b.batchNo)}</td><td>${h(x.b.expiry)}</td><td>${qtyDisplay(x.m||{unitsPerPack:1,packLabel:'pack'},x.b)}</td><td>${x.b.status!=='saleable'?`<span class="ph-pill gray">${h(x.b.status)}</span>`:x.days<0?'<span class="ph-pill danger">Expired · Sale blocked</span>':x.days<=30?`<span class="ph-pill warn">${x.days} days</span>`:`<span class="ph-pill">${x.days} days</span>`}</td>${withActions?`<td><button class="btn small" onclick="BILZET_PHARMACY.batchForm('${x.b.id}')">Edit</button></td>`:''}</tr>`).join('')}</tbody></table></div>`;
}
function renderExpiry(){const d=load();pageP('Expiry Management','Correct expiry details, block batches and review near-expiry stock');el('pharmacyExpiry').innerHTML=`<div class="ph-note mb16">Expired batches are never selectable in billing. Use Edit to correct a wrong expiry/batch detail or manually quarantine/block a batch. Quantity corrections belong in Purchase Inward → Edit.</div><div class="ph-card">${expiryRows(d,999,true)}</div>`}
function batchForm(id){
  const d=load(),b=batchById(d,id),m=b?medicineById(d,b.medicineId):null;if(!b||!m)return notify('Batch not found');
  modalP(`<div class="row"><h3>Edit Batch / Expiry</h3><button class="btn ghost small right" onclick="closeModal()">Close</button></div><div class="grid2 mt16"><div><label class="label">Medicine</label><input class="input" value="${h(m.brand)} ${h(m.strength||'')}" disabled></div><div><label class="label">Current Stock</label><input class="input" value="${h(qtyDisplay(m,b))}" disabled></div><div><label class="label">Batch No.</label><input class="input" id="ebBatch" value="${h(b.batchNo)}"></div><div><label class="label">Expiry</label><input class="input" id="ebExpiry" type="month" value="${h(b.expiry)}"></div><div><label class="label">Manufacturing month</label><input class="input" id="ebMfg" type="month" value="${h(b.mfg||'')}"></div><div><label class="label">MRP / pack</label><input class="input" id="ebMrp" type="number" min="0" step="0.01" value="${num(b.mrpPack)}"></div><div><label class="label">Purchase rate / pack</label><input class="input" id="ebPurchase" type="number" min="0" step="0.01" value="${num(b.purchaseRatePack)}"></div><div><label class="label">Selling rate / pack</label><input class="input" id="ebSelling" type="number" min="0" step="0.01" value="${num(b.sellingRatePack)}"></div><div><label class="label">Batch status</label><select class="select" id="ebStatus"><option value="saleable" ${b.status==='saleable'?'selected':''}>Saleable</option><option value="quarantine" ${b.status==='quarantine'?'selected':''}>Quarantine</option><option value="blocked" ${b.status==='blocked'?'selected':''}>Blocked</option></select></div></div><div class="ph-note mt16">Setting Quarantine/Blocked removes this batch from billing immediately. Expired batches stay blocked automatically even if status is Saleable.</div><button class="btn primary mt16" onclick="BILZET_PHARMACY.saveBatchEdit('${id}')">Save Batch</button>`);
}
function saveBatchEdit(id){
  const d=load(),b=batchById(d,id),m=b?medicineById(d,b.medicineId):null;if(!b||!m)return notify('Batch not found');const batchNo=el('ebBatch')?.value.trim(),expiry=el('ebExpiry')?.value,mrp=Math.max(0,num(el('ebMrp')?.value)),selling=Math.max(0,num(el('ebSelling')?.value));if(!batchNo||!expiry)return notify('Batch and expiry are required');if(mrp>0&&selling>mrp)return notify('Selling rate cannot exceed MRP');
  const duplicate=d.batches.some(x=>x.id!==b.id&&x.medicineId===b.medicineId&&String(x.batchNo).toLowerCase()===batchNo.toLowerCase()&&x.expiry===expiry);if(duplicate)return notify('Another identical medicine batch + expiry already exists.');
  Object.assign(b,{batchNo,expiry,mfg:el('ebMfg')?.value||'',mrpPack:mrp,purchaseRatePack:Math.max(0,num(el('ebPurchase')?.value)),sellingRatePack:selling||mrp,status:el('ebStatus')?.value||'saleable',updatedAt:new Date().toISOString()});
  const p=d.purchases.find(x=>x.batchId===b.id);if(p){p.updatedAt=new Date().toISOString()}audit(d,'batch_updated',{batchId:b.id,batchNo,expiry,status:b.status});saveData(d);closeP();renderExpiry();notify('Batch / expiry updated');
}

function renderSale(){
  const d=load();pageP('New Medicine Bill','FEFO batch selection, pack conversion and prescription checks');
  const rows=state.draft.map((l,i)=>saleLineHTML(d,l,i)).join('');const restricted=hasRestrictedDraft(d);
  el('pharmacySale').innerHTML=`<div class="grid2"><div><div class="ph-card"><div class="row"><div><h3>Medicine Bill ${h(nextInvoiceNo(d))}</h3><div class="small muted">Valid batches are sorted by earliest expiry first (FEFO).</div></div><button class="btn primary right" onclick="BILZET_PHARMACY.addSaleLine()">+ Add Medicine</button></div><div class="mt16">${rows||'<div class="empty">No medicines added.</div>'}</div></div><div class="ph-card mt16 ${restricted?'ph-regulated':''}"><h3>Patient / Prescription</h3><div class="small muted">Required automatically when Rx / H / H1 medicines are in the bill.</div><div class="grid2 mt12"><div><label class="label">Patient Name</label><input class="input" id="rxPatient" value="${h(state.lastPatient.name)}"></div><div><label class="label">Phone</label><input class="input" id="rxPhone" value="${h(state.lastPatient.phone)}"></div><div><label class="label">Patient Address</label><input class="input" id="rxPatientAddress" value="${h(state.lastPatient.address)}"></div><div><label class="label">Prescription Ref.</label><input class="input" id="rxRef" value="${h(state.lastPatient.rxRef)}"></div><div><label class="label">Doctor / Prescriber</label><input class="input" id="rxDoctor" value="${h(state.lastPatient.doctorName)}"></div><div><label class="label">Doctor Address</label><input class="input" id="rxDoctorAddress" value="${h(state.lastPatient.doctorAddress)}"></div></div></div></div><div><div class="ph-card"><div class="small muted">Bill total</div><div class="ph-total mt8">${moneyP(totalDraft(d))}</div><div class="small muted mt8">Plan: ${h(planName())} · Expires ${h(planExpiry())}</div><button class="btn primary w100 mt16" onclick="BILZET_PHARMACY.saveSale()" ${state.draft.length?'':'disabled'}>Save Medicine Bill</button><button class="btn ghost w100 mt8" onclick="BILZET_PHARMACY.clearSale()">Clear Draft</button></div><div class="ph-card mt16"><h3>Safety controls</h3><div class="small muted">✓ Expired batch blocked<br>✓ Negative stock blocked<br>✓ FEFO default batch<br>✓ MRP-bound inward rate<br>✓ H1 auto register<br>✓ Schedule X blocked in V10 core</div></div></div></div>`;
}
function saleLineHTML(d,l,i){const m=medicineById(d,l.medicineId),b=batchById(d,l.batchId);if(!m||!b)return '';return `<div class="ph-sale-line ${regulatedClass(m)?'ph-regulated':''} ${m.drugClass==='X'?'ph-x':''}"><div><b>${h(m.brand)} ${h(m.strength||'')}</b><div class="tiny muted">${h(m.generic||'')} · ${classPill(m.drugClass)}</div></div><div><b>Batch ${h(b.batchNo)}</b><div class="tiny muted">Exp ${h(b.expiry)}</div></div><div>${h(l.mode==='unit'?'Unit':l.mode==='box'?'Box':m.packLabel||'Pack')} × ${num(l.qty)}</div><div>${lineBaseQty(m,l)} base units</div><div><b>${moneyP(lineAmount(m,b,l))}</b></div><button class="btn danger small" onclick="BILZET_PHARMACY.removeSaleLine(${i})">×</button></div>`}
function addSaleLine(){
  const d=load(),meds=d.medicines.filter(m=>m.active!==false&&eligibleBatches(d,m.id).length).sort((a,b)=>a.brand.localeCompare(b.brand));if(!meds.length)return notify('No saleable medicine batches. Add Medicine Master and Purchase Inward first.');
  modalP(`<h3>Add Medicine</h3><label class="label">Medicine</label><select class="select" id="saleMed">${meds.map(m=>`<option value="${m.id}">${h(m.brand)} ${h(m.strength||'')} · ${h(m.generic||'')}</option>`).join('')}</select><div class="grid2 mt12"><div><label class="label">Batch (FEFO first)</label><select class="select" id="saleBatch"></select></div><div><label class="label">Sale unit</label><select class="select" id="saleMode"></select></div><div><label class="label">Quantity</label><input class="input" id="saleQty" type="number" min="0.01" step="0.01" value="1"></div><div><label class="label">Available</label><div class="input" id="saleAvail" style="background:#f8fafc"></div></div></div><div id="saleRegNote" class="ph-note mt16"></div><div class="row mt16"><button class="btn primary" id="saleAddBtn">Add to Bill</button><button class="btn ghost" onclick="closeModal()">Cancel</button></div>`);
  const refresh=()=>{const data=load(),m=medicineById(data,el('saleMed').value),batches=eligibleBatches(data,m.id);el('saleBatch').innerHTML=batches.map((b,idx)=>`<option value="${b.id}">${idx===0?'FEFO · ':''}${h(b.batchNo)} · Exp ${h(b.expiry)} · ${qtyDisplay(m,b)}</option>`).join('');const modes=[`<option value="pack">${h(m.packLabel||'Pack')}</option>`];if(m.allowLoose!==false&&num(m.unitsPerPack)>1)modes.push('<option value="unit">Loose Unit</option>');if(num(m.packsPerBox)>1)modes.push('<option value="box">Box</option>');el('saleMode').innerHTML=modes.join('');el('saleRegNote').innerHTML=m.drugClass==='X'?'<b>Schedule X:</b> dispensing is blocked in V10 Pharmacy Core.':regulatedClass(m)?`<b>${h(m.drugClass)} medicine:</b> patient and prescriber details are required before saving.`:'OTC/general item: prescription fields are optional.';refreshAvail()};
  const refreshAvail=()=>{const data=load(),m=medicineById(data,el('saleMed').value),b=batchById(data,el('saleBatch').value);if(b)el('saleAvail').textContent=qtyDisplay(m,b)};
  el('saleMed').onchange=refresh;el('saleBatch').onchange=refreshAvail;el('saleAddBtn').onclick=commitSaleLine;refresh();
}
function commitSaleLine(){
  const d=load(),m=medicineById(d,el('saleMed')?.value),b=batchById(d,el('saleBatch')?.value),mode=el('saleMode')?.value,qty=Math.max(0,num(el('saleQty')?.value));if(!m||!b||qty<=0)return notify('Choose medicine, batch and quantity');if(m.drugClass==='X')return notify('Schedule X dispensing is disabled in BILZET V10 Pharmacy Core.');const line={medicineId:m.id,batchId:b.id,mode,qty};const need=lineBaseQty(m,line);if(need>num(b.qtyBase)+1e-9)return notify('Insufficient stock in selected batch');state.draft.push(line);closeP();renderSale();
}
function removeSaleLine(i){state.draft.splice(i,1);renderSale()}
function clearSale(){state.draft=[];state.lastPatient={name:'',address:'',phone:'',doctorName:'',doctorAddress:'',rxRef:''};renderSale()}
async function saveSale(){
  const d=load();if(!state.draft.length)return notify('Add medicine first');if(hasXDraft(d))return notify('Schedule X dispensing is disabled in BILZET V10 Pharmacy Core.');
  for(const l of state.draft){const m=medicineById(d,l.medicineId),b=batchById(d,l.batchId);if(!m||!b||b.status!=='saleable'||isExpired(b))return notify('A selected batch is no longer saleable. Review the bill.');if(lineBaseQty(m,l)>num(b.qtyBase)+1e-9)return notify(`Insufficient stock for ${m.brand}`)}
  const patient={name:el('rxPatient')?.value.trim()||'',phone:el('rxPhone')?.value.trim()||'',address:el('rxPatientAddress')?.value.trim()||'',doctorName:el('rxDoctor')?.value.trim()||'',doctorAddress:el('rxDoctorAddress')?.value.trim()||'',rxRef:el('rxRef')?.value.trim()||''};
  if(hasRestrictedDraft(d)&&(!patient.name||!patient.address||!patient.doctorName||!patient.doctorAddress))return notify('Patient name/address and prescriber name/address are required for prescription-class medicines.');
  const lines=state.draft.map(l=>{const m=medicineById(d,l.medicineId),b=batchById(d,l.batchId),amount=lineAmount(m,b,l),gst=Math.max(0,num(m.gst)),taxable=gst?round2(amount/(1+gst/100)):amount,tax=round2(amount-taxable);return {id:uidp('line'),medicineId:m.id,batchId:b.id,brand:m.brand,generic:m.generic,strength:m.strength,form:m.form,manufacturer:m.manufacturer,drugClass:m.drugClass,hsn:m.hsn,gst,batchNo:b.batchNo,expiry:b.expiry,mode:l.mode,qty:num(l.qty),baseQty:lineBaseQty(m,l),ratePack:b.sellingRatePack,mrpPack:b.mrpPack,amount,taxable,tax,packLabel:m.packLabel,unitsPerPack:m.unitsPerPack,packsPerBox:m.packsPerBox}});
  const sale={id:uidp('phinv'),ownerId:current().id,number:nextInvoiceNo(d),date:today(),patient,lines,subtotal:round2(lines.reduce((a,l)=>a+l.taxable,0)),tax:round2(lines.reduce((a,l)=>a+l.tax,0)),total:round2(lines.reduce((a,l)=>a+l.amount,0)),status:'Active',createdAt:new Date().toISOString()};
  const h1Cloud=lines.filter(l=>l.drugClass==='H1').map(l=>({prescriberName:patient.doctorName,prescriberAddress:patient.doctorAddress,patientName:patient.name,patientAddress:patient.address,drugName:`${l.brand} ${l.strength||''}`.trim(),generic:l.generic,manufacturer:l.manufacturer,batchNo:l.batchNo,expiry:l.expiry,quantity:`${l.qty} ${l.mode==='unit'?'unit':l.mode==='box'?'box':l.packLabel}`}));
  sale.cloudPayload={patient,lines:lines.map(l=>({brand:l.brand,generic:l.generic,strength:l.strength,drugClass:l.drugClass,manufacturer:l.manufacturer,batchNo:l.batchNo,expiry:l.expiry,qty:l.qty,mode:l.mode,amount:l.amount,gst:l.gst,taxable:l.taxable,tax:l.tax})),h1_records:h1Cloud};
  if(!window.BILZET_BACKEND?.beforePharmacySale)return notify('Secure pharmacy billing service is not ready. Deploy the V10 backend and run the V10 database schema.');
  const gate=await window.BILZET_BACKEND.beforePharmacySale(sale);
  if(!gate?.ok){if(gate?.reason==='limit')return typeof window.billLimitModal==='function'?window.billLimitModal():notify('Bill quota exhausted');if(gate?.reason==='expired')return notify('Plan expired. Renew before creating a bill.');return notify('Could not register pharmacy bill. Try again.');}
  lines.forEach(l=>{const b=batchById(d,l.batchId);b.qtyBase=round2(num(b.qtyBase)-num(l.baseQty))});
  sale.syncStatus=gate?.queued?'pending':'synced';delete sale.cloudPayload;d.sales.unshift(sale);d.settings.nextInvoice=Math.max(1,num(d.settings.nextInvoice)||1)+1;
  lines.filter(l=>l.drugClass==='H1').forEach(l=>d.h1Register.unshift({id:uidp('h1'),saleId:sale.id,invoiceNo:sale.number,date:sale.date,prescriberName:patient.doctorName,prescriberAddress:patient.doctorAddress,patientName:patient.name,patientAddress:patient.address,drugName:`${l.brand} ${l.strength||''}`.trim(),generic:l.generic,manufacturer:l.manufacturer,batchNo:l.batchNo,expiry:l.expiry,quantity:`${l.qty} ${l.mode==='unit'?'unit':l.mode==='box'?'box':l.packLabel}`,createdAt:new Date().toISOString()}));
  audit(d,'pharmacy_sale',{saleId:sale.id,invoiceNo:sale.number,total:sale.total});saveData(d);
  if(gate.subscription){try{const core=window.db(),u=core.users.find(x=>x.id===current().id);if(u){u.remoteBillsUsed=gate.subscription.bills_used;u.extraBills=gate.subscription.extra_bill_balance;u.plan=gate.subscription.plan_id||u.plan;u.planStartedAt=gate.subscription.starts_at||u.planStartedAt;u.planExpiresAt=gate.subscription.expires_at||u.planExpiresAt;window.save(core);window.setRoleUI()}}catch{}}
  state.lastPatient={...patient};state.draft=[];renderSale();notify(gate?.queued?'Medicine bill saved offline — auto-sync pending':'Medicine bill saved and pharmacy archive committed');printSale(sale.id);
}

function renderRx(){
  const d=load();pageP('Rx / H1 Register','Prescription-linked medicine records');
  const rows=d.h1Register.map(r=>`<tr><td>${h(r.date)}</td><td>${h(r.invoiceNo)}</td><td>${h(r.patientName)}<div class="tiny muted">${h(r.patientAddress)}</div></td><td>${h(r.prescriberName)}<div class="tiny muted">${h(r.prescriberAddress)}</div></td><td>${h(r.drugName)}<div class="tiny muted">Batch ${h(r.batchNo)} · Exp ${h(r.expiry)}</div></td><td>${h(r.quantity)}</td></tr>`).join('');
  el('pharmacyRx').innerHTML=`<div class="ph-note mb16">H1 records are created automatically from H1 medicine sales. Keep these records available for inspection; current Drugs Rules require H1 supply records to be retained for three years.</div><div class="row mb12"><button class="btn" onclick="BILZET_PHARMACY.exportH1()">Export H1 CSV (Pro)</button></div><div class="ph-card"><div class="table-wrap"><table class="ph-table"><thead><tr><th>Date</th><th>Invoice</th><th>Patient</th><th>Prescriber</th><th>Drug / Batch</th><th>Qty</th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="empty">No H1 records yet.</td></tr>'}</tbody></table></div></div>`;
}
function exportH1(){if(!requirePlanP('pro','H1 Register Export'))return;const d=load(),rows=[['Date','Invoice','Patient','Patient Address','Prescriber','Prescriber Address','Drug','Generic','Manufacturer','Batch','Expiry','Quantity'],...d.h1Register.map(r=>[r.date,r.invoiceNo,r.patientName,r.patientAddress,r.prescriberName,r.prescriberAddress,r.drugName,r.generic,r.manufacturer,r.batchNo,r.expiry,r.quantity])];downloadCsv('BILZET-H1-Register.csv',rows)}

function renderReturns(){
  const d=load(),saleOpts=d.sales.filter(s=>s.status!=='Cancelled').map(s=>`<option value="${s.id}">${h(s.number)} · ${h(s.patient?.name||'Walk-in')} · ${moneyP(s.total)}</option>`).join(''),batchOpts=d.batches.filter(b=>b.status==='saleable'&&num(b.qtyBase)>0).map(b=>{const m=medicineById(d,b.medicineId);return `<option value="${b.id}">${h(m?.brand||'-')} · ${h(b.batchNo)} · ${qtyDisplay(m||{unitsPerPack:1,packLabel:'pack'},b)}</option>`}).join('');
  const rows=d.returns.slice(0,30).map(r=>`<tr><td>${h(r.date)}</td><td>${h(r.type)}</td><td>${h(r.reference||'-')}</td><td>${h(r.medicine||'-')}</td><td>${h(r.batchNo||'-')}</td><td>${h(r.qtyText||'-')}</td><td>${h(r.status)}</td></tr>`).join('');
  pageP('Returns','Customer returns quarantine; supplier returns reduce saleable batch stock');
  el('pharmacyReturns').innerHTML=`<div class="grid2"><div class="ph-card"><h3>Customer Return → Quarantine</h3>${saleOpts?`<label class="label">Original invoice</label><select class="select" id="retSale">${saleOpts}</select><label class="label mt12">Reason</label><input class="input" id="retReason" placeholder="Damaged / wrong item / other"><button class="btn warn mt16" onclick="BILZET_PHARMACY.customerReturn()">Record Return</button>`:'<div class="empty">No sales available.</div>'}<div class="small muted mt12">Returned medicine is not automatically added back to saleable stock.</div></div><div class="ph-card"><h3>Return Batch to Supplier</h3>${batchOpts?`<label class="label">Batch</label><select class="select" id="supRetBatch">${batchOpts}</select><label class="label mt12">Quantity in billing packs</label><input class="input" id="supRetQty" type="number" min="0.01" step="0.01" value="1"><label class="label mt12">Debit / return reference</label><input class="input" id="supRetRef"><button class="btn danger mt16" onclick="BILZET_PHARMACY.supplierReturn()">Return to Supplier</button>`:'<div class="empty">No stock available.</div>'}</div></div><div class="ph-card mt16"><h3>Return Log</h3><div class="table-wrap"><table class="ph-table"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Medicine</th><th>Batch</th><th>Qty</th><th>Status</th></tr></thead><tbody>${rows||'<tr><td colspan="7" class="empty">No returns recorded.</td></tr>'}</tbody></table></div></div>`;
}
function customerReturn(){
  const d=load(),s=d.sales.find(x=>x.id===el('retSale')?.value);if(!s)return notify('Choose original invoice');const reason=el('retReason')?.value.trim()||'Customer return';const medicineNames=s.lines.map(l=>l.brand).join(', ');d.returns.unshift({id:uidp('ret'),date:today(),type:'Customer Return',reference:s.number,medicine:medicineNames,batchNo:s.lines.map(l=>l.batchNo).join(', '),qtyText:'Invoice-linked',status:'Quarantine',reason,createdAt:new Date().toISOString()});audit(d,'customer_return_quarantine',{saleId:s.id,reason});saveData(d);renderReturns();notify('Customer return recorded in quarantine; saleable stock unchanged')
}
function supplierReturn(){
  const d=load(),b=batchById(d,el('supRetBatch')?.value),m=b?medicineById(d,b.medicineId):null,qtyPacks=Math.max(0,num(el('supRetQty')?.value));if(!b||!m||qtyPacks<=0)return notify('Choose batch and quantity');const base=round2(qtyPacks*Math.max(1,num(m.unitsPerPack)||1));if(base>num(b.qtyBase)+1e-9)return notify('Return quantity exceeds available batch stock');b.qtyBase=round2(num(b.qtyBase)-base);d.returns.unshift({id:uidp('ret'),date:today(),type:'Supplier Return',reference:el('supRetRef')?.value.trim()||b.purchaseInvoiceNo||'',medicine:m.brand,batchNo:b.batchNo,qtyText:`${qtyPacks} ${m.packLabel}`,status:'Returned to Supplier',createdAt:new Date().toISOString()});audit(d,'supplier_return',{batchId:b.id,qtyPacks});saveData(d);renderReturns();notify('Supplier return recorded and saleable stock reduced')
}

function renderReports(){
  const d=load();pageP('Pharmacy Sales & Reports','Medicine sales, batch trace and audit trail');const total=d.sales.filter(s=>s.status!=='Cancelled').reduce((a,s)=>a+num(s.total),0),rows=d.sales.map(s=>`<tr><td>${h(s.date)}</td><td><b>${h(s.number)}</b></td><td>${h(s.patient?.name||'Walk-in')}</td><td>${s.lines.length}</td><td>${moneyP(s.total)}</td><td><button class="btn small" onclick="BILZET_PHARMACY.printSale('${s.id}')">Print</button></td></tr>`).join('');
  el('pharmacyReports').innerHTML=`<div class="ph-grid mb16"><div class="ph-stat"><div class="small muted">Total pharmacy sales</div><div class="v">${moneyP(total)}</div></div><div class="ph-stat"><div class="small muted">Medicine bills</div><div class="v">${d.sales.length}</div></div><div class="ph-stat"><div class="small muted">H1 register entries</div><div class="v">${d.h1Register.length}</div></div><div class="ph-stat"><div class="small muted">Audit events</div><div class="v">${d.audit.length}</div></div></div><div class="row mb12"><button class="btn" onclick="BILZET_PHARMACY.exportSales()">Export Sales CSV (Pro)</button></div><div class="ph-card"><div class="table-wrap"><table class="ph-table"><thead><tr><th>Date</th><th>Invoice</th><th>Patient</th><th>Lines</th><th>Total</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="empty">No medicine bills yet.</td></tr>'}</tbody></table></div></div>`;
}
function exportSales(){if(!requirePlanP('pro','Pharmacy Sales Export'))return;const d=load(),rows=[['Date','Invoice','Patient','Phone','Medicine','Generic','Batch','Expiry','Qty','Unit','HSN','GST %','Taxable','Tax','Amount'],...d.sales.flatMap(s=>s.lines.map(l=>[s.date,s.number,s.patient?.name||'',s.patient?.phone||'',l.brand,l.generic,l.batchNo,l.expiry,l.qty,l.mode,l.hsn,l.gst,l.taxable,l.tax,l.amount]))];downloadCsv('BILZET-Pharmacy-Sales.csv',rows)}
function downloadCsv(name,rows){const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n'),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

function renderPlans(){
  const q=quota(),pk=typeof window.planKey==='function'?window.planKey(current()):'free';pageP('Pharmacy Plan & Usage','BILZET subscription adapted for medicine billing');
  const cards=[
    ['Free','100 pharmacy bills / year','Medicine master, batch + expiry, FEFO billing, pack/loose conversion, expired batch block, H1 records'],
    ['Pro','Unlimited pharmacy bills / year','Everything in Free + H1 CSV export, sales export, advanced reports and BILZET Pro invoice entitlements'],
    ['Premium','Unlimited pharmacy bills / year','Everything in Pro + premium BILZET account entitlements; pharmacy safety controls remain enabled for every plan']
  ];
  el('pharmacyPlans').innerHTML=`<div class="ph-card mb16"><div class="row wrap"><div><h3>Current: ${h(planName())}</h3><div class="small muted">${q.unlimited?'Unlimited bills':`${q.used} used · ${q.remaining} remaining`} · Expires ${h(planExpiry())}</div></div><span class="badge right ${q.expired?'danger':'ok'}">${q.expired?'Expired':'Active'}</span></div></div><div class="grid3">${cards.map((c,i)=>`<div class="ph-card ${pk===['free','pro','premium'][i]?'ph-ok':''}"><h3>${c[0]}</h3><b>${c[1]}</b><div class="small muted mt12">${c[2]}</div>${pk===['free','pro','premium'][i]?'<span class="ph-pill mt16">Current Plan</span>':''}</div>`).join('')}</div><div class="ph-card mt16"><div class="small muted">Plan changes, extra 500-bill packs and renewals remain admin-controlled. Use Support to request a change.</div><button class="btn primary mt12" data-go="support">Open Support</button></div>`;
}

function renderSettings(){
  const d=load(),s=d.settings;pageP('Pharmacy Settings','Logo, address, drug licences, pharmacist and medicine invoice identity');
  el('pharmacySettings').innerHTML=`<div class="grid2"><div class="ph-card"><h3>Pharmacy Identity</h3><div class="row wrap mb16"><div class="ph-logo-preview">${s.logo?`<img src="${s.logo}" alt="Pharmacy logo">`:'<span class="tiny muted">No logo</span>'}</div><div><label class="label">Pharmacy Logo</label><input class="input" type="file" accept="image/*" onchange="BILZET_PHARMACY.uploadLogo(this)">${s.logo?'<button class="btn danger small mt8" onclick="BILZET_PHARMACY.removeLogo()">Remove Logo</button>':''}<div class="tiny muted mt8">PNG/JPG/WebP up to 1 MB. Saved on this device and printed on medicine bills.</div></div></div><div class="grid2"><div><label class="label">Pharmacy Name</label><input class="input" id="psName" value="${h(s.pharmacyName)}"></div><div><label class="label">Phone</label><input class="input" id="psPhone" value="${h(s.phone)}"></div><div><label class="label">Email</label><input class="input" id="psEmail" type="email" value="${h(s.email||'')}"></div><div><label class="label">GSTIN</label><input class="input" id="psGstin" value="${h(s.gstin)}"></div><div><label class="label">Door / Site No.</label><input class="input" id="psSite" value="${h(s.siteNo||'')}"></div><div><label class="label">Street / Area</label><input class="input" id="psStreet" value="${h(s.street||'')}"></div><div><label class="label">City / Town</label><input class="input" id="psCity" value="${h(s.city||'')}"></div><div><label class="label">State</label><input class="input" id="psState" value="${h(s.state)}"></div><div><label class="label">PIN Code</label><input class="input" id="psPincode" inputmode="numeric" maxlength="6" value="${h(s.pincode||'')}"></div><div><label class="label">Drug Licence No. 1</label><input class="input" id="psLicense" value="${h(s.drugLicenseNo)}"></div><div><label class="label">Drug Licence No. 2 (optional)</label><input class="input" id="psLicense2" value="${h(s.drugLicenseNo2||'')}"></div><div><label class="label">Invoice Prefix</label><input class="input" id="psPrefix" value="${h(s.invoicePrefix)}"></div></div><label class="label mt12">Full Address / Landmark (optional)</label><textarea class="textarea" id="psAddress">${h(s.address)}</textarea><label class="label mt12">Invoice Footer / Terms</label><textarea class="textarea" id="psFooter">${h(s.footer||'')}</textarea></div><div class="ph-card"><h3>Responsible Pharmacist</h3><label class="label">Pharmacist Name</label><input class="input" id="psPharmacist" value="${h(s.pharmacistName)}"><label class="label mt12">Registration No.</label><input class="input" id="psPhReg" value="${h(s.pharmacistRegNo)}"><label class="label mt12">Near-expiry alert days</label><input class="input" id="psNear" type="number" min="1" max="365" value="${num(s.nearExpiryDays||90)}"><div class="ph-note mt16">Use the actual pharmacy licence and responsible pharmacist details. BILZET provides record controls; the pharmacy remains responsible for regulatory verification.</div></div></div><button class="btn primary mt16" onclick="BILZET_PHARMACY.saveSettings()">Save Pharmacy Settings</button>`;
}
function readSettingsForm(s){if(!el('psName'))return s;Object.assign(s,{pharmacyName:el('psName').value.trim()||s.pharmacyName,phone:el('psPhone').value.trim(),email:el('psEmail').value.trim().toLowerCase(),gstin:el('psGstin').value.trim().toUpperCase(),siteNo:el('psSite').value.trim(),street:el('psStreet').value.trim(),city:el('psCity').value.trim(),state:el('psState').value.trim()||s.state,pincode:el('psPincode').value.trim(),drugLicenseNo:el('psLicense').value.trim(),drugLicenseNo2:el('psLicense2').value.trim(),invoicePrefix:(el('psPrefix').value.trim()||'MED').toUpperCase().replace(/[^A-Z0-9_-]/g,''),address:el('psAddress').value.trim(),footer:el('psFooter').value.trim(),pharmacistName:el('psPharmacist').value.trim(),pharmacistRegNo:el('psPhReg').value.trim(),nearExpiryDays:Math.max(1,Math.min(365,num(el('psNear').value)||90))});return s}
function saveSettings(){const d=load();readSettingsForm(d.settings);audit(d,'pharmacy_settings_updated');saveData(d);renderSettings();notify('Pharmacy settings saved')}
function uploadLogo(input){const f=input?.files?.[0];if(!f)return;if(f.size>1024*1024)return notify('Use a pharmacy logo under 1 MB');if(!/^image\//.test(f.type))return notify('Choose an image file');const r=new FileReader();r.onload=()=>{const d=load();readSettingsForm(d.settings);d.settings.logo=String(r.result||'');audit(d,'pharmacy_logo_updated');saveData(d);renderSettings();notify('Pharmacy logo saved')};r.readAsDataURL(f)}
function removeLogo(){if(!confirm('Remove pharmacy logo?'))return;const d=load();readSettingsForm(d.settings);d.settings.logo='';audit(d,'pharmacy_logo_removed');saveData(d);renderSettings();notify('Pharmacy logo removed')}

function printSale(id){
  const d=load(),s=d.sales.find(x=>x.id===id);if(!s)return notify('Medicine bill not found');const ps=d.settings,w=window.open('','_blank');if(!w)return notify('Allow pop-ups to print');const rows=s.lines.map((l,i)=>`<tr><td>${i+1}</td><td><b>${h(l.brand)} ${h(l.strength||'')}</b><br><small>${h(l.generic||'')} ${l.drugClass&&l.drugClass!=='OTC'?`· ${h(l.drugClass)}`:''}</small></td><td>${h(l.batchNo)}</td><td>${h(l.expiry)}</td><td>${h(l.qty)} ${h(l.mode==='unit'?'unit':l.mode==='box'?'box':l.packLabel)}</td><td>${h(l.hsn||'-')}</td><td>${h(l.gst)}%</td><td>${moneyP(l.mrpPack)}</td><td>${moneyP(l.amount)}</td></tr>`).join('');
  const logo=ps.logo?`<img src="${ps.logo}" style="max-width:90px;max-height:65px;object-fit:contain;margin-right:14px">`:'';
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${h(s.number)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial,sans-serif;margin:24px;color:#172033}.head{display:flex;justify-content:space-between;gap:14px;border-bottom:3px solid #0f766e;padding-bottom:14px}.brandrow{display:flex;align-items:flex-start}.brand{font-size:26px;font-weight:900;color:#0f766e}.muted{color:#64748b;font-size:12px;line-height:1.5}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:11px;text-align:left}th{background:#ecfdf5}.total{text-align:right;font-size:20px;font-weight:900;margin-top:15px}.foot{text-align:center;margin-top:24px;font-size:10px;color:#64748b}@media(max-width:620px){body{margin:10px}.head{flex-direction:column}table{min-width:760px}.tablewrap{overflow:auto}}@media print{body{margin:8mm}.tablewrap{overflow:visible}}</style></head><body><div class="head"><div class="brandrow">${logo}<div><div class="brand">${h(ps.pharmacyName)}</div><div class="muted">${pharmacyAddressLines(ps)}${pharmacyContactLine(ps)?`<br>${pharmacyContactLine(ps)}`:''}${ps.gstin?`<br>GSTIN: ${h(ps.gstin)}`:''}${pharmacyLicenceLine(ps)?`<br>Drug Licence: ${pharmacyLicenceLine(ps)}`:''}</div></div></div><div style="text-align:right"><b>MEDICINE BILL</b><br>${h(s.number)}<br>${h(s.date)}</div></div>${s.patient?.name?`<p><b>Patient:</b> ${h(s.patient.name)} ${s.patient.phone?`· ${h(s.patient.phone)}`:''}<br><span class="muted">${h(s.patient.address||'')}${s.patient.doctorName?`<br>Prescriber: ${h(s.patient.doctorName)} · ${h(s.patient.doctorAddress||'')}`:''}</span></p>`:''}<div class="tablewrap"><table><thead><tr><th>#</th><th>Medicine</th><th>Batch</th><th>Expiry</th><th>Qty</th><th>HSN</th><th>GST</th><th>MRP/Pack</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table></div><div class="total"><span class="muted">Taxable: ${moneyP(s.subtotal||0)} · GST: ${moneyP(s.tax||0)}</span><br>Total: ${moneyP(s.total)}</div>${ps.pharmacistName?`<p class="muted"><b>Pharmacist:</b> ${h(ps.pharmacistName)} ${ps.pharmacistRegNo?`(${h(ps.pharmacistRegNo)})`:''}</p>`:''}${ps.footer?`<p class="muted">${h(ps.footer)}</p>`:''}<div class="foot">Generated by BILZET · Bill. Brand. Send.</div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);w.document.close();
}

window.BILZET_PHARMACY={VERSION,isCurrent,activate,deactivate,applyRoleUI,normalizeSection,renderSection,medicineForm,saveMedicine,deleteMedicine,restoreMedicine,receiveStock,purchaseForm,savePurchaseEdit,batchForm,saveBatchEdit,addSaleLine,removeSaleLine,clearSale,saveSale,exportH1,customerReturn,supplierReturn,exportSales,saveSettings,uploadLogo,removeLogo,printSale};
injectUI();
})();
