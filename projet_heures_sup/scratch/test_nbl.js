function nombreEnLettres(n) {
  const units = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
  const tens  = ['','','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];
  function below100(x) {
    if(x<20) return units[x];
    const t=Math.floor(x/10), u=x%10;
    if(t===7) return tens[t]+(u===1?'-et-':'-')+units[10+u];
    if(t===9) return tens[t]+(u>0?'-'+units[10+u]:'s');
    return tens[t]+(u===1&&t!==8?'-et-un':u>0?'-'+units[u]:(t===8?'s':''));
  }
  function below1000(x) {
    if(x<100) return below100(x);
    const h=Math.floor(x/100), r=x%100;
    return (h===1?'cent':units[h]+' cent')+(r>0?'-'+below100(r):(h>1?'s':''));
  }
  const num = Math.floor(n);
  const cents = Math.round((n-num)*100);
  if(num===0) return 'Zéro dirham';
  let str='';
  if(num>=1000) { const k=Math.floor(num/1000); str+=(k===1?'mille':below1000(k)+' mille')+' '; }
  const rem=num%1000;
  if(rem>0) str+=below1000(rem);
  str=str.trim()+' dirham'+(num>1?'s':'');
  if(cents>0) str+=' et '+below100(cents)+' centime'+(cents>1?'s':'');
  return str.charAt(0).toUpperCase()+str.slice(1);
}

console.log(nombreEnLettres(1090.00));
console.log(nombreEnLettres(719.40));
