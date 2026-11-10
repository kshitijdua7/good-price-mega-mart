'use client';
// Owner dashboard: orders, products, delivery charges and store details. English only.
import {useContext,useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowUpRight,Plus,Pencil,Trash2,X,Phone,MessageCircle,ImagePlus,EyeOff,PackageX,Lock} from 'lucide-react';
import {categories,illustrations,orderStatuses,type Order,type Product,type Settings,type User} from './catalog-data';
import {Ctx,Art,Btn,api,rupees} from './shared';
import {OrderBody} from './shop';

type OwnerProduct=Product&{active:boolean};
type Data={products:OwnerProduct[],orders:Order[],settings:Settings,customers:number};
type Draft={id?:string,name:string,category:string,type:string,description:string,tag:string,suits:string,sizes:string,ask:string,brand:string,model:string,price:string,inStock:boolean,active:boolean,image?:string|null,preview?:string};
const blank:Draft={name:'',category:categories[0].id,type:categories[0].type,description:'',tag:categories[0].tag,suits:'',sizes:'',ask:'',brand:'',model:'',price:'',inStock:true,active:true};
const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const num=(s:string)=>s.trim()===''?null:Number(s);
const catName=(id:string)=>categories.find(c=>c.id===id)?.name??id;

/** Shrinks a chosen photo in the browser so uploads stay small. */
async function shrink(file:File){
 const bitmap=await createImageBitmap(file),scale=Math.min(1,1000/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 const ctx=canvas.getContext('2d')!;ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
 const webp=canvas.toDataURL('image/webp',.82);
 if(webp.startsWith('data:image/webp'))return webp;
 const png=canvas.toDataURL('image/png');
 if(png.length<850_000)return png; // keeps a transparent background
 ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 return canvas.toDataURL('image/jpeg',.85);
}

function Claim(){
 const {setUser}=useContext(Ctx);const [code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <form className="form-card owner-gate" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{setUser((await api<{user:User}>('owner/claim','POST',{code})).user)}catch(err){setError((err as Error).message)}finally{setBusy(false)}}}>
  <label>Owner setup code<input required autoComplete="off" spellCheck={false} placeholder="GPMM-XXXX-XXXX-XXXX-XXXX" value={code} onChange={e=>setCode(e.target.value)}/><small>Sign in with the designated owner email. This private one-time code activates owner access.</small></label>
  {error&&<p className="form-error" role="alert">{error}</p>}<button className="btn" disabled={busy}>{busy?'Checking…':'Unlock the dashboard'}<ArrowUpRight size={17}/></button></form>}

function ProductForm({draft,onClose,onSaved}:{draft:Draft,onClose:()=>void,onSaved:(p:OwnerProduct,isNew:boolean)=>void}){
 const [d,setD]=useState(draft),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const set=(key:keyof Draft)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>setD({...d,[key]:e.target.value});
 async function pick(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;try{const image=await shrink(file);setD(x=>({...x,image,preview:image}))}catch{setError('That photo could not be read. Try a JPEG or PNG.')}}
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');
  const {preview:_preview,id,price,...rest}=d;
  try{const {product}=await api<{product:OwnerProduct}>(id?'owner/products/'+id:'owner/products',id?'PUT':'POST',{...rest,price:num(price)});onSaved(product,!id)}
  catch(err){setError((err as Error).message)}finally{setBusy(false)}}
 return <><div className="overlay" onClick={onClose}/><form className="compare-modal product-form" role="dialog" aria-modal="true" aria-label={d.id?'Edit product':'Add product'} onSubmit={save}>
  <div className="drawer-head"><div><div className="eyebrow">{d.id?'EDIT PRODUCT':'NEW PRODUCT'}</div><h2>{d.name||'Add a product'}</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={19}/></button></div>
  <div className="field-grid">
   <label className="wide">Product name<input required maxLength={120} value={d.name} onChange={set('name')} placeholder="e.g. 1.5 Ton 5 Star Inverter Split AC"/></label>
   <label>Category<select value={d.category} onChange={e=>{const c=categories.find(x=>x.id===e.target.value)!;setD({...d,category:c.id,...(d.id?{}:{type:c.type,tag:c.tag})})}}>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label>Price in ₹<input inputMode="numeric" pattern="[0-9]*" value={d.price} onChange={set('price')} placeholder="Leave blank for “Enquire for price”"/><small>Customers can only order products that have a price.</small></label>
   <label>Brand<input maxLength={60} value={d.brand} onChange={set('brand')}/></label>
   <label>Model<input maxLength={80} value={d.model} onChange={set('model')}/></label>
   <label className="wide">Description<textarea rows={3} maxLength={600} value={d.description} onChange={set('description')}/></label>
   <div className="wide photo-field"><div className="photo-preview">{d.preview?<img src={d.preview} alt=""/>:<Art p={{name:d.name,type:d.type}}/>}</div><div><span>Photo</span><label className="chip-button"><ImagePlus size={15}/>{d.preview?'Change photo':'Upload a photo'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick}/></label>{d.preview&&<button type="button" className="chip-button" onClick={()=>setD({...d,image:null,preview:undefined})}><Trash2 size={15}/>Remove photo</button>}<small>Without a photo the site shows a drawing instead.</small>
    <label className="inline">Drawing<select value={d.type} onChange={set('type')}>{illustrations.map(i=><option key={i}>{i}</option>)}</select></label></div></div>
   <label className="check"><input type="checkbox" checked={d.inStock} onChange={e=>setD({...d,inStock:e.target.checked})}/>In stock</label>
   <label className="check"><input type="checkbox" checked={d.active} onChange={e=>setD({...d,active:e.target.checked})}/>Show on the website</label>
   <details className="wide"><summary>Buying guide and room label (optional)</summary><div className="field-grid">
    <label>Room label<input maxLength={40} value={d.tag} onChange={set('tag')} placeholder="e.g. Bedroom"/></label>
    <label>Good for<input maxLength={160} value={d.suits} onChange={set('suits')}/></label>
    <label>Size or capacity<input maxLength={160} value={d.sizes} onChange={set('sizes')}/></label>
    <label>Worth comparing in store<input maxLength={200} value={d.ask} onChange={set('ask')}/></label></div></details>
  </div>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <div className="compare-foot"><button className="btn" disabled={busy}>{busy?'Saving…':d.id?'Save changes':'Add product'}<ArrowUpRight size={17}/></button><button type="button" className="text-link" onClick={onClose}>Cancel</button></div></form></>}

export function OwnerPage(){
 const router=useRouter();
 const {user,userLoaded,ownerExists,shop,say}=useContext(Ctx);
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[tab,setTab]=useState<'orders'|'products'|'delivery'|'store'>('orders'),[editing,setEditing]=useState<Draft|null>(null),[statusFilter,setStatusFilter]=useState('all'),[prices,setPrices]=useState<Record<string,string>>({}),[fees,setFees]=useState<Record<number,string>>({}),[s,setS]=useState<Settings|null>(null),[brandText,setBrandText]=useState(''),[saving,setSaving]=useState(false);
 const isOwner=user?.role==='owner';
 useEffect(()=>{if(isOwner)api<Data>('owner/data').then(d=>{setData(d);setS(d.settings);setBrandText(d.settings.brands.join(', '))}).catch(e=>setError(e.message))},[isOwner]);
 const fail=(e:unknown)=>say((e as Error).message);

 if(!shop)return <section className="section inner-page empty"><div className="empty-art"><Lock size={26}/></div><h1>The dashboard<br/><span>needs a database.</span></h1><p>Connect a database to the project in Vercel to switch on ordering and this dashboard.</p></section>;
 if(!userLoaded)return <section className="section inner-page"><div className="skeleton account-skeleton"/></section>;
 if(!user)return <section className="section inner-page empty"><div className="empty-art"><Lock size={26}/></div><h1>Owner<br/><span>dashboard.</span></h1><p>Log in with the owner account to manage the shop.</p><Btn href="/account">Log in</Btn></section>;
 if(!isOwner)return <section className="section inner-page auth-page"><div><div className="eyebrow">OWNER DASHBOARD</div><h1>{ownerExists?<>Owner<br/><span>access only.</span></>:<>Set up<br/><span>your dashboard.</span></>}</h1><p>{ownerExists?'This shop already has an owner account. Log in with that account to manage it.':'Enter the owner setup code to take control of prices, products, orders and delivery charges.'}</p></div>{!ownerExists&&<Claim/>}</section>;
 if(error)return <section className="section inner-page empty"><h1>Could not load<br/><span>the dashboard.</span></h1><p>{error}</p></section>;
 if(!data||!s)return <section className="section inner-page"><div className="skeleton account-skeleton"/></section>;

 const {products,orders}=data,newOrders=orders.filter(o=>o.status==='new').length,shown=orders.filter(o=>statusFilter==='all'||o.status===statusFilter);
 const toDraft=(p:OwnerProduct):Draft=>({id:p.id,name:p.name,category:p.category,type:p.type,description:p.description,tag:p.tag,suits:p.suits,sizes:p.sizes,ask:p.ask,brand:p.brand??'',model:p.model??'',price:p.price===null?'':String(p.price),inStock:p.inStock,active:p.active,preview:p.image});
 const putProduct=async(p:OwnerProduct,change:Partial<OwnerProduct>)=>{try{const {image:_image,id,...rest}={...p,...change};const {product}=await api<{product:OwnerProduct}>('owner/products/'+id,'PUT',rest);setData(d=>d&&{...d,products:d.products.map(x=>x.id===id?product:x)});router.refresh();return true}catch(e){fail(e);return false}};
 const savePrice=async(p:OwnerProduct)=>{const raw=prices[p.id];if(raw===undefined)return;if(await putProduct(p,{price:num(raw)})){setPrices(({[p.id]:_done,...rest})=>rest);say('Price updated')}};
 const remove=async(p:OwnerProduct)=>{if(!confirm('Delete “'+p.name+'” from the website? This cannot be undone.'))return;try{await api('owner/products/'+p.id,'DELETE');setData(d=>d&&{...d,products:d.products.filter(x=>x.id!==p.id)});say('Product deleted')}catch(e){fail(e)}};
 const putOrder=async(o:Order,change:{status?:string,deliveryFee?:number|null})=>{try{const {order}=await api<{order:Order}>('owner/orders/'+o.id,'PUT',{status:o.status,deliveryFee:o.deliveryFee,...change});setData(d=>d&&{...d,orders:d.orders.map(x=>x.id===o.id?order:x)});say('Order updated')}catch(e){fail(e)}};
 const saveSettings=async()=>{setSaving(true);try{const next={...s,brands:brandText.split(',').map(b=>b.trim()).filter(Boolean)};const {settings}=await api<{settings:Settings}>('owner/settings','PUT',next);setS(settings);setData(d=>d&&{...d,settings});router.refresh();say('Saved. The website is updated.')}catch(e){fail(e)}finally{setSaving(false)}};
 const fee=(key:'ludhiana'|'punjab'|'other',label:string,hint:string)=><label>{label}<input inputMode="numeric" pattern="[0-9]*" placeholder="Blank = confirm after order" value={s.delivery[key]??''} onChange={e=>setS({...s,delivery:{...s.delivery,[key]:e.target.value.trim()===''?null:Number(e.target.value.replace(/\D/g,''))}})}/><small>{hint}</small></label>;

 return <section className="section inner-page owner-page"><div className="eyebrow">OWNER DASHBOARD</div><h1>Your shop,<br/><span>your rules.</span></h1>
  <div className="owner-stats"><div><strong>{newOrders}</strong><span>New orders</span></div><div><strong>{orders.length}</strong><span>Orders in total</span></div><div><strong>{products.filter(p=>p.active).length}</strong><span>Products on the site</span></div><div><strong>{products.filter(p=>p.active&&p.price===null).length}</strong><span>Without a price</span></div><div><strong>{data.customers}</strong><span>Customer accounts</span></div></div>
  <div className="filters owner-tabs" role="tablist">{([['orders','Orders'+(newOrders?' ('+newOrders+')':'')],['products','Products'],['delivery','Delivery charges'],['store','Store details']] as [typeof tab,string][]).map(([k,label])=><button key={k} role="tab" aria-selected={tab===k} className={tab===k?'selected':''} onClick={()=>setTab(k)}>{label}</button>)}</div>

  {tab==='orders'&&<><div className="filters small">{['all',...orderStatuses].map(st=><button key={st} className={statusFilter===st?'selected':''} onClick={()=>setStatusFilter(st)}>{st}</button>)}</div>
   {shown.length?<div className="order-list">{shown.map(o=><details className="order-card" key={o.id} open={o.status==='new'}><summary><span><strong>{o.code}</strong><small>{new Date(o.createdAt).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})} · {o.name} · {o.city}</small></span><span className={'status status-'+o.status.replace(/ /g,'-')}>{o.status}</span><strong>{rupees(o.subtotal+(o.deliveryFee??0))}</strong></summary>
    <OrderBody order={o}/>{o.note&&<p className="order-note">Note: {o.note}</p>}
    <div className="order-controls"><label>Status<select value={o.status} onChange={e=>putOrder(o,{status:e.target.value})}>{orderStatuses.map(st=><option key={st}>{st}</option>)}</select></label>
     <label>Delivery charge ₹<input inputMode="numeric" placeholder="Not set" value={fees[o.id]??(o.deliveryFee??'')} onChange={e=>setFees({...fees,[o.id]:e.target.value.replace(/\D/g,'')})}/></label>
     {fees[o.id]!==undefined&&<button className="chip-button on" onClick={async()=>{await putOrder(o,{deliveryFee:num(fees[o.id])});setFees(({[o.id]:_done,...rest})=>rest)}}>Save charge</button>}
     <a className="chip-button" href={'tel:'+o.phone}><Phone size={15}/>Call</a><a className="chip-button" target="_blank" rel="noreferrer" href={'https://wa.me/'+o.phone.replace(/\D/g,'').replace(/^(\d{10})$/,'91$1')+'?text='+encodeURIComponent('नमस्ते '+o.name+' जी, गुड प्राइस मेगा मार्ट से आपके ऑर्डर '+o.code+' के संबंध में संपर्क कर रहे हैं। कृपया अपनी सुविधा के अनुसार जवाब दें।')}><MessageCircle size={15}/>WhatsApp</a></div></details>)}</div>
   :<div className="order-none"><p>{orders.length?'No orders with this status.':'No orders yet. They will appear here as soon as a customer places one.'}</p></div>}</>}

  {tab==='products'&&<><div className="owner-toolbar"><p>Set a price to let customers order a product online. Products without a price show “Enquire for price”.</p><button className="btn" onClick={()=>setEditing(blank)}><Plus size={16}/>Add product</button></div>
   <div className="product-table">{products.map(p=><div className={'product-row'+(p.active?'':' hidden-row')} key={p.id}><div className="cart-art"><Art p={p}/></div>
    <div className="cart-name"><strong>{p.name}</strong><small>{catName(p.category)}{p.brand?' · '+p.brand:''}{p.model?' · '+p.model:''}</small><span className="row-flags">{!p.active&&<i><EyeOff size={11}/>Hidden</i>}{!p.inStock&&<i><PackageX size={11}/>Out of stock</i>}</span></div>
    <label className="price-cell">₹<input aria-label={'Price of '+p.name} inputMode="numeric" placeholder="No price" value={prices[p.id]??(p.price??'')} onChange={e=>setPrices({...prices,[p.id]:e.target.value.replace(/\D/g,'')})} onKeyDown={e=>{if(e.key==='Enter')savePrice(p)}}/>{prices[p.id]!==undefined&&<button className="chip-button on" onClick={()=>savePrice(p)}>Save</button>}</label>
    <label className="check"><input type="checkbox" checked={p.inStock} onChange={e=>putProduct(p,{inStock:e.target.checked})}/>In stock</label>
    <div className="row-actions"><button className="icon-button" aria-label={'Edit '+p.name} onClick={()=>setEditing(toDraft(p))}><Pencil size={16}/></button><button className="icon-button" aria-label={'Delete '+p.name} onClick={()=>remove(p)}><Trash2 size={16}/></button></div></div>)}
    {!products.length&&<div className="order-none"><p>No products yet. Add your first one.</p></div>}</div></>}

  {tab==='delivery'&&<div className="form-card settings-card"><h2>Delivery charges</h2><p className="form-hint">Customers see these on product pages, in the cart and at checkout. Leave a box blank and the site says “Confirmed by the store”; you can then set the charge on each order. Enter 0 for free delivery.</p>
   <div className="field-grid">{fee('ludhiana','Within Ludhiana (₹)','Orders where the city is Ludhiana.')}{fee('punjab','Rest of Punjab (₹)','Any other city in Punjab.')}{fee('other','Other states (₹)','Everywhere outside Punjab.')}
   <label className="wide">Note shown with the charges (optional)<textarea rows={2} maxLength={300} value={s.delivery.note} onChange={e=>setS({...s,delivery:{...s.delivery,note:e.target.value}})} placeholder="e.g. Installation is arranged separately."/></label></div>
   <button className="btn" disabled={saving} onClick={saveSettings}>{saving?'Saving…':'Save delivery charges'}<ArrowUpRight size={17}/></button></div>}

  {tab==='store'&&<div className="form-card settings-card"><h2>Opening hours</h2>
   <label className="check"><input type="checkbox" checked={!!s.hours} onChange={e=>setS({...s,hours:e.target.checked?{open:'10:00',close:'21:00',closedDays:[]}:null})}/>Show opening hours and an “Open now” badge</label>
   {s.hours&&<div className="field-grid"><label>Opens<input type="time" value={s.hours.open} onChange={e=>setS({...s,hours:{...s.hours!,open:e.target.value}})}/></label><label>Closes<input type="time" value={s.hours.close} onChange={e=>setS({...s,hours:{...s.hours!,close:e.target.value}})}/></label>
    <div className="wide day-picks"><span>Closed on</span>{days.map((d,i)=><label className="check" key={d}><input type="checkbox" checked={s.hours!.closedDays.includes(i)} onChange={e=>setS({...s,hours:{...s.hours!,closedDays:e.target.checked?[...s.hours!.closedDays,i]:s.hours!.closedDays.filter(x=>x!==i)}})}/>{d}</label>)}</div></div>}
   <h2>Brands you stock</h2><label>Brand names, separated by commas<input value={brandText} onChange={e=>setBrandText(e.target.value)} placeholder="e.g. LG, Samsung, Voltas"/><small>These scroll across the home page. Leave blank to show product categories instead.</small></label>
   <h2>Offers</h2><p className="form-hint">Each offer shows on the Offers page with a countdown, and disappears by itself when it ends.</p>
   {s.offers.map((o,i)=>{const edit=(change:Partial<typeof o>)=>setS({...s,offers:s.offers.map((x,j)=>j===i?{...x,...change}:x)});return <div className="offer-edit" key={i}><div className="field-grid"><label>Title<input maxLength={80} value={o.title} onChange={e=>edit({title:e.target.value})}/></label><label>Ends<input type="datetime-local" value={o.ends.slice(0,16)} onChange={e=>edit({ends:e.target.value})}/></label><label className="wide">Details<input maxLength={240} value={o.detail} onChange={e=>edit({detail:e.target.value})}/></label></div><button className="icon-button" aria-label="Remove offer" onClick={()=>setS({...s,offers:s.offers.filter((_,j)=>j!==i)})}><Trash2 size={16}/></button></div>})}
   <button className="chip-button" onClick={()=>setS({...s,offers:[...s.offers,{title:'',detail:'',ends:''}]})}><Plus size={15}/>Add an offer</button>
   <button className="btn" disabled={saving} onClick={saveSettings}>{saving?'Saving…':'Save store details'}<ArrowUpRight size={17}/></button></div>}

  <p className="owner-foot">Changes appear on the website straight away. <Link href="/">View the site</Link></p>
  {editing&&<ProductForm draft={editing} onClose={()=>setEditing(null)} onSaved={(p,isNew)=>{setData(d=>d&&{...d,products:isNew?[...d.products,p]:d.products.map(x=>x.id===p.id?p:x)});setEditing(null);router.refresh();say(isNew?'Product added':'Product saved')}}/>}
 </section>}
