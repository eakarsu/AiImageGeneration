'use strict';
const express=require('express');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const pool=require('../db');
const auth=require('../middleware/auth');
const router=express.Router();

router.post('/login',async(req,res,next)=>{try{
  const email=String(req.body?.email||'').trim().toLowerCase();const password=String(req.body?.password||'');
  if(!email||!password)return res.status(400).json({error:'EMAIL_AND_PASSWORD_REQUIRED'});
  const result=await pool.query('SELECT id,email,password FROM users WHERE lower(email)=$1 LIMIT 1',[email]);const user=result.rows[0];
  if(!user||!await bcrypt.compare(password,user.password))return res.status(401).json({error:'INVALID_CREDENTIALS'});
  const token=jwt.sign({id:user.id,email:user.email},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'1h'});
  return res.json({token,user:{id:user.id,email:user.email,role:'creative_producer'}});
}catch(error){return next(error);}});

router.post('/demo-login',async(_req,res,next)=>{try{
  if(process.env.ENABLE_DEMO_CREDENTIAL_AUTOFILL!=='true')return res.status(404).json({error:'DEMO_LOGIN_DISABLED'});
  const email=String(process.env.DEMO_EMAIL||'demo@example.com').trim().toLowerCase();
  const result=await pool.query('SELECT id,email FROM users WHERE lower(email)=$1 LIMIT 1',[email]);const user=result.rows[0];
  if(!user)return res.status(404).json({error:'DEMO_ACCOUNT_NOT_FOUND'});
  const token=jwt.sign({id:user.id,email:user.email},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'1h'});
  return res.json({token,user:{id:user.id,email:user.email,role:'creative_producer'}});
}catch(error){return next(error);}});

router.get('/me',auth,async(req,res,next)=>{try{
  const result=await pool.query(`SELECT u.id,u.email,m.tenant_id,m.role FROM users u
    LEFT JOIN governed_tenant_memberships m ON m.actor_id=u.id::text AND m.active=TRUE
    WHERE u.id=$1 ORDER BY m.granted_at LIMIT 1`,[req.user.id]);
  if(!result.rows[0])return res.status(401).json({error:'SESSION_NOT_FOUND'});
  return res.json({user:result.rows[0]});
}catch(error){return next(error);}});

module.exports=router;
