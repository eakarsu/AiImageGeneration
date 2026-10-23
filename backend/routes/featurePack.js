'use strict';
// Feature pack: authenticated tasks + search/filter + CSV/JSON export + offline domain AI.
// Never calls a provider: AI endpoints always return the labelled deterministic fallback.
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
const express=require('express');

function toSections(r){const F=[['title','Title'],['description','Description'],['status','Status'],['priority','Priority'],['completed','Completed'],['estimateMinutes','Estimate (minutes)'],['notes','Notes'],['dueDate','Due date']];return F.map(([k,l])=>{const v=r[k]===undefined?null:r[k];return{key:k,label:l,value:v,displayText:v===null||v===''?"(empty)":v===false?"No":v===true?"Yes":String(v)};});}
function createStore(){const byUser=new Map();let seq=0;return{
 create(uid,data){if(!data||!String(data.title||'').trim()){const e=new Error('title_required');e.status=400;throw e;}const t={id:String(++seq),userId:String(uid),title:String(data.title).trim(),description:data.description||'',status:data.status||'todo',priority:data.priority||'medium',completed:data.completed===true,estimateMinutes:Number.isFinite(+data.estimateMinutes)?+data.estimateMinutes:0,notes:data.notes||'',dueDate:data.dueDate||'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};if(!byUser.has(String(uid)))byUser.set(String(uid),[]);byUser.get(String(uid)).push(t);return t;},
 list(uid,q={}){let rows=[...(byUser.get(String(uid))||[])];const s=String(q.search||'').toLowerCase();if(s)rows=rows.filter(t=>(t.title+' '+t.description+' '+t.notes).toLowerCase().includes(s));if(q.status)rows=rows.filter(t=>t.status===q.status);if(q.priority)rows=rows.filter(t=>t.priority===q.priority);return rows;},
 update(uid,id,data){const rows=byUser.get(String(uid))||[];const t=rows.find(x=>x.id===String(id));if(!t)return null;for(const k of ['title','description','status','priority','notes','dueDate'])if(data[k]!==undefined)t[k]=data[k];if(data.completed!==undefined)t.completed=data.completed===true;if(data.estimateMinutes!==undefined)t.estimateMinutes=+data.estimateMinutes||0;t.updatedAt=new Date().toISOString();return t;},
 get(uid,id){return (byUser.get(String(uid))||[]).find(x=>x.id===String(id))||null;}};}
function csvEscape(v){const s=v===null||v===undefined?'':String(v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function toCsv(rows){const cols=['id','title','description','status','priority','completed','estimateMinutes','notes','dueDate','createdAt'];return [cols.join(','),...rows.map(r=>cols.map(c=>csvEscape(r[c])).join(','))].join('\n')+'\n';}
const FALLBACK={aiGenerated:false,source:'deterministic-fallback',label:'Deterministic fallback (no AI provider called)'};

function domainAi(tasks,input={}){const text=String(input.text||input.prompt||tasks.map(t=>t.title+' '+t.description).join(' '));const words=text.split(/\s+/).filter(Boolean);const has=(arr)=>arr.some(w=>text.toLowerCase().includes(w));return{...FALLBACK};}
function promptEnhancer(tasks,input={}){const text=String(input.text||input.prompt||'');const checks={hasSubject:words(text).length>0,hasStyle:hasAny(text,['style','painting','photo','anime','watercolor']),hasLighting:hasAny(text,['light','sunset','neon','soft']),hasComposition:hasAny(text,['close-up','wide','portrait','landscape'])};const missing=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);return{...FALLBACK,feature:'prompt-enhancer',wordCount:words(text).length,checks,missing,enhancedPrompt:text?text+', detailed composition, clear lighting':'',sections:[{key:'wordCount',label:'Word count',value:words(text).length,displayText:String(words(text).length)},{key:'missing',label:'Missing elements',value:missing,displayText:missing.join(', ')||'(empty)'}]};}
function words(t){return String(t||'').split(/\s+/).filter(Boolean);}
function hasAny(t,arr){const s=String(t||'').toLowerCase();return arr.some(w=>s.includes(w));}
function styleRecommender(tasks){const counts={};for(const t of tasks)counts[t.priority]=(counts[t.priority]||0)+1;const open=tasks.filter(t=>!t.completed).length;return{...FALLBACK,feature:'style-recommender',totalTasks:tasks.length,openTasks:open,byPriority:counts,recommendation:open>0?'Reuse the style of your highest-priority open task for consistency.':'Create a task to receive a style recommendation.',sections:[{key:'openTasks',label:'Open tasks',value:open,displayText:String(open)}]};}
function gallerySummary(tasks){const done=tasks.filter(t=>t.completed).length;return{...FALLBACK,feature:'gallery-summary',total:tasks.length,completed:done,completionRate:tasks.length?Math.round(done/tasks.length*100):0,sections:[{key:'completionRate',label:'Completion rate (%)',value:tasks.length?Math.round(done/tasks.length*100):0,displayText:String(tasks.length?Math.round(done/tasks.length*100):0)}]};}

function createRouter({authenticate,store=createStore()}={}){const router=express.Router();const uid=r=>String(r.user?.id??r.userId??r.user?.userId??'');const guard=(req,res,next)=>{if(!uid(req))return res.status(401).json({error:'authentication required'});next();};const middle=authenticate?[authenticate,guard]:[guard];
router.get('/export',...middle,(req,res)=>{const rows=store.list(uid(req),req.query);if(String(req.query.format||'json').toLowerCase()==='csv'){res.setHeader('Content-Type','text/csv');res.setHeader('Content-Disposition','attachment; filename="tasks.csv"');return res.send(toCsv(rows));}return res.json({items:rows,total:rows.length,exportedAt:new Date().toISOString()});});
router.get('/',...middle,(req,res)=>{const rows=store.list(uid(req),req.query);res.json({items:rows,tasks:rows,total:rows.length});});
router.post('/',...middle,(req,res)=>{try{res.status(201).json(store.create(uid(req),req.body||{}));}catch(e){res.status(e.status||400).json({error:e.message});}});
router.get('/:id/view',...middle,(req,res)=>{const t=store.get(uid(req),req.params.id);if(!t)return res.status(404).json({error:'not found'});res.json({id:t.id,title:t.title,sections:toSections(t)});});
router.put('/:id',...middle,(req,res)=>{const t=store.update(uid(req),req.params.id,req.body||{});return t?res.json(t):res.status(404).json({error:'not found'});});
router.patch('/:id',...middle,(req,res)=>{const t=store.update(uid(req),req.params.id,req.body||{});return t?res.json(t):res.status(404).json({error:'not found'});});
router.post('/ai/prompt-enhancer',...middle,(req,res)=>res.json(promptEnhancer(store.list(uid(req)),req.body||{})));
router.post('/ai/style-recommender',...middle,(req,res)=>res.json(styleRecommender(store.list(uid(req)))));
router.post('/ai/gallery-summary',...middle,(req,res)=>res.json(gallerySummary(store.list(uid(req)))));
return router;}
module.exports={createRouter,createStore,toCsv,toSections,FALLBACK};
