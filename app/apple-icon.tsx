import {ImageResponse} from 'next/og';
// Home-screen icon for iPhones, matching the gp logo.
export const size={width:180,height:180};
export const contentType='image/png';
export default function AppleIcon(){
 return new ImageResponse(<div style={{width:'100%',height:'100%',background:'#080a18',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',fontSize:120,fontWeight:600,letterSpacing:-14,color:'#f5f4f0',paddingBottom:18}}>
  g<span style={{color:'#bfb1ff'}}>p</span>
  <div style={{position:'absolute',right:30,top:30,width:16,height:16,borderRadius:8,background:'#bfb1ff'}}/>
 </div>,size);
}
