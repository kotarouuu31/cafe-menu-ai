const fs = require('fs');
const path = require('path');

// SVGベースアイコンを作成
const createSVGIcon = () => {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="80" fill="url(#grad1)"/>
    <circle cx="256" cy="180" r="60" fill="white" opacity="0.9"/>
    <path d="M180 280 L332 280 C340 280 346 286 346 294 L346 380 C346 388 340 394 332 394 L180 394 C172 394 166 388 166 380 L166 294 C166 286 172 280 180 280 Z" fill="white" opacity="0.9"/>
    <circle cx="200" cy="320" r="12" fill="#2563eb"/>
    <circle cx="256" cy="320" r="12" fill="#2563eb"/>
    <circle cx="312" cy="320" r="12" fill="#2563eb"/>
    <path d="M200 350 L312 350 M220 370 L292 370" stroke="#2563eb" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
};

// アイコンサイズ設定
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// SVGファイルを保存
const svgContent = createSVGIcon();
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const svgPath = path.join(iconsDir, 'base-icon.svg');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(svgPath, svgContent);
console.log('✅ SVGアイコンを生成しました:', svgPath);

// PNG生成のための指示を出力
console.log('\n📋 次のステップ:');
console.log('以下のコマンドでPNGアイコンを生成してください:');
iconSizes.forEach(size => {
  console.log(`convert public/icons/base-icon.svg -resize ${size}x${size} public/icons/icon-${size}x${size}.png`);
});

console.log('\nImageMagickがインストールされていない場合:');
console.log('brew install imagemagick');
console.log('\nまたは、オンラインSVG→PNG変換ツールを使用してください。');
