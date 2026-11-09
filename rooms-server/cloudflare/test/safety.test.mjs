import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../worker.mjs';
import { localDatabase as database } from './local-worker.mjs';
import { TERMS_VERSION } from '../safety.mjs';
import { japanMonth } from '../room-comparison.mjs';

async function call(env, path, token, method='GET', body, origin) {
  return worker.fetch(new Request('https://fitswipe.test'+path, { method, headers: {
    'Content-Type':'application/json', ...(token ? { Authorization:'Bearer '+token } : {}), ...(origin ? { Origin:origin } : {}),
  }, ...(body === undefined ? {} : { body:JSON.stringify(body) }) }), env);
}
async function account(env,name) {
  const response = await call(env,'/v1/account',null,'POST',{ name, termsVersion:TERMS_VERSION });
  assert.equal(response.status,200,await response.clone().text()); return response.json();
}
const workout = clientId => ({ clientId, presetName:'private-'+clientId, startedAt:new Date().toISOString(), endedAt:new Date().toISOString(), exercises:[{ name:'Press', sets:[{ order:1,reps:10 }] }] });
async function fixture() {
  const env=database();
  const a=await account(env,'Alice'), b=await account(env,'Bob'), c=await account(env,'Carol'), outsider=await account(env,'Outsider');
  const room=await (await call(env,'/v1/rooms',a.token,'POST',{ name:'Friends' })).json();
  const code=(await (await call(env,'/v1/rooms',a.token)).json()).rooms[0].inviteCode;
  for (const u of [b,c]) assert.equal((await call(env,'/v1/rooms/join',u.token,'POST',{ code })).status,200);
  const path='/v1/rooms/'+room.id;
  for (const u of [a,b,c]) {
    assert.equal((await call(env,path+'/posts',u.token,'POST',workout(u.id))).status,200);
    assert.equal((await call(env,path+'/sharing',u.token,'PUT',{enabled:true})).status,200);
    assert.equal((await call(env,path+'/auto-workouts',u.token,'PUT',workout('auto-'+u.id))).status,200);
  }
  return { env,a,b,c,outsider,room,path };
}

test('new accounts and existing uploads require explicit current terms; deletion stays available', async()=>{
  const env=database();
  assert.equal((await call(env,'/v1/account',null,'POST',{name:'missing'})).status,428);
  assert.equal(env.db.prepare('SELECT count(*) AS n FROM users').get().n,0);
  const a=await account(env,'Legacy');
  env.db.prepare('UPDATE users SET terms_version=NULL').run();
  assert.equal((await call(env,'/v1/rooms',a.token,'POST',{})).status,428);
  assert.equal((await call(env,'/v1/account',a.token,'PUT',{name:'new'})).status,428);
  assert.equal((await call(env,'/v1/safety/terms',a.token,'POST',{termsVersion:'old'})).status,428);
  assert.equal((await call(env,'/v1/safety/terms',a.token,'POST',{termsVersion:TERMS_VERSION})).status,200);
  assert.equal((await (await call(env,'/v1/safety',a.token)).json()).accepted,true);
  assert.equal((await call(env,'/v1/rooms',a.token,'POST',{})).status,200);
  env.db.prepare('UPDATE users SET terms_version=NULL').run();
  assert.equal((await call(env,'/v1/account',a.token,'DELETE')).status,200);
  env.db.close();
});

test('block hides both parties in members, manual and automatic records, rankings and previews; others retain access', async()=>{
  const {env,a,b,c,outsider,path}=await fixture();
  assert.equal((await call(env,'/v1/safety/blocks/'+outsider.id,a.token,'PUT',{})).status,404);
  assert.equal((await call(env,'/v1/safety/blocks/'+a.id,a.token,'PUT',{})).status,400);
  assert.equal((await call(env,'/v1/safety/blocks/'+b.id,a.token,'PUT',{})).status,200);
  assert.equal((await call(env,'/v1/safety/blocks/'+b.id,a.token,'PUT',{})).status,200);
  for (const [viewer,hidden] of [[a,b],[b,a]]) {
    for (const suffix of ['', '/posts', '/comparison?month='+japanMonth(), '/comparison?month='+japanMonth()+'&memberId='+hidden.id]) {
      const response=await call(env,path+suffix,viewer.token); assert.equal(response.status,200,await response.clone().text());
      const text=await response.text(); assert.ok(!text.includes(hidden.name),text); assert.ok(!text.includes('private-'+hidden.id),text);
    }
    const rooms=await (await call(env,'/v1/rooms',viewer.token)).text(); assert.ok(!rooms.includes(hidden.name),rooms);
  }
  const comparison=await (await call(env,path+'/comparison?month='+japanMonth(),c.token)).json();
  assert.equal(comparison.rankings.length,3); assert.equal(comparison.posts.length,6);
  assert.equal((await (await call(env,'/v1/safety',a.token)).json()).blocked[0].id,b.id);
  await call(env,'/v1/safety/blocks/'+a.id,b.token,'PUT',{});
  await call(env,'/v1/safety/blocks/'+b.id,a.token,'DELETE');
  assert.ok(!(await (await call(env,path,a.token)).text()).includes(b.name));
  await call(env,'/v1/safety/blocks/'+a.id,b.token,'DELETE');
  assert.ok((await (await call(env,path,a.token)).text()).includes(b.name));
  env.db.close();
});

test('reports require membership and valid target, preserve evidence, are rate bounded, and cascade on account deletion',async()=>{
  const {env,a,b,outsider,path,room}=await fixture();
  const post=env.db.prepare('SELECT id FROM auto_workouts WHERE user_id=?').get(b.id);
  const body={targetId:b.id,postId:post.id,reason:'harassment',details:'test evidence'};
  assert.equal((await call(env,path+'/reports',outsider.token,'POST',body)).status,404);
  assert.equal((await call(env,path+'/reports',a.token,'POST',{...body,targetId:a.id})).status,404);
  assert.equal((await call(env,path+'/reports',a.token,'POST',{...body,reason:'invalid'})).status,400);
  assert.equal((await call(env,path+'/reports',a.token,'POST',{...body,postId:crypto.randomUUID()})).status,404);
  assert.equal((await call(env,path+'/reports',a.token,'POST',body)).status,200);
  const saved=env.db.prepare('SELECT * FROM safety_reports').get();
  assert.equal(saved.reporter_id,a.id); assert.equal(saved.room_id,room.id);
  assert.equal(JSON.parse(saved.evidence).profile.name,b.name);
  assert.equal(JSON.parse(JSON.parse(saved.evidence).post.payload).presetName,'private-auto-'+b.id);
  for(let i=1;i<20;i++) assert.equal((await call(env,path+'/reports',a.token,'POST',body)).status,200);
  assert.equal((await call(env,path+'/reports',a.token,'POST',body)).status,429);
  await call(env,'/v1/account',b.token,'DELETE');
  assert.equal(env.db.prepare('SELECT count(*) AS n FROM safety_reports').get().n,0);
  env.db.close();
});

test('public policies and deletion request work without installation; reject cross-site and malformed requests',async()=>{
  const env=database();
  for (const path of ['/privacy','/terms','/support','/delete-account']) {
    const response=await call(env,path); assert.equal(response.status,200); assert.match(response.headers.get('content-type'),/text\/html/);
    assert.ok((await response.text()).includes('FitSwipe'));
  }
  const form=new URLSearchParams({email:'test@example.com',accountHint:'Google account',message:'Delete my FitSwipe account',consent:'yes'});
  const submit=(origin,body=form)=>worker.fetch(new Request('https://fitswipe.test/delete-account',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',...(origin?{Origin:origin}:{})},body}),env);
  assert.equal((await submit()).status,403);
  assert.equal((await submit('https://evil.test')).status,403);
  assert.equal((await submit('https://fitswipe.test',new URLSearchParams({email:'bad'}))).status,400);
  assert.equal((await submit('https://fitswipe.test')).status,200);
  const request=env.db.prepare('SELECT * FROM support_requests').get();
  assert.equal(request.kind,'deletion'); assert.equal(request.email,'test@example.com'); assert.equal(request.status,'open');
  for(let i=1;i<5;i++) assert.equal((await submit('https://fitswipe.test')).status,200);
  assert.equal((await submit('https://fitswipe.test')).status,429);
  env.db.prepare("UPDATE support_requests SET created_at='2000-01-01'").run();
  await worker.scheduled({},env);
  assert.equal(env.db.prepare('SELECT count(*) AS n FROM support_requests').get().n,0);
  env.db.close();
});

test('suspension hides UGC and disables access but leaves account deletion available',async()=>{
  const {env,a,b,c,path}=await fixture();
  env.db.prepare('UPDATE users SET suspended=1 WHERE id=?').run(b.id);
  assert.equal((await call(env,path,b.token)).status,403);
  assert.ok(!(await (await call(env,path,c.token)).text()).includes(b.name));
  assert.ok(!(await (await call(env,path+'/comparison?month='+japanMonth(),a.token)).text()).includes(b.name));
  assert.equal((await call(env,'/v1/account',b.token,'DELETE')).status,200);
  env.db.close();
});

test('web deletion validates Google identity, explicit confirmation and origin, removes associated data, and transfers ownership',async()=>{
  const {env,a,b,path,room}=await fixture();
  env.GOOGLE_WEB_CLIENT_ID='test.apps.googleusercontent.com';
  env.db.prepare('UPDATE users SET google_subject=? WHERE id=?').run('google-alice',a.id);
  env.db.prepare('INSERT INTO sync_accounts(user_id) VALUES(?)').run(a.id);
  const key=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
  const jwk={...await crypto.subtle.exportKey('jwk',key.publicKey),kid:'web-deletion',alg:'RS256'};
  const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
  const now=Math.floor(Date.now()/1000);
  const input=encode({alg:'RS256',kid:jwk.kid})+'.'+encode({iss:'https://accounts.google.com',aud:env.GOOGLE_WEB_CLIENT_ID,sub:'google-alice',iat:now,exp:now+3600});
  const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key.privateKey,new TextEncoder().encode(input));
  const idToken=input+'.'+Buffer.from(signature).toString('base64url');
  const original=globalThis.fetch; globalThis.fetch=async url=>{assert.equal(url,'https://www.googleapis.com/oauth2/v3/certs');return Response.json({keys:[jwk]});};
  try {
    const body={idToken,confirmed:true};
    assert.equal((await call(env,'/v1/account/web-deletion',null,'POST',body,'https://evil.test')).status,403);
    assert.equal((await call(env,'/v1/account/web-deletion',null,'POST',{idToken,confirmed:false},'https://fitswipe.test')).status,400);
    assert.equal((await call(env,'/v1/account/web-deletion',null,'POST',{idToken:'invalid',confirmed:true},'https://fitswipe.test')).status,401);
    assert.equal((await call(env,'/v1/account/web-deletion',null,'POST',body,'https://fitswipe.test')).status,200);
    assert.equal(env.db.prepare('SELECT count(*) AS n FROM users WHERE id=?').get(a.id).n,0);
    for (const table of ['posts','auto_workouts','account_sessions','sync_accounts']) assert.equal(env.db.prepare(`SELECT count(*) AS n FROM ${table} WHERE user_id=?`).get(a.id).n,0);
    assert.equal(env.db.prepare('SELECT owner_id FROM rooms WHERE id=?').get(room.id).owner_id,b.id);
    assert.equal((await call(env,path,a.token)).status,401);
    assert.equal((await call(env,'/v1/account/web-deletion',null,'POST',body,'https://fitswipe.test')).status,200);
  } finally {globalThis.fetch=original;env.db.close();}
});

test('operator removal cannot be restored by manual or automatic retry, including legacy IDs',async()=>{
  const {execFileSync}=await import('node:child_process');
  const {env,a,b,path}=await fixture();
  const post=env.db.prepare('SELECT id,client_id FROM posts WHERE user_id=?').get(b.id);
  // Capture the real operator script's SQL without connecting to any database.
  const code=`import sys,runpy,subprocess,json,types
subprocess.run=lambda args,**kw:types.SimpleNamespace(returncode=0,stderr='',stdout=json.dumps({'sql':args[-1]}))
runpy.run_path('scripts/review-inbox.py',run_name='__main__')`;
  const result=execFileSync('python3',['-c',code,'remove-post',post.id],{cwd:new URL('../../../',import.meta.url),encoding:'utf8'});
  env.db.exec(JSON.parse(result).sql);
  assert.equal((await call(env,path+'/posts',b.token,'POST',workout(post.client_id))).status,403);
  assert.equal((await call(env,path+'/auto-workouts',b.token,'PUT',{...workout('new-id'),legacyClientId:post.client_id})).status,403);
  assert.ok(!(await (await call(env,path+'/posts',a.token)).text()).includes('private-'+post.client_id));
  env.db.close();
});
