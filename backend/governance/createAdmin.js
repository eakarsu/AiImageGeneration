'use strict';
const path=require('node:path');
require('dotenv').config({path:path.join(__dirname,'..','..','.env')});
const bcrypt=require('bcryptjs');
const pool=require('../db');

async function main(env=process.env){
  if(env.BOOTSTRAP_ACKNOWLEDGEMENT!=='create-initial-admin')throw new Error('BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin is required');
  const email=String(env.PROVISION_ADMIN_EMAIL||env.ADMIN_EMAIL||'').trim().toLowerCase();
  const password=String(env.PROVISION_ADMIN_PASSWORD||env.ADMIN_PASSWORD||'');
  const tenantId=String(env.GOVERNANCE_TENANT_ID||'').trim();
  if(!email||password.length<12||!tenantId)throw new Error('Admin email, password of at least 12 characters, and tenant id are required');
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const passwordHash=await bcrypt.hash(password,12);
    const user=(await client.query(`INSERT INTO users(email,password) VALUES($1,$2)
      ON CONFLICT(email) DO UPDATE SET password=EXCLUDED.password RETURNING id`,[email,passwordHash])).rows[0];
    await client.query(`INSERT INTO governed_tenant_memberships(tenant_id,actor_id,role,subject_ref_prefix,granted_by)
      VALUES($1,$2,'creative_producer','*',$2)
      ON CONFLICT(tenant_id,actor_id) DO UPDATE SET role='creative_producer',subject_ref_prefix='*',active=TRUE`,[tenantId,String(user.id)]);
    await client.query('COMMIT');
    console.log(`Provisioned governed image administrator for ${email}`);
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exit(1);});
module.exports={main};
