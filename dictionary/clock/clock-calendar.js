/* Zeksa civil time. All durations are exact rational multiples of a pis.
 * Epoch: 2022-05-25 00:00:00 Asia/Shanghai, year label 1024.
 * A civil year is exactly 256 pis; no astronomical leap rule is assumed.
 */
(function (root) {
  'use strict';
  const EPOCH_MS = Date.parse('2022-05-25T00:00:00+08:00');
  const EPOCH_YEAR = 1024;
  const DAY_MS = 70560000;
  const YEAR_MS = DAY_MS * 256;
  const TICKS_PER_DAY = 65536;
  const zeksaMap = {
    a:'\uE001',á:'\uE002',e:'\uE003',é:'\uE004',i:'\uE005',í:'\uE006',o:'\uE007',ó:'\uE008',u:'\uE009',ú:'\uE00A',
    ä:'\uE00B',â:'\uE00C',ë:'\uE00D',ê:'\uE00E',ø:'\uE00F',ô:'\uE010',b:'\uE011',p:'\uE012',d:'\uE013',t:'\uE014',
    g:'\uE015',k:'\uE016',m:'\uE017',n:'\uE018',q:'\uE019',v:'\uE01A',f:'\uE01B',z:'\uE01C',s:'\uE01D',j:'\uE01E',
    c:'\uE01F',x:'\uE020',ts:'\uE021',h:'\uE022',ħ:'\uE023',l:'\uE024',r:'\uE025',w:'\uE026',y:'\uE027',
    '0':'\uE029','1':'\uE02A','2':'\uE02B','3':'\uE02C',',':'\uE032','.':'\uE033',"'":'\uE034','"':'\uE035',
    '!':'\uE036','?':'\uE037','/':'\uE038','[':'\uE039',']':'\uE03A'
  };
  function toPUA(value) {
    return String(value).normalize('NFC').toLowerCase().replace(/ts|[\s\S]/gu, token => zeksaMap[token] || token);
  }
  function base4(number, width = 0) { return number.toString(4).padStart(width, '0'); }
  function fromUnixMs(unixMs) {
    if (!Number.isSafeInteger(unixMs)) throw new RangeError('Timestamp must be an integer millisecond.');
    const elapsed = unixMs - EPOCH_MS;
    const elapsedDays = Math.floor(elapsed / DAY_MS);
    const remainderMs = elapsed - elapsedDays * DAY_MS;
    // Integer arithmetic avoids accumulated floating-point tick rounding.
    const ticks = Math.floor(remainderMs * TICKS_PER_DAY / DAY_MS);
    const yearOffset = Math.floor(elapsedDays / 256);
    const dayOfYear = elapsedDays - yearOffset * 256;
    const year = EPOCH_YEAR + yearOffset;
    const season = Math.floor(dayOfYear / 64);
    const month = Math.floor(dayOfYear / 16) % 4;
    const day = dayOfYear % 16;
    const hour = Math.floor(ticks / 4096);
    const minute = Math.floor(ticks / 64) % 64;
    const second = ticks % 64;
    const date = `${base4(year)} [${base4(season)}/${base4(month)}/${base4(day, 2)}]`;
    const time = `[${base4(hour, 2)}/${base4(minute, 3)}/${base4(second, 3)}]`;
    return {year,season,month,day,hour,minute,second,date,time,dayOfYear,elapsedDays,ticks,
      dayProgress: remainderMs / DAY_MS, yearProgress:(dayOfYear + remainderMs / DAY_MS) / 256};
  }
  const api = { EPOCH_MS,EPOCH_YEAR,DAY_MS,YEAR_MS,TICKS_PER_DAY,zeksaMap,toPUA,base4,fromUnixMs };
  root.ZeksaTime = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
