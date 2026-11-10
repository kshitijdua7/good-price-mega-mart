export type ProductSort = 'featured' | 'az' | 'za' | 'price-asc' | 'price-desc';
/** Products without a listed price stay at the end in both price directions. */
export function sortProducts<T extends {name:string;price:number|null}>(products: T[], sort: string): T[] {
 const nameOrder=(a:T,b:T)=>a.name.localeCompare(b.name,'en',{sensitivity:'base',numeric:true});
 return [...products].sort((a,b)=>{
  if(sort==='az')return nameOrder(a,b);
  if(sort==='za')return nameOrder(b,a);
  if(sort==='price-asc'||sort==='price-desc'){
   if(a.price===null&&b.price===null)return nameOrder(a,b);
   if(a.price===null)return 1;
   if(b.price===null)return -1;
   return (sort==='price-asc'?a.price-b.price:b.price-a.price)||nameOrder(a,b);
  }
  return 0;
 });
}
