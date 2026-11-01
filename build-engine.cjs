'use strict';
require('./strip-revamp.cjs');
require('./inject-polish.cjs');
require('./inject-party.cjs');
require('./inject-fasiam.cjs');
require('./inject-revamp.cjs');
const fs=require('fs'),path=require('path'),acorn=require('acorn');const root=__dirname;
let src=[...fs.readFileSync(path.join(root,'source/game-base.html'),'utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].at(-1)[1];
let ast=acorn.parse(src,{ecmaVersion:'latest'}),edits=[];
function visit(n,parents=[]){if(!n||typeof n!=='object')return;if(n.type==='CallExpression'&&n.callee.type==='MemberExpression'&&!n.callee.computed&&n.callee.property.name==='takeDamage'&&n.callee.object.type!=='Super'){
 const fn=[...parents].reverse().find(x=>x.type==='FunctionDeclaration'),method=[...parents].reverse().find(x=>x.type==='MethodDefinition');let actor='serverDamageActor',name=fn?.id?.name;
 if(method)actor='this';
 if(fn?.params?.[0]?.type==='Identifier'&&['owner','e','source'].includes(fn.params[0].name))actor=fn.params[0].name;
 if(['tickDeadShot','lanUpdateShots','gameLoop'].includes(name))actor='pr.owner';
 if(name==='tickExpansionStatus')actor='dot.owner';if(name==='tickPowerupSystem')actor='b.owner';if(['lanBossHitCircle','lanBossHitLine'].includes(name))actor='lanBossState?.entity';
 const target=src.slice(n.callee.object.start,n.callee.object.end),args=n.arguments.map(a=>src.slice(a.start,a.end)).join(',');
 if(method?.key?.name==='dealDamage'&&target==='this'&&args.includes('pct'))actor='target';
 edits.push([n.start,n.end,`serverDamage(${target},[${args}],${actor})`]);
 }
 for(const [k,v]of Object.entries(n)){if(k==='start'||k==='end')continue;if(Array.isArray(v)){for(const x of v){if(x?.type)visit(x,[...parents,n]);}}else if(v?.type){visit(v,[...parents,n]);}}}
visit(ast);for(const [a,b,text]of edits.sort((a,b)=>b[0]-a[0]))src=src.slice(0,a)+text+src.slice(b);
ast=acorn.parse(src,{ecmaVersion:'latest'});
let kept=[],removed=0;
for(const n of ast.body){const text=src.slice(n.start,n.end);let keep=['VariableDeclaration','FunctionDeclaration','ClassDeclaration','ForOfStatement'].includes(n.type);
 if(n.type==='ForOfStatement'&&(/document\.|getElementById/.test(text)))keep=false;
 if(n.type==='ExpressionStatement'){const e=n.expression;keep=e.type==='AssignmentExpression'||(e.type==='CallExpression'&&/^CHARACTERS\.push/.test(text));if(/^document\.|^window\.addEventListener/.test(text))keep=false;}
 if(keep)kept.push(text);else removed++;
}
const header='// GENERATED from the offline Fasiam + retained nine-hero game. Browser bootstrap/render execution is omitted, not combat kits.\nimport {heroVisualConfigs} from "./visual-configs.mjs";\nexport function createWorld(options={}){\n'+fs.readFileSync(path.join(root,'shared/headless-platform.js'),'utf8')+'\n';
const footer=fs.readFileSync(path.join(root,'shared/world-api.js'),'utf8');
fs.writeFileSync(path.join(root,'shared/game-engine.mjs'),header+kept.join('\n')+'\n'+footer+'\n}\n');console.log('Headless engine generated: '+edits.length+' damage call sites instrumented, '+removed+' browser bootstrap statements omitted.');
