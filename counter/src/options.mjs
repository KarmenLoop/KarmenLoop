const imageOptions=Object.freeze({lang:['en','zh-CN'],theme:['light','dark'],motion:['animated','static']});
export function parseOptions(url){
  const allowed=url.pathname.endsWith('.gif')?imageOptions:{};
  for(const [key,value] of url.searchParams)
    if(!Object.hasOwn(allowed,key)||!allowed[key].includes(value)||url.searchParams.getAll(key).length!==1)
      throw Error('Unsupported image options');
  return {lang:url.searchParams.get('lang')||'en',theme:url.searchParams.get('theme')||'dark',animated:url.searchParams.get('motion')!=='static'};
}
