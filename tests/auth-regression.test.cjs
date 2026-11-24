const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {loadTs}=require('./support/load-ts.cjs');
function fixture(allowed){
  const calls=[];const q={select(){return this},eq(){return this},maybeSingle:async()=>({data:allowed,error:null})};
  const client={auth:{signInWithOtp:async input=>{calls.push(input);return {error:null}},verifyOtp:async()=>{calls.push('verify');return {data:{user:{id:'admin-id',email:'admin@isolated.invalid'}},error:null}},signOut:async()=>calls.push('signOut')}};
  const actions=loadTs(path.resolve('app/studio-mash/actions.ts'),{
    'next/cache':{revalidatePath(){}},'next/navigation':{redirect:url=>{throw Error('redirect:'+url)}},
    '@/lib/supabase/env':{adminRoute:'/studio-mash',getSupabaseSetupIssues:()=>[]},
    '@/lib/supabase/admin':{createSupabaseAdminClient:()=>({from:()=>q})},
    '@/lib/supabase/server':{createSupabaseServerClient:async()=>client},
    '@/lib/supabase/auth':{},'@/lib/supabase/persistence':{},'@/lib/supabase/media':{}
  },{Error});
  return {actions,calls};
}
test('OTP request preserves allowlist and does not disclose unauthorized address',async()=>{
  const denied=fixture(null),allowed=fixture({id:'allow',is_active:true});const form=new FormData();form.set('email','admin@isolated.invalid');
  const a=await denied.actions.requestAdminCode({},form);const b=await allowed.actions.requestAdminCode({},form);
  assert.equal(a.message,b.message);assert.equal(denied.calls.length,0);assert.equal(allowed.calls.length,1);assert.equal(allowed.calls[0].options.shouldCreateUser,true);
});
test('OTP remains eight digits; six digits are rejected before verification',async()=>{
  const {actions,calls}=fixture({id:'allow',user_id:'admin-id'});const form=new FormData();form.set('email','admin@isolated.invalid');form.set('token','123456');
  assert.ok((await actions.verifyAdminCode({},form)).errors.token);assert.equal(calls.length,0);
  form.set('token','12345678');await assert.rejects(actions.verifyAdminCode({},form),/redirect:\/studio-mash/);assert.deepEqual(calls,['verify']);
});
test('valid OTP cannot authorize an account outside the administrative allowlist',async()=>{
  const {actions,calls}=fixture(null);const form=new FormData();form.set('email','admin@isolated.invalid');form.set('token','12345678');
  assert.equal((await actions.verifyAdminCode({},form)).ok,false);assert.ok(calls.includes('signOut'));
});
