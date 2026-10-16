import worker from '../dist/server/index.js';
// Keep provider keys in the Vercel server environment, never browser assets.
export default async function handler(req,res){
 try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>32000){res.statusCode=413;res.end('Request too large');return}chunks.push(chunk)}
 const path=req.url||'/';const request=new Request('https://khao.internal'+path,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
 const response=await worker.fetch(request,process.env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.statusCode=500;res.end('Internal server error')}
}
