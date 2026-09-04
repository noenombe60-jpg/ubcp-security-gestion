import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, limit, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null, role = "gestionnaire";
let ops = [], agents = [], markets = [], payments = [];
let unsub = [];

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("fr-FR").format(Number(n)||0) + " FC";
const esc = s => String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

function msg(id,text,ok=false){ $(id).textContent=text; $(id).className=ok?"ok":"err"; }

$("loginBtn").onclick = async () => {
  try {
    msg("loginMsg","");
    await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);
  } catch(e){ msg("loginMsg","Connexion refusée : "+(e.code||e.message)); }
};
$("logoutBtn").onclick = () => signOut(auth);

document.querySelectorAll("nav button[data-page]").forEach(b=>b.onclick=()=>show(b.dataset.page));
function show(id){
  document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));
  $(id).classList.remove("hidden");
  renderAll();
}

onAuthStateChanged(auth, async user => {
  unsub.forEach(u=>u()); unsub=[];
  if(!user){
    currentUser=null; $("app").classList.add("hidden"); $("login").classList.remove("hidden"); return;
  }
  currentUser=user;
  $("login").classList.add("hidden"); $("app").classList.remove("hidden");
  const snap=await getDoc(doc(db,"Users",user.uid));
  role=snap.exists()?String(snap.data().role||"gestionnaire").toLowerCase():"gestionnaire";
  $("adminBtn").style.display=role==="admin"?"inline-block":"none";
  $("roleTag").textContent=`${user.email} — ${role}`;
  if(role!=="admin") $("admin").innerHTML='<div class="card"><h2>Accès refusé</h2></div>';
  subscribeData(); show("dash");
});

function subscribeData(){
  unsub.push(onSnapshot(query(collection(db,"cash_operations"),orderBy("createdAt","desc"),limit(500)),s=>{ops=s.docs.map(d=>({id:d.id,...d.data()}));renderAll()}));
  unsub.push(onSnapshot(query(collection(db,"agents"),orderBy("createdAt","desc"),limit(500)),s=>{agents=s.docs.map(d=>({id:d.id,...d.data()}));renderAll()}));
  unsub.push(onSnapshot(query(collection(db,"markets"),orderBy("createdAt","desc"),limit(500)),s=>{markets=s.docs.map(d=>({id:d.id,...d.data()}));renderAll()}));
  unsub.push(onSnapshot(query(collection(db,"payments"),orderBy("createdAt","desc"),limit(500)),s=>{payments=s.docs.map(d=>({id:d.id,...d.data()}));renderAll()}));
}

$("cashSave").onclick=async()=>{
  const amount=Number($("cashAmount").value);
  if(!amount||amount<=0)return msg("cashMsg","Montant invalide.");
  await addDoc(collection(db,"cash_operations"),{type:$("cashType").value,amount,reason:$("cashReason").value.trim(),ref:$("cashRef").value.trim(),note:$("cashNote").value.trim(),userId:currentUser.uid,userEmail:currentUser.email,createdAt:serverTimestamp()});
  ["cashAmount","cashReason","cashRef","cashNote"].forEach(x=>$(x).value="");msg("cashMsg","Opération enregistrée.",true);
};

$("agentSave").onclick=async()=>{
  if(role!=="admin")return msg("agentMsg","Réservé à l'administrateur.");
  if(!$("agentNom").value.trim())return msg("agentMsg","Le nom est obligatoire.");
  await addDoc(collection(db,"agents"),{matricule:$("agentMatricule").value.trim(),nom:$("agentNom").value.trim(),postnom:$("agentPostnom").value.trim(),prenom:$("agentPrenom").value.trim(),phone:$("agentPhone").value.trim(),function:$("agentFunction").value.trim(),salary:Number($("agentSalary").value)||0,status:$("agentStatus").value,createdAt:serverTimestamp(),createdBy:currentUser.uid});
  ["agentMatricule","agentNom","agentPostnom","agentPrenom","agentPhone","agentFunction","agentSalary"].forEach(x=>$(x).value="");msg("agentMsg","Agent ajouté.",true);
};

$("marketSave").onclick=async()=>{
  if(role!=="admin")return msg("marketMsg","Réservé à l'administrateur.");
  if(!$("marketName").value.trim())return msg("marketMsg","Le nom du marché est obligatoire.");
  await addDoc(collection(db,"markets"),{name:$("marketName").value.trim(),client:$("marketClient").value.trim(),site:$("marketSite").value.trim(),amount:Number($("marketAmount").value)||0,start:$("marketStart").value,end:$("marketEnd").value,status:$("marketStatus").value,createdAt:serverTimestamp(),createdBy:currentUser.uid});
  ["marketName","marketClient","marketSite","marketAmount","marketStart","marketEnd"].forEach(x=>$(x).value="");msg("marketMsg","Marché ajouté.",true);
};

$("paySave").onclick=async()=>{
  if(role!=="admin")return msg("payMsg","Réservé à l'administrateur.");
  const agentId=$("payAgent").value, amount=Number($("payAmount").value);
  if(!agentId||!amount||amount<=0)return msg("payMsg","Choisis un agent et un montant valide.");
  const a=agents.find(x=>x.id===agentId);
  await addDoc(collection(db,"payments"),{agentId,agentName:`${a.nom||""} ${a.postnom||""} ${a.prenom||""}`.trim(),amount,type:$("payType").value,ref:$("payRef").value.trim(),note:$("payNote").value.trim(),createdAt:serverTimestamp(),createdBy:currentUser.uid});
  ["payAmount","payRef","payNote"].forEach(x=>$(x).value="");msg("payMsg","Paiement enregistré.",true);
};

async function remove(col,id){
  if(role!=="admin")return;
  if(confirm("Confirmer la suppression ?"))await deleteDoc(doc(db,col,id));
}

function renderAll(){
  const ins=ops.filter(x=>x.type==="entrée").reduce((a,x)=>a+Number(x.amount||0),0);
  const outs=ops.filter(x=>x.type==="sortie").reduce((a,x)=>a+Number(x.amount||0),0);
  $("inTotal").textContent=money(ins);$("outTotal").textContent=money(outs);$("balance").textContent=money(ins-outs);
  $("agentCount").textContent=agents.filter(x=>x.status==="Actif").length;
  $("marketCount").textContent=markets.filter(x=>x.status==="Actif").length;
  const rows=ops.slice(0,20).map(x=>`<tr><td>${x.createdAt?.toDate?x.createdAt.toDate().toLocaleString("fr-FR"):"—"}</td><td>${esc(x.type)}</td><td>${money(x.amount)}</td><td>${esc(x.reason)}</td><td>${esc(x.userEmail)}</td></tr>`).join("");
  $("recent").innerHTML=`<table><tr><th>Date</th><th>Type</th><th>Montant</th><th>Motif</th><th>Utilisateur</th></tr>${rows}</table>`;
  $("cashTable").innerHTML=$("recent").innerHTML;
  $("agentsTable").innerHTML=`<table><tr><th>Matricule</th><th>Nom</th><th>Téléphone</th><th>Fonction</th><th>Salaire</th><th>Statut</th><th></th></tr>${agents.map(x=>`<tr><td>${esc(x.matricule)}</td><td>${esc(`${x.nom||""} ${x.postnom||""} ${x.prenom||""}`)}</td><td>${esc(x.phone)}</td><td>${esc(x.function)}</td><td>${money(x.salary)}</td><td>${esc(x.status)}</td><td><button class="danger" onclick="removeAgent('${x.id}')">Supprimer</button></td></tr>`).join("")}</table>`;
  $("marketsTable").innerHTML=`<table><tr><th>Marché</th><th>Client</th><th>Site</th><th>Montant</th><th>Début</th><th>Fin</th><th>État</th><th></th></tr>${markets.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.client)}</td><td>${esc(x.site)}</td><td>${money(x.amount)}</td><td>${esc(x.start)}</td><td>${esc(x.end)}</td><td>${esc(x.status)}</td><td><button class="danger" onclick="removeMarket('${x.id}')">Supprimer</button></td></tr>`).join("")}</table>`;
  $("payAgent").innerHTML='<option value="">Choisir un agent</option>'+agents.filter(x=>x.status==="Actif").map(x=>`<option value="${x.id}">${esc(`${x.nom||""} ${x.postnom||""} ${x.prenom||""}`)}</option>`).join("");
  $("paymentsTable").innerHTML=`<table><tr><th>Date</th><th>Agent</th><th>Type</th><th>Montant</th><th>Référence</th></tr>${payments.map(x=>`<tr><td>${x.createdAt?.toDate?x.createdAt.toDate().toLocaleString("fr-FR"):"—"}</td><td>${esc(x.agentName)}</td><td>${esc(x.type)}</td><td>${money(x.amount)}</td><td>${esc(x.ref)}</td></tr>`).join("")}</table>`;
  $("reportContent").innerHTML=`<div class="grid"><div class="kpi">Caisse nette<b>${money(ins-outs)}</b></div><div class="kpi">Masse des paiements<b>${money(payments.filter(x=>x.type!=="Retenue").reduce((a,x)=>a+Number(x.amount||0),0))}</b></div><div class="kpi">Agents actifs<b>${agents.filter(x=>x.status==="Actif").length}</b></div><div class="kpi">Marchés actifs<b>${markets.filter(x=>x.status==="Actif").length}</b></div></div>`;
  $("adminInfo").innerHTML=`<p><b>Compte connecté :</b> ${esc(currentUser?.email||"")}</p><p><b>Rôle :</b> ${esc(role)}</p>`;
}
window.removeAgent=id=>remove("agents",id); window.removeMarket=id=>remove("markets",id);
