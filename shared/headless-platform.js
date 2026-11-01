// Minimal inert adapters for the original game's UI references. No DOM or browser is run on server.
let clock=10000,randomSeed=(Number.isFinite(options.seed)?options.seed:globalThis.Math.floor(globalThis.Math.random()*4294967295))>>>0;
const Math=Object.create(globalThis.Math);Math.random=()=>{randomSeed=(globalThis.Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
const Date=class extends globalThis.Date{static now(){return clock;}};
const performance={now:()=>clock},noop=()=>{};
const context=new Proxy({measureText:s=>({width:String(s).length*8}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
const nodes=new Map();function node(id=''){if(nodes.has(id))return nodes.get(id);const n={id,value:'',textContent:'',innerHTML:'',innerText:'',style:{},dataset:{},options:[],children:[],width:900,height:900,clientWidth:390,clientHeight:844,scrollHeight:844,classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},getContext:()=>context,querySelector:s=>node(id+':'+s),querySelectorAll:()=>[],getBoundingClientRect:()=>({x:0,y:0,width:390,height:844,top:0,left:0,bottom:844,right:390}),appendChild:noop,append:noop,after:noop,before:noop,insertBefore:noop,insertAdjacentElement:noop,addEventListener:noop,removeEventListener:noop,setAttribute:noop,removeAttribute:noop,remove:noop,focus:noop,select:noop};nodes.set(id,n);Object.defineProperty(n,'parentElement',{get:()=>node('parent:'+id)});return n;}
const document={getElementById:node,querySelector:s=>node(s),querySelectorAll:()=>[],createElement:s=>node(s+nodes.size),createTreeWalker:()=>({nextNode:()=>false}),addEventListener:noop,head:node('head'),body:node('body'),hidden:false,documentElement:node('html')};
const window={addEventListener:noop,removeEventListener:noop,innerWidth:390,innerHeight:844},location={protocol:'http:',hostname:'localhost',host:'localhost',search:'',port:''},navigator={},NodeFilter={SHOW_TEXT:4};
const localStorage={getItem:()=>null,setItem:noop,removeItem:noop};
const requestAnimationFrame=()=>0,cancelAnimationFrame=noop,setTimeout=()=>0,clearTimeout=noop,setInterval=()=>0,clearInterval=noop;
const alert=noop,confirm=()=>false;
