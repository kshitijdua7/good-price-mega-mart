'use client';
// First-visit welcome screen: the visitor picks English, Hindi or Punjabi before the site opens.
import {useEffect,useRef} from 'react';
import {ArrowRight} from 'lucide-react';

type Lang='en'|'hi'|'pa';
const choices:{code:Lang,name:string,native:string,hello:string}[]=[
 {code:'en',name:'English',native:'English',hello:'Welcome'},
 {code:'hi',name:'Hindi',native:'हिंदी',hello:'स्वागत है'},
 {code:'pa',name:'Punjabi',native:'ਪੰਜਾਬੀ',hello:'ਜੀ ਆਇਆਂ ਨੂੰ'},
];

export default function LangGate({onPick}:{onPick:(l:Lang)=>void}){
 const first=useRef<HTMLButtonElement>(null);
 useEffect(()=>{first.current?.focus();document.body.style.overflow='hidden';return ()=>{document.body.style.overflow=''}},[]);
 return <div className="lang-gate" role="dialog" aria-modal="true" aria-labelledby="lang-gate-title">
  <div className="lang-gate-glow" aria-hidden="true"/>
  <div className="lang-gate-card">
   <span className="logo-mark" aria-hidden="true">g<span>p</span><i/></span>
   <div className="lang-gate-brand">good price<small>MEGA MART</small></div>
   <h1 id="lang-gate-title">Choose your language<span lang="hi">अपनी भाषा चुनें</span><span lang="pa">ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ</span></h1>
   <div className="lang-gate-options">{choices.map((c,i)=><button key={c.code} ref={i===0?first:undefined} lang={c.code} onClick={()=>onPick(c.code)}>
    <span className="lang-gate-native">{c.native}</span><span className="lang-gate-hello">{c.hello}</span><ArrowRight size={18} aria-hidden="true"/></button>)}</div>
   <p>You can change this any time from the menu.</p>
  </div></div>;
}
