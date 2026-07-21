const express=require('express');
const cors=require('cors');
const path=require('path');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const governanceRouter=require('./governance/router');
const {validateRuntime}=require('./governance/runtime');
const {createProviderGate}=require('./governance/providerGate');
const authRouter=require('./governance/authRouter');

validateRuntime();
const app=express();
const port=Number(process.env.BACKEND_PORT||3001);
const origins=String(process.env.CORS_ORIGINS||'http://localhost:5173').split(',').map(value=>value.trim()).filter(Boolean);
app.disable('x-powered-by');
app.use((_req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');next();});
app.use(cors({origin:(origin,callback)=>!origin||origins.includes(origin)?callback(null,true):callback(new Error('Origin not allowed by CORS')),credentials:true}));
app.use(express.json({limit:'1mb'}));
app.use(createProviderGate(['/api/ai','/api/gap','/api/generate','/api/providers','/api/payment','/generated']));
app.get('/api/health',(_req,res)=>res.json({status:'ok',workflow:'approved_image_asset_release',timestamp:new Date().toISOString()}));
app.use('/api/auth',authRouter);
app.use('/api/governance',governanceRouter);
app.use((_req,res)=>res.status(404).json({error:'ROUTE_NOT_SUPPORTED'}));
app.use((error,_req,res,_next)=>{console.error('Request failed:',error.message);res.status(500).json({error:'INTERNAL_SERVER_ERROR'});});
app.listen(port,()=>console.log(`Governed image-generation API listening on ${port}`));

module.exports=app;
