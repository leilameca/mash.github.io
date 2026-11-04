// Isolated browser tests of the real client components; no production login or writes.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const modules = [];
const ids = new Map();
const mocks = {
  'next/image': `const React=require('react'); module.exports={__esModule:true,default:({fill,priority,unoptimized,sizes,...props})=>React.createElement('img',{...props,style:fill?{position:'absolute',width:'100%',height:'100%',inset:0}:props.style})};`,
  'next/link': `const React=require('react');module.exports={__esModule:true,default:props=>React.createElement('a',props)};`,
  'next/navigation': `module.exports={useRouter:()=>({replace:()=>{}}),usePathname:()=>'/studio-mash/productos'};`,
  actions: `module.exports={upsertProduct:async()=>({ok:false,message:'Prueba aislada: no se guardaron datos.'}),deleteProduct:async()=>({ok:true,message:'En papelera'}),duplicateProduct:async()=>({ok:true,message:'Copia creada'}),updateProductStatus:async()=>({ok:true,message:'Estado guardado'})};`
};
function bundle(id, raw) {
  if (ids.has(id)) return ids.get(id);
  const number = modules.length; ids.set(id, number); modules.push('');
  let source = raw ?? fs.readFileSync(id, 'utf8');
  if (/\.tsx?$/.test(id)) source = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  source = source.replace(/require\(["']([^"']+)["']\)/g, (_match, name) => {
    if (mocks[name]) return `require(${bundle(name, mocks[name])})`;
    if (name.endsWith('/actions')) return `require(${bundle('actions', mocks.actions)})`;
    let resolved;
    if (name.startsWith('.')) {
      const base = path.resolve(path.dirname(id), name);
      resolved = [base, base + '.tsx', base + '.ts', base + '.js'].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
    } else resolved = require.resolve(name, { paths: [root] });
    if (!resolved) throw new Error(`Cannot bundle ${name} from ${id}`);
    return `require(${bundle(resolved)})`;
  });
  modules[number] = `function(module,exports,require){${source}\n}`;
  return number;
}
const imageA = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'public/assets/images/oasis-set.jpg')).toString('base64');
const imageB = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'public/assets/images/oculus-mare-dining.jpg')).toString('base64');
const entry = bundle(path.join(root, 'tests/browser-entry.js'), `
const React=require('react'); const {createRoot}=require('react-dom/client');
const {ProductForm}=require('../app/studio-mash/productos/ProductForm');
const {ProductList}=require('../app/studio-mash/productos/ProductList');
const {StudioNav}=require('../app/studio-mash/StudioNav');
const {StudioSidebar}=require('../app/studio-mash/StudioSidebar');
const Loading=require('../app/studio-mash/loading').default;
const nav=[['','Resumen'],['/productos','Productos'],['/colecciones','Colecciones'],['/contenido','Contenido'],['/proyectos','Proyectos'],['/multimedia','Multimedia']].map(([suffix,label])=>({href:'/studio-mash'+suffix,label}));
const product={id:'11111111-1111-4111-8111-111111111111',slug:'oasis',name_es:'Oasis',description_es:'Un conjunto para tu terraza.',collection_id:'c1',status:'draft',hero_image_path:${JSON.stringify(imageA)},image_paths:${JSON.stringify([imageA, imageB])}};
const list=[{id:'1',slug:'oasis',name:'Oasis',collection:'Terraza',status:'draft',image:product.hero_image_path},{id:'2',slug:'candor',name:'Candor',collection:'Comedor',status:'archived',image:product.hero_image_path}];
createRoot(document.getElementById('root')).render(React.createElement('main',{className:'studio'},React.createElement(StudioSidebar,{items:nav},React.createElement('button',{className:'studio-logout'},'Cerrar sesión')),React.createElement('section',{className:'studio-main'},location.search ? React.createElement(Loading) : React.createElement(React.Fragment,null,React.createElement('h1',null,'Productos'),React.createElement(ProductList,{products:list}),React.createElement('section',{className:'studio-card'},React.createElement(ProductForm,{product,collections:[{id:'c1',label:'Terraza'}]}))))));
`);
const script = `var process={env:{NODE_ENV:'production'}};var modules=[${modules.join(',')}],cache={};function require(id){if(cache[id])return cache[id].exports;var m=cache[id]={exports:{}};modules[id](m,m.exports,require);return m.exports;}require(${entry});`;
const css = fs.readFileSync(path.join(root,'app/globals.css'),'utf8') + fs.readFileSync(path.join(root,'app/studio-mash/studio.css'),'utf8');
(async () => {
  const browser = await chromium.launch({headless:true,channel:process.platform==='win32'?'chrome':undefined});
  try {
    const page = await browser.newPage(); const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    const screenshots = fs.mkdtempSync(path.join(os.tmpdir(),'mash-admin-ux-'));
    let uploads=0;
    await page.route('http://localhost:48765/**', async route => {
      if (route.request().url().includes('/api/studio-media')) {
        if (route.request().method()==='POST') { uploads++; await route.fulfill({status:uploads===1?500:200,contentType:'application/json',body:JSON.stringify(uploads===1?{error:'Interrupción simulada'}:{url:imageA})}); }
        else await route.fulfill({contentType:'application/json',body:JSON.stringify({items:[{name:'Oasis reutilizable',url:imageA}],more:false})});
      } else await route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>:root{--font-sans:Arial;--font-serif:Georgia}${css}</style><div id="root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script>`});
    });
    await page.goto('http://localhost:48765/?loading');
    await page.getByRole('status', {name:'Cargando contenido'}).waitFor();
    assert.equal(await page.locator('.studio-nav svg[aria-hidden=true]').count(), 6);
    assert.equal(await page.getByRole('link', {name:'Productos', exact:true}).getAttribute('aria-current'), 'page');
    for (const width of [1440,768,390,320]) {
      await page.setViewportSize({width,height:950});
      if (width <= 980) {
        const menu = page.getByRole('button', {name:'Menú',exact:true});
        assert.equal(await menu.getAttribute('aria-expanded'),'false');
        assert.ok((await page.locator('.studio-sidebar').boundingBox()).height < 105);
        assert.equal(await page.getByRole('navigation',{name:'Administración'}).isVisible(),false);
        await menu.click();
        assert.ok(await page.getByRole('navigation',{name:'Administración'}).isVisible());
        await page.getByRole('link',{name:'Multimedia',exact:true}).focus();
        await page.keyboard.press('Escape');
        assert.equal(await menu.getAttribute('aria-expanded'),'false');
        assert.ok(await menu.evaluate(el=>el===document.activeElement));
      }
      await page.screenshot({path:path.join(screenshots,`loading-${width}.png`),fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Loader overflow at ${width}`);
    }
    assert.notEqual(await page.locator('.studio-loading__mark').evaluate(el=>getComputedStyle(el,'::after').animationName),'none');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.studio-loading__mark').evaluate(el=>getComputedStyle(el,'::after').animationName),'none');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.goto('http://localhost:48765/');
    await page.getByRole('button',{name:'Vista previa',exact:true}).waitFor();
    for (const width of [1440,768,390,320]) {
      await page.setViewportSize({width,height:950});
      await page.screenshot({path:path.join(screenshots,`admin-${width}.png`),fullPage:true});
      const overflow = await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(el=>el.getBoundingClientRect().right>innerWidth+1).map(el=>({tag:el.tagName,class:el.className,width:el.getBoundingClientRect().width})).slice(0,12));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Admin overflow at ${width}: ${JSON.stringify(overflow)}; ${screenshots}`);
    }
    assert.equal(await page.locator('[name=name_es]').evaluate(el=>getComputedStyle(el).fontSize),'16px');
    assert.ok((await page.getByRole('button',{name:'Mover imagen 2 antes',exact:true}).boundingBox()).height >= 44);
    await page.getByLabel('Buscar producto').fill('inexistente');
    assert.equal(await page.locator('.studio-product-row').count(),0);
    await page.getByRole('button',{name:'Limpiar filtros'}).click();
    assert.equal(await page.locator('.studio-product-row').count(),1);
    await page.locator('.studio-catalog-filters select').first().selectOption('archived');
    assert.ok(await page.getByRole('button',{name:'Restaurar borrador'}).isVisible());
    await page.locator('[name=name_es]').fill('Oasis actualizado');
    assert.ok(await page.getByText('Cambios sin guardar',{exact:true}).isVisible());
    await page.getByRole('button',{name:'Vista previa',exact:true}).click();
    assert.equal(await page.locator('.studio-preview-dialog h2').innerText(),'Oasis actualizado');
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Mover imagen 2 antes',exact:true}).click();
    assert.equal(JSON.parse(await page.locator('[name=existing_image_paths]').inputValue())[0],imageB);
    await page.getByRole('button',{name:'Elegir de Multimedia'}).click();
    await page.getByRole('button',{name:'Oasis reutilizable'}).waitFor();
    await page.locator('input[type=file]').setInputFiles(path.join(root,'public/assets/images/oasis-set.jpg'));
    await page.getByRole('button',{name:'Reintentar',exact:true}).waitFor();
    await page.getByRole('button',{name:'Reintentar',exact:true}).click();
    await page.getByText('Lista para guardar en el producto',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Guardar producto',exact:true}).click();
    await page.getByText('Prueba aislada: no se guardaron datos.',{exact:true}).waitFor();
    assert.equal(await page.locator('[name=name_es]').inputValue(),'Oasis actualizado','A failed save must preserve entered values');
    assert.deepEqual(errors,[]);
    console.log(`PASS: admin responsive, search, trash filter, unsaved state, preview, reorder, library, upload retry and save error. Mocked services; no database writes. Screenshots: ${screenshots}`);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
