// ═══════════════════════════════════════════════
//  I18N — Japanese subtitles for flash messages
// ═══════════════════════════════════════════════
const JP={
  // ── Gameplay ──
  'EXIT OPEN':             '出口が開いた',
  'REACH EXIT >>':         '出口へ向かえ！',
  'FIND THE SCREW!':       'スクリューを探せ！',
  'THE SCREW AWAITS':      'スクリューが待っている',
  'DEFEAT THE BOSS TO OPEN THE EXIT!': 'ボスを倒して出口を開け！',
  'EXTERMINATE ALL':       '全員倒せ！',

  // ── Boss ──
  '★ BOSS APPROACHES ★':  '★ ボス接近 ★',
  '★ BOSS SLAIN ★':       '★ ボス討伐！ ★',
  '★ PHASE 2 ★':          '★ 第2形態！ ★',
  'ENRAGED!':              '激怒！',
  'WHICH IS REAL??':       'どれが本物！？',
  '★ A DECOY! ★':         '★ デコイだ！ ★',
  'WATCH OUT!':            '気をつけろ！',

  // ── Monster house ──
  '!! MONSTER HOUSE !!':   '！！モンスターハウス！！',
  '!! CLEARED !!':         '！！クリア！！',
  '★ REVIVE ITEM DROPPED ★': '★ リバイスアイテム出現！ ★',

  // ── Cores ──
  'CORE DEVOURED!':        'コアが食われた！',
  'CORE EATEN!':           'コアが消えた！',

  // ── Weapons ──
  'DRIVER FOUND!':         'DRIVERを入手！',
  'DRIVER STILL ACTIVE!':  'DRIVERは引き継がれた',
  'DRIVER HIDDEN THIS FLOOR': 'このフロアにDRIVERあり',
  '3-WAY SHOT ACTIVE!':    '3方向ショット発動中',
  'OVERDRIVE FOUND!':      'OVERDRIVEを入手！',
  'OVERDRIVE STILL ACTIVE!': 'OVERDRIVEは引き継がれた',
  'VERTIDRIVE FOUND!':     'VERTIDRIVEを入手！',
  'VERTIDRIVE STILL ACTIVE!': 'VERTIDRIVEは引き継がれた',
  'BACK SHOT ACTIVE!':     '後方弾発動中',
  'LASER FOUND!':          'LASERを入手！',
  'LASER EXPIRED':         'LASERが消えた',
  'PIERCE SHOTS ACTIVE!':  '貫通弾発動中',
  'BARRIER FOUND!':        'バリアを入手！',

  // ── Player death / revive ──
  'P2 TURNED':             'P2がやられた！',
  'P3 TURNED':             'P3がやられた！',
  'P4 TURNED':             'P4がやられた！',
  'P2 REVIVED':            'P2が復活！',
  'P3 REVIVED':            'P3が復活！',
  'P4 REVIVED':            'P4が復活！',

  // ── Player states ──
  'DASH PARRY!':           'ダッシュパリィ！',
  'DASH RECHARGE UP!':     'ダッシュ回復速度アップ！',
  'PARRY!':                'パリィ！',
  'CHARGE!':               'チャージショット！',
  'CALLING ALLIES!':       '仲間を呼んだ！',
  'NO ALLIES':             '仲間がいない',
  'SHIELD BROKEN!':        'シールド破壊！',
  'BANISHED!':             '追放された！',

  // ── GK / boss ──
  'GK GRABBED!':           'GKに掴まれた！',
  'GK LOCKED!':            'GKが扉を封鎖！',

  // ── Enemy ──
  'IT SPLIT!':             '分裂した！',
  'ZOMBIE RISING':         'ゾンビが蘇る',
  'AAAAGGH!!':             'ぐわああ！！',

  // ── Tutorial ──
  'TUTORIAL COMPLETE!':    'チュートリアル完了！',
};

function jpSub(msg){
  // exact match
  const m=msg.trim();
  if(JP[m])return JP[m];
  // prefix match for dynamic messages (CORE 1/3, DEPTH 5, etc.)
  for(const k of Object.keys(JP)){
    if(m.startsWith(k))return JP[k];
  }
  return null;
}
