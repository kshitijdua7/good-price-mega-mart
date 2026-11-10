import type { Metadata } from 'next';
import './globals.css';
import './features.css';
import './commerce.css';
import './tunnel.css';
export const metadata: Metadata = { title: 'Good Price Mega Mart — A little upgrade. A whole new home.', description: 'Explore home appliances, kitchen essentials and everyday upgrades at Good Price Mega Mart, Gill Road, Ludhiana.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="en"><body>{children}</body></html>}
