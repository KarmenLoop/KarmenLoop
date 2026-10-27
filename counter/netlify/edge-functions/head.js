import { headers } from '../../src/handler.mjs';
import { parseOptions } from '../../src/options.mjs';

// The CDN's origin proxy turns HEAD into GET. Answer at the edge before that
// conversion, so metadata checks never become counting image requests.
export default function head(request){
  if(request.method!=='HEAD')return;
  try{parseOptions(new URL(request.url));}
  catch{return new Response(null,{status:400,headers});}
  return new Response(null,{headers:{...headers,'Content-Type':'image/gif','X-Counter-Mode':'head'}});
}
export const config={path:['/profile.gif','/preview.gif']};
