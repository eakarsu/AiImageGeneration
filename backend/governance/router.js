const express=require('express');
const pool=require('../db');
const auth=require('../middleware/auth');
const {createWorkflow}=require('./workflowCore');
const {createGovernedRouter}=require('./routerFactory');
const activeAuth=(req,res,next)=>auth(req,res,async()=>{try{const actorId=String(req.user&&req.user.id||'');const result=await pool.query('SELECT id FROM users WHERE id::text=$1 LIMIT 1',[actorId]);if(!result.rows[0])return res.status(401).json({error:'IDENTITY_NOT_ACTIVE'});req.user={id:String(result.rows[0].id)};next();}catch(_error){return res.status(401).json({error:'IDENTITY_NOT_ACTIVE'});}});
const db={query:async(sql,params)=>(await pool.query(sql,params)).rows,transaction:async(work)=>{const client=await pool.connect();try{await client.query('BEGIN');const result=await work(async(sql,params)=>(await client.query(sql,params)).rows);await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}};
module.exports=createGovernedRouter({express,workflow:createWorkflow(require('./config')),auth:activeAuth,db});
