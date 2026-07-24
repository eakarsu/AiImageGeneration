'use strict';
const fs=require('node:fs');const path=require('node:path');require('dotenv').config({path:path.join(__dirname,'..','..','.env')});const pool=require('../db');
async function main(){const dir=path.join(__dirname,'..','migrations');for(const name of fs.readdirSync(dir).filter(x=>x.endsWith('.sql')).sort()){await pool.query(fs.readFileSync(path.join(dir,name),'utf8'));console.log(`Reconciled ${name}`);}}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());
