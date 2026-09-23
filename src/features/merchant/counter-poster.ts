export type CounterPosterFormat = 'A4' | 'A5';

type CounterPosterInput = {
  format: CounterPosterFormat;
  merchantName: string;
  rewardName: string;
  threshold: number;
  joinUrl: string;
  qrDataUrl: string;
  logoUrl?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/** HTML autonome transmis au moteur d'impression natif Expo. */
export function buildCounterPosterHtml(input: CounterPosterInput): string {
  const merchantName = escapeHtml(input.merchantName);
  const rewardName = escapeHtml(input.rewardName);
  const joinUrl = escapeHtml(input.joinUrl);
  const logo = input.logoUrl
    ? `<img class="logo" src="${escapeHtml(input.logoUrl)}" alt="" />`
    : `<div class="logo fallback">W</div>`;
  const a4 = input.format === 'A4';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: ${input.format} portrait; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; height: 100%; }
    body { font-family: Arial, "Noto Sans Arabic", sans-serif; color: #101820; }
    .poster {
      width: 100%; min-height: 100vh; padding: ${a4 ? '7%' : '8%'}; display: flex;
      flex-direction: column; align-items: center; text-align: center;
      background: linear-gradient(155deg, #effbf4 0%, #ffffff 48%, #fff8df 100%);
      border: 10px solid #16a36a;
    }
    .brand { display: flex; align-items: center; gap: ${a4 ? '18px' : '14px'}; margin-bottom: 4%; }
    .logo { width: ${a4 ? '90px' : '74px'}; height: ${a4 ? '90px' : '74px'}; border-radius: 18px; object-fit: cover; }
    .fallback { display: grid; place-items: center; background: #16a36a; color: white;
      font-size: ${a4 ? '50px' : '42px'}; font-weight: 900; }
    .merchant { margin: 0; font-size: ${a4 ? '40px' : '34px'}; line-height: 1.1; font-weight: 900; }
    .title { margin: 2% 0 1%; color: #116940; font-size: ${a4 ? '30px' : '25px'}; font-weight: 800; }
    .reward { margin: 0 0 4%; font-size: ${a4 ? '21px' : '18px'}; line-height: 1.35; }
    .qr-shell { padding: 16px; background: white; border: 3px solid #101820;
      border-radius: 18px; }
    .qr { display: block; width: min(64vw, ${a4 ? '370px' : '310px'}); height: min(64vw, ${a4 ? '370px' : '310px'}); }
    .instruction { margin: 4% 0 1%; font-size: ${a4 ? '22px' : '19px'}; line-height: 1.35; font-weight: 800; }
    .arabic { margin: 0 0 3%; font-size: ${a4 ? '23px' : '20px'}; line-height: 1.5; font-weight: 800; }
    .url { margin-top: auto; max-width: 92%; font-size: 10px; line-height: 1.35;
      overflow-wrap: anywhere; color: #53606f; }
    .waffiy { margin-top: 2%; font-size: 13px; font-weight: 800; color: #16a36a; }
  </style>
</head>
<body>
  <main class="poster">
    <div class="brand">${logo}<h1 class="merchant">${merchantName}</h1></div>
    <p class="title">Votre fidélité est récompensée</p>
    <p class="reward">${rewardName} dès ${input.threshold} points</p>
    <div class="qr-shell"><img class="qr" src="${input.qrDataUrl}" alt="QR d'inscription" /></div>
    <p class="instruction">Scannez avec l’appareil photo de votre téléphone</p>
    <p class="arabic" lang="ar" dir="rtl">امسح الرمز بكاميرا هاتفك وانضم إلى برنامج الوفاء</p>
    <p class="url">${joinUrl}</p>
    <p class="waffiy">WAFFIY · Carte de fidélité numérique</p>
  </main>
</body>
</html>`;
}
