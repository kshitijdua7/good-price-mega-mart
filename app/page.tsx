import Store from './store';
import {getCatalog} from '@/lib/db';
// Rendered per request so price and product changes from the owner dashboard show immediately.
export const dynamic='force-dynamic';
export default async function Page(){return <Store page="home" catalog={await getCatalog()}/>}
