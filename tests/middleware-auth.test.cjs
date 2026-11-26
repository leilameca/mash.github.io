const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {NextRequest}=require('next/server');
const {loadTs}=require('./support/load-ts.cjs');
test('administrative session refresh forwards fresh cookies to the render and browser',async()=>{
  const {middleware}=loadTs(path.resolve('middleware.ts'),{
    '@/lib/supabase/env':{getSupabasePublicConfig:()=>({url:'https://isolated.invalid',anonKey:'test'})},
    '@supabase/ssr': {
      createServerClient: (_url, _key, options) => ({
        auth: {
          getUser: async () => {
            options.cookies.setAll([{name:'sb-session',value:'fresh',options:{path:'/'}}]);
            return {data:{user:null}};
          }
        }
      })
    }
  },{Headers});
  const request=new NextRequest('https://isolated.invalid/studio-mash/productos',{headers:{cookie:'sb-session=old'}});
  const response=await middleware(request);
  assert.equal(response.headers.get('x-middleware-request-cookie'),'sb-session=fresh');
  assert.equal(response.headers.get('x-middleware-request-x-mash-locale'),'es');
  assert.match(response.headers.get('set-cookie'),/sb-session=fresh/);
});
