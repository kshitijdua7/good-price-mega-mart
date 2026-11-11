'use client';
// Pieces shared by the storefront, the cart/checkout/account pages and the owner dashboard.
import {createContext,useContext} from 'react';
import {ArrowUpRight} from 'lucide-react';
import type {Product,Settings,User} from './catalog-data';
import {dict} from './i18n';

export type Shop={
 t:(s:string)=>string,products:Product[],settings:Settings,
 /** False when no database is connected: the site then works as an enquiry-only catalogue. */
 shop:boolean,
 user:User|null,userLoaded:boolean,ownerExists:boolean,setUser:(u:User|null)=>void,
 cart:Record<string,number>,setQty:(id:string,qty:number)=>void,clearCart:()=>void,
 saved:string[],compare:string[],toggleSave:(id:string)=>void,toggleCompare:(id:string)=>void,
 say:(message:string)=>void,
};
export const Ctx=createContext<Shop>(null as unknown as Shop);

const hindiLabels=new Map(Object.entries(dict).map(([key,value])=>[key.toLowerCase(),value[0]]));
export const hindiLabel=(value:string)=>hindiLabels.get(value.toLowerCase())??value;
const punjabiLabels=new Map(Object.entries(dict).map(([key,value])=>[key.toLowerCase(),value[1]]));
// The language of WhatsApp messages follows the language the visitor chose for the site.
export type WaLang='en'|'hi'|'pa';
let waLang:WaLang='en';
export const setWaLang=(l:WaLang)=>{waLang=l};
export const getWaLang=()=>waLang;
export const waLabel=(value:string)=>waLang==='hi'?hindiLabel(value):waLang==='pa'?(punjabiLabels.get(value.toLowerCase())??value):value;
export const waPick=(en:string,hi:string,pa:string)=>waLang==='hi'?hi:waLang==='pa'?pa:en;
export const phone='919872850453';
export const waText=(text:string)=>'https://wa.me/'+phone+'?text='+encodeURIComponent(text);
export const rupees=(n:number)=>'₹'+Math.round(n).toLocaleString('en-IN');
export const orderable=(p?:Product)=>!!p&&p.price!==null&&p.inStock;
export const feeLabel=(fee:number|null,t:(s:string)=>string)=>fee===null?t('Confirmed by the store'):fee===0?t('Free'):rupees(fee);

export async function api<T=Record<string,unknown>>(path:string,method='GET',body?:unknown):Promise<T>{
 const res=await fetch('/api/'+path,{method,headers:body!==undefined?{'content-type':'application/json'}:undefined,body:body!==undefined?JSON.stringify(body):undefined});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(data.error||'Something went wrong. Please try again.');
 return data as T;
}

export function Appliance({type='washer',className=''}:{type?:string,className?:string}) {const t=useContext(Ctx)?.t??((x:string)=>x);return <div className={'appliance '+type+' '+className} aria-label={'Illustration of '+type} role="img"><div className="appliance-top"><span>{t('GOOD LIVING')}</span><i/><b>◦ ◦ ◦</b></div><div className="appliance-body"><div className="appliance-door"><div className="drum"/></div><div className="handle"/><div className="seam"/><div className="vents"/><div className="plate p1"/><div className="plate p2"/><div className="plate p3"/></div><div className="feet"/></div>}
export function Art({p}:{p:{image?:string,name:string,type:string}}){return p.image?<img className="product-photo" src={p.image} alt={p.name} loading="lazy"/>:<Appliance type={p.type}/>}
export function Btn({children,href,secondary=false}:{children:React.ReactNode,href:string,secondary?:boolean}) {return <a className={'btn '+(secondary?'secondary':'')} href={href}>{children}<ArrowUpRight size={17}/></a>}
