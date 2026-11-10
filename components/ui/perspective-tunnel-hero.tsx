'use client';

import {motion,useMotionValue,useMotionValueEvent,useReducedMotion,useScroll,useSpring,useTransform,type MotionValue} from 'framer-motion';
import {useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowUpRight,MoveDown} from 'lucide-react';
import {Ctx,Art} from '@/app/shared';
import {categories,type Product} from '@/app/catalog-data';

type Stage={width:number;height:number;mobile:boolean};
type Card={product:Product;title:string;index:number;angle:number;rotation:number};
const clamp=(n:number)=>Math.min(1,Math.max(0,n));

/** Adapted from the supplied perspective-tunnel component: page scroll drives the
 * camera, so wheel, touch, keyboard and anchor navigation all continue naturally. */
function TunnelCard({card,progress,pointer,stage,reduce,brand}:{card:Card;progress:MotionValue<number>;pointer:{x:MotionValue<number>;y:MotionValue<number>};stage:Stage;reduce:boolean;brand:string}){
 const local=useTransform(progress,v=>clamp((v-card.index*.065)/.65));
 const depth=useTransform(local,[0,1],[stage.mobile?-680:-1150,stage.mobile?440:660]);
 const opacity=useTransform(local,[0,.08,.78,1],[.15,.85,.95,0]);
 const transform=useTransform(()=>{
  const z=reduce?-160:depth.get();
  const radiusX=stage.width*(stage.mobile?.55:.43);
  const radiusY=stage.height*(stage.mobile?.47:.4);
  const x=Math.cos(card.angle)*radiusX-pointer.x.get()*(stage.mobile?0:32);
  const y=Math.sin(card.angle)*radiusY-pointer.y.get()*(stage.mobile?0:25);
  return `translate3d(calc(-50% + ${x}px),calc(-50% + ${y}px),${z}px) rotateZ(${card.rotation}deg)`;
 });
 return <motion.div className={'tunnel-card tunnel-card-'+card.index} style={{transform,opacity:reduce?.7:opacity}}>
  <div className="tunnel-card-head"><span>0{card.index+1}</span><ArrowUpRight size={14}/></div>
  <div className="tunnel-card-art"><Art p={card.product}/></div>
  <div className="tunnel-card-caption"><span>{card.title}</span><small>{brand}</small></div>
 </motion.div>;
}

export default function PerspectiveTunnelHero({children,utility,festive=false}:{children:ReactNode;utility?:ReactNode;festive?:boolean}){
 const {products,t}=useContext(Ctx);
 const ref=useRef<HTMLElement>(null),viewport=useRef<HTMLDivElement>(null);
 const reduce=!!useReducedMotion();
 const [stage,setStage]=useState<Stage>({width:1440,height:900,mobile:false});
 useEffect(()=>{
  const el=viewport.current;if(!el)return;
  const measure=()=>setStage({width:el.clientWidth,height:el.clientHeight,mobile:el.clientWidth<768});
  measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect();
 },[]);
 const {scrollYProgress}=useScroll({target:ref,offset:['start start','end end']});
 const smooth=useSpring(scrollYProgress,{stiffness:90,damping:30,restDelta:.0001});
 const [finished,setFinished]=useState(false);
 useMotionValueEvent(smooth,'change',v=>setFinished(v>.94));
 const progress=useTransform(smooth,[0,1],[.32,1.35]);
 const pointerX=useMotionValue(0),pointerY=useMotionValue(0);
 const pointer={x:useSpring(pointerX,{stiffness:60,damping:25}),y:useSpring(pointerY,{stiffness:60,damping:25})};
 const titleScale=useTransform(smooth,[0,.6,1],[1,1.04,1.1]);
 const titleOpacity=useTransform(smooth,[0,.67,.95,1],[1,1,0,0]);
 const promptOpacity=useTransform(smooth,[0,.13],[1,0]);
 const ringScale=useTransform(smooth,[0,1],[.8,2.2]);
 const items=categories.map(c=>({c,p:products.find(p=>p.category===c.id)})).filter((v):v is {c:typeof categories[number];p:Product}=>!!v.p);
 const cards:Card[]=items.map(({c,p},i)=>({product:p,title:t(c.name),index:i,angle:(i*137.5+15)*Math.PI/180,rotation:(i%2?1:-1)*(5+(i%3)*3)}));
 // Two additional depths retain the supplied corridor's layered feel on desktop.
 if(!stage.mobile){for(const [j,type] of ['mixer','glasses'].entries()){
  const p=products.find(p=>p.type===type);if(p)cards.push({product:p,title:t(type==='mixer'?'Kitchen appliances':'Crockery & glassware'),index:cards.length,angle:(j?245:65)*Math.PI/180,rotation:j?-9:7});
 }}
 return <section ref={ref} className={'tunnel-section'+(reduce?' tunnel-reduced':'')} aria-label={t('Explore the Good Price showroom')}>
  <div className="tunnel-viewport" ref={viewport} onPointerMove={e=>{
   if(reduce||e.pointerType!=='mouse')return;
   const r=e.currentTarget.getBoundingClientRect();pointerX.set(((e.clientX-r.left)/r.width-.5)*2);pointerY.set(((e.clientY-r.top)/r.height-.5)*2);
  }} onPointerLeave={()=>{pointerX.set(0);pointerY.set(0)}}>
   <div className="tunnel-grid" aria-hidden="true"/><div className="tunnel-aurora" aria-hidden="true"/>
   {festive&&<div className="festive-lights" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i}/>)}</div>}
   <div className="tunnel-topline"><div className="tunnel-language">{utility}</div><a className="tunnel-skip" href="#categories">{t('Explore products')} <ArrowUpRight size={14}/></a></div>
   <div className="tunnel-visual-layer" aria-hidden="true"><div className="tunnel-space" style={{perspective:stage.mobile?850:1200}}>
    <motion.div className="tunnel-rings" style={{scale:reduce?1:ringScale}}><i/><i/><i/><i/></motion.div>
    {cards.map(card=><TunnelCard key={card.product.id} card={card} progress={progress} pointer={pointer} stage={stage} reduce={reduce} brand={t('GOOD PRICE MEGA MART')}/>)}
   </div></div>
   <motion.div inert={!reduce&&finished} className="tunnel-copy" style={{scale:reduce?1:titleScale,opacity:reduce?1:titleOpacity}}>{children}</motion.div>
   <div className="tunnel-bottom"><span>{t('GILL ROAD · LUDHIANA')}</span><motion.a href="#categories" className="tunnel-scroll" style={{opacity:reduce?1:promptOpacity}}><span>{t('SCROLL TO EXPLORE')}</span><MoveDown size={19}/></motion.a><span>{t('APPLIANCES. KITCHEN. EVERYDAY LIVING.')}</span></div>
   <div className="tunnel-travel" aria-hidden="true"><motion.i style={{scaleX:reduce?0:scrollYProgress}}/></div>
  </div>
 </section>;
}
