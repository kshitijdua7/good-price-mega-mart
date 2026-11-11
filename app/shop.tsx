'use client';
// Customer pages: cart, checkout and account.
import {useContext,useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Minus,Plus,Trash2,ShoppingBag,Truck,Check,MessageCircle,LogOut,LayoutDashboard,PackageCheck} from 'lucide-react';
import {states,zoneFor,type Order,type User} from './catalog-data';
import {Ctx,Art,Btn,api,rupees,orderable,feeLabel,waText,waPick} from './shared';

/** The three delivery zones and what each costs. */
export function DeliveryInfo(){
 const {t,settings}=useContext(Ctx),d=settings.delivery;
 return <div className="delivery-info"><div className="delivery-title"><Truck size={16}/>{t('Delivery is charged by distance')}</div>
  {([['Within Ludhiana',d.ludhiana],['Rest of Punjab',d.punjab],['Other states',d.other]] as [string,number|null][]).map(([zone,fee])=><div key={zone}><span>{t(zone)}</span><strong>{feeLabel(fee,t)}</strong></div>)}
  {d.note&&<p>{d.note}</p>}</div>}

function useCartLines(){
 const {cart,products}=useContext(Ctx);
 const lines=Object.entries(cart).map(([id,qty])=>({id,qty,product:products.find(p=>p.id===id)}));
 const ready=lines.filter(l=>orderable(l.product));
 return {lines,ready,subtotal:ready.reduce((sum,l)=>sum+l.product!.price!*l.qty,0)};
}

export function CartPage(){
 const {t,setQty}=useContext(Ctx),{lines,ready,subtotal}=useCartLines();
 if(!lines.length)return <section className="section inner-page empty"><div className="empty-art"><ShoppingBag size={26}/></div><h1>{t('Your cart')}<br/><span>{t('is empty.')}</span></h1><p>{t('Add products with a listed price to order them online.')}</p><Btn href="/shop">{t('Explore products')}</Btn></section>;
 return <section className="section inner-page cart-page"><div className="eyebrow">{t('YOUR ORDER')}</div><h1>{t('Your cart')}</h1>
  <div className="cart-layout"><ul className="cart-lines">{lines.map(({id,qty,product:p})=><li key={id} className={orderable(p)?'':'unavailable'}>
   <Link className="cart-art" href={'/product/'+id}>{p&&<Art p={p}/>}</Link>
   <div className="cart-name"><Link href={'/product/'+id}>{p?t(p.name):id}</Link><small>{orderable(p)?rupees(p!.price!)+' '+t('each'):t('No longer available to order')}</small></div>
   {orderable(p)&&<div className="stepper"><button aria-label="Decrease quantity" onClick={()=>setQty(id,qty-1)}><Minus size={14}/></button><span aria-live="polite">{qty}</span><button aria-label="Increase quantity" disabled={qty>=20} onClick={()=>setQty(id,qty+1)}><Plus size={14}/></button></div>}
   <strong className="cart-line-total">{orderable(p)?rupees(p!.price!*qty):''}</strong>
   <button className="cart-remove" aria-label={'Remove '+(p?.name??id)} onClick={()=>setQty(id,0)}><Trash2 size={16}/></button></li>)}</ul>
  <aside className="cart-summary"><div className="summary-row"><span>{t('Subtotal')}</span><strong>{rupees(subtotal)}</strong></div><div className="summary-row"><span>{t('Delivery')}</span><span>{t('Worked out at checkout')}</span></div><DeliveryInfo/>
   {ready.length?<Btn href="/checkout">{t('Go to checkout')}</Btn>:<p className="form-error">{t('Nothing in your cart can be ordered right now.')}</p>}<Link className="text-link" href="/shop">{t('Keep browsing')}</Link></aside></div></section>}

export function CheckoutPage(){
 const {t,user,settings,clearCart}=useContext(Ctx),{ready,subtotal}=useCartLines();
 const [requestId]=useState(()=>crypto.randomUUID());
 const [form,setForm]=useState({name:'',phone:'',address:'',city:'',state:'Punjab',pincode:'',note:''}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState<Order|null>(null);
 useEffect(()=>{if(user)setForm(f=>({...f,name:f.name||user.name,phone:f.phone||user.phone}))},[user]);
 const set=(key:keyof typeof form)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>setForm({...form,[key]:e.target.value});
 const zone=zoneFor(form.state,form.city),fee=settings.delivery[zone];
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');
  try{const {order}=await api<{order:Order}>('orders','POST',{...form,requestId,items:ready.map(l=>({id:l.id,qty:l.qty,expectedPrice:l.product!.price}))});setDone(order);clearCart();scrollTo({top:0})}
  catch(err){setError((err as Error).message)}finally{setBusy(false)}}
 if(done)return <section className="section inner-page order-done"><div className="done-mark"><PackageCheck size={30}/></div><div className="eyebrow">{t('ORDER RECEIVED')}</div><h1>{t('Thank you.')}<br/><span>{t('We’ve got your order.')}</span></h1>
  <p>{t('Your order number is')} <strong>{done.code}</strong>. {t('The showroom will call you to confirm stock, delivery and payment. No payment has been taken online.')}</p>
  <div className="order-card"><OrderBody order={done}/></div>
  <div className="done-actions"><Btn href={waText(waPick('Hello Good Price Mega Mart! I have sent order request '+done.code+' on your website. Please confirm stock, delivery charge and payment.','नमस्ते गुड प्राइस मेगा मार्ट! मैंने आपकी वेबसाइट पर ऑर्डर '+done.code+' का अनुरोध भेजा है। कृपया स्टॉक, डिलीवरी शुल्क और भुगतान की पुष्टि करें।','ਸਤ ਸ੍ਰੀ ਅਕਾਲ ਗੁੱਡ ਪ੍ਰਾਈਸ ਮੈਗਾ ਮਾਰਟ! ਮੈਂ ਤੁਹਾਡੀ ਵੈੱਬਸਾਈਟ ਉੱਤੇ ਆਰਡਰ '+done.code+' ਦੀ ਬੇਨਤੀ ਭੇਜੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਸਟਾਕ, ਡਿਲੀਵਰੀ ਖਰਚਾ ਅਤੇ ਭੁਗਤਾਨ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ।'))}>{t('Confirm on WhatsApp')}</Btn><a className="btn secondary" href={user?'/account':'/shop'}>{user?t('See my orders'):t('Keep browsing')}<ArrowUpRight size={17}/></a></div></section>;
 if(!ready.length)return <section className="section inner-page empty"><div className="empty-art"><ShoppingBag size={26}/></div><h1>{t('Your cart')}<br/><span>{t('is empty.')}</span></h1><Btn href="/shop">{t('Explore products')}</Btn></section>;
 return <section className="section inner-page checkout-page"><Link className="text-link" href="/cart">← {t('Back to cart')}</Link><h1>{t('Checkout')}</h1>
  <form className="cart-layout" onSubmit={submit}><div className="form-card"><h2>{t('Where should we deliver?')}</h2>
   {!user&&<p className="form-hint">{t('Ordering as a guest.')} <Link href="/account">{t('Log in')}</Link> {t('to keep track of your orders.')}</p>}
   <div className="field-grid"><label>{t('Full name')}<input required maxLength={80} autoComplete="name" value={form.name} onChange={set('name')}/></label>
   <label>{t('Phone number')}<input required type="tel" inputMode="tel" autoComplete="tel" pattern="\+?[0-9 -]{10,17}" value={form.phone} onChange={set('phone')}/></label>
   <label className="wide">{t('Address')}<textarea required maxLength={300} rows={3} autoComplete="street-address" value={form.address} onChange={set('address')}/></label>
   <label>{t('City')}<input required maxLength={60} autoComplete="address-level2" value={form.city} onChange={set('city')}/></label>
   <label>{t('State')}<select value={form.state} onChange={set('state')}>{states.map(s=><option key={s} value={s}>{t(s)}</option>)}</select></label>
   <label>{t('PIN code')}<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="postal-code" value={form.pincode} onChange={set('pincode')}/></label>
   <label className="wide">{t('Note for the showroom (optional)')}<textarea maxLength={500} rows={2} value={form.note} onChange={set('note')}/></label></div></div>
  <aside className="cart-summary"><h2>{t('Order summary')}</h2>{ready.map(l=><div className="summary-row" key={l.id}><span>{t(l.product!.name)} × {l.qty}</span><span>{rupees(l.product!.price!*l.qty)}</span></div>)}
   <div className="summary-row line"><span>{t('Subtotal')}</span><strong>{rupees(subtotal)}</strong></div>
   <div className="summary-row"><span>{t('Delivery')} · {t(zone==='ludhiana'?'Within Ludhiana':zone==='punjab'?'Rest of Punjab':'Other states')}</span><strong>{feeLabel(fee,t)}</strong></div>
   <div className="summary-row total"><span>{fee===null?t('Total before delivery'):t('Total')}</span><strong>{rupees(subtotal+(fee??0))}</strong></div>
   <p className="form-hint">{t('This is an order request. We will confirm stock, the delivery charge based on distance, and payment with you before dispatch. No payment is taken on this website.')}</p>
   {error&&<p className="form-error" role="alert">{error}</p>}
   <button className="btn" disabled={busy}>{busy?t('Sending request…'):t('Send order request')}<ArrowUpRight size={17}/></button></aside></form></section>}

/** Items, address and totals for one order. Used on the confirmation, account and owner pages. */
export function OrderBody({order}:{order:Order}){
 const {t}=useContext(Ctx);
 return <><ul className="order-items">{order.items.map(i=><li key={i.id}><span>{i.name} × {i.qty}</span><span>{rupees(i.price*i.qty)}</span></li>)}</ul>
  <div className="summary-row"><span>{t('Subtotal')}</span><span>{rupees(order.subtotal)}</span></div>
  <div className="summary-row"><span>{t('Delivery')}</span><span>{feeLabel(order.deliveryFee,t)}</span></div>
  <div className="summary-row total"><span>{order.deliveryFee===null?t('Total before delivery'):t('Total')}</span><strong>{rupees(order.subtotal+(order.deliveryFee??0))}</strong></div>
  <p className="order-address">{order.name} · {order.phone}<br/>{order.address}, {order.city}, {order.state} {order.pincode}</p></>}

export function AccountPage(){
 const {t,user,userLoaded,ownerExists,setUser,shop}=useContext(Ctx);
 const [mode,setMode]=useState<'login'|'signup'>('login'),[form,setForm]=useState({name:'',email:'',phone:'',password:'',ownerCode:''}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[orders,setOrders]=useState<Order[]|null>(null);
 useEffect(()=>{if(user)api<{orders:Order[]}>('orders').then(d=>setOrders(d.orders)).catch(()=>setOrders([]))},[user]);
 const set=(key:keyof typeof form)=>(e:React.ChangeEvent<HTMLInputElement>)=>setForm({...form,[key]:e.target.value});
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');
  try{const d=await api<{user:User}>('auth/'+mode,'POST',mode==='login'?{email:form.email,password:form.password}:form);setUser(d.user);setForm({name:'',email:'',phone:'',password:'',ownerCode:''})}
  catch(err){setError((err as Error).message)}finally{setBusy(false)}}
 async function logout(){await api('auth/logout','POST',{}).catch(()=>{});setUser(null);setOrders(null)}
 if(!shop)return <section className="section inner-page empty"><h1>{t('Accounts')}<br/><span>{t('are coming soon.')}</span></h1><Btn href="/shop">{t('Explore products')}</Btn></section>;
 if(!userLoaded)return <section className="section inner-page"><div className="skeleton account-skeleton"/></section>;
 if(!user)return <section className="section inner-page auth-page"><div><div className="eyebrow">{t('YOUR ACCOUNT')}</div><h1>{mode==='login'?t('Welcome back.'):t('Create your account.')}</h1><p>{t('Log in to order faster and keep track of your orders.')}</p></div>
  <form className="form-card" onSubmit={submit}><div className="auth-tabs" role="tablist"><button type="button" role="tab" aria-selected={mode==='login'} className={mode==='login'?'selected':''} onClick={()=>{setMode('login');setError('')}}>{t('Log in')}</button><button type="button" role="tab" aria-selected={mode==='signup'} className={mode==='signup'?'selected':''} onClick={()=>{setMode('signup');setError('')}}>{t('Sign up')}</button></div>
   {mode==='signup'&&<><label>{t('Full name')}<input required maxLength={80} autoComplete="name" value={form.name} onChange={set('name')}/></label><label>{t('Phone number')}<input required type="tel" inputMode="tel" autoComplete="tel" pattern="\+?[0-9 -]{10,17}" value={form.phone} onChange={set('phone')}/></label></>}
   <label>{t('Email')}<input required type="email" autoComplete="email" value={form.email} onChange={set('email')}/></label>
   {mode==='signup'&&form.email.trim().toLowerCase()==='kshitijdua22@gmail.com'&&<label>{t('Owner setup code')}<input required autoComplete="off" value={form.ownerCode} onChange={set('ownerCode')}/><small>{t('Use the private code provided for your store. It is required only when creating the owner account.')}</small></label>}
   <label>{t('Password')}<input required type="password" minLength={mode==='signup'?8:1} autoComplete={mode==='login'?'current-password':'new-password'} value={form.password} onChange={set('password')}/>{mode==='signup'&&<small>{t('At least 8 characters.')}</small>}</label>
   {error&&<p className="form-error" role="alert">{error}</p>}
   <button className="btn" disabled={busy}>{busy?t('Please wait…'):mode==='login'?t('Log in'):t('Create account')}<ArrowUpRight size={17}/></button></form></section>;
 return <section className="section inner-page account-page"><div className="eyebrow">{t('YOUR ACCOUNT')}</div><h1>{t('Hello,')}<br/><span>{user.name}.</span></h1>
  <div className="account-bar"><span>{user.email} · {user.phone}</span>{user.role==='owner'&&<Link className="chip-button on" href="/owner"><LayoutDashboard size={15}/>{t('Owner dashboard')}</Link>}{user.role!=='owner'&&!ownerExists&&<Link className="chip-button" href="/owner"><LayoutDashboard size={15}/>{t('Store owner? Set up the dashboard')}</Link>}<button className="chip-button" onClick={logout}><LogOut size={15}/>{t('Log out')}</button></div>
  <h2>{t('Your orders')}</h2>
  {orders===null?<div className="skeleton account-skeleton"/>:orders.length?<div className="order-list">{orders.map(o=><details className="order-card" key={o.id}><summary><span><strong>{o.code}</strong><small>{new Date(o.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</small></span><span className={'status status-'+o.status.replace(/ /g,'-')}>{o.status==='delivered'&&<Check size={12}/>}{t(o.status)}</span><strong>{rupees(o.subtotal+(o.deliveryFee??0))}</strong></summary><OrderBody order={o}/><a className="text-link" href={waText('नमस्ते गुड प्राइस मेगा मार्ट! मुझे अपने ऑर्डर '+o.code+' के बारे में जानकारी चाहिए। कृपया मदद करें।')}><MessageCircle size={15}/>{t('Ask about this order')}</a></details>)}</div>
   :<div className="order-none"><p>{t('You have not placed an order yet.')}</p><Btn href="/shop" secondary>{t('Explore products')}</Btn></div>}</section>}
