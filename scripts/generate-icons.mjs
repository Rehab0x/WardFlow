/**
 * 앱 아이콘 생성기 — 하나의 벡터 정의에서 favicon·PWA·iOS 아이콘을 모두 만든다.
 *
 *   npm run icons
 *
 * 마크는 "맥박이 그리는 W"다. 평평한 선으로 들어와 W를 그리고, 가운데 봉우리만
 * 높게 솟아 심전도처럼 읽힌다. 글자를 넣지 않아 16px에서도 형태가 남는다.
 *
 * 변형이 셋인 이유:
 *  - rounded : 브라우저 탭·PWA 일반 아이콘. 모서리를 우리가 직접 둥글린다
 *  - square  : iOS는 제 모양대로 마스킹하므로 모서리를 둥글리면 두 번 잘린다
 *  - maskable: 안드로이드 적응형 아이콘. 바깥 20%가 잘려도 마크가 남도록 줄인다
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const iconsDir = path.join(publicDir, 'icons');

/** 맥박이 그리는 W. 512 그리드 기준. */
const MARK_PATH = 'M92 178 L146 178 L200 378 L256 124 L312 378 L366 178 L420 178';

function buildSvg({ radius = 114, markScale = 1, border = true } = {}) {
  // 마스커블용으로 줄일 때도 중심은 그대로 두고 가운데를 기준으로 축소한다.
  const markTransform =
    markScale === 1
      ? ''
      : ` transform="translate(256 256) scale(${markScale}) translate(-256 -256)"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="60%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5eead4"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.6">
      <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#2dd4bf" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="${radius}" fill="url(#bg)"/>
  <rect width="512" height="512" rx="${radius}" fill="url(#glow)"/>
${border ? `  <rect x="3" y="3" width="506" height="506" rx="${Math.max(radius - 2, 0)}" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="6"/>\n` : ''}  <path d="${MARK_PATH}"${markTransform}
    fill="none" stroke="url(#mark)" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
}

const rounded = buildSvg();
const square = buildSvg({ radius: 0, border: false });
const maskable = buildSvg({ radius: 0, markScale: 0.72, border: false });

/** vite.config.ts의 manifest가 참조하는 크기들 */
const PWA_SIZES = [48, 72, 96, 128, 144, 152, 192, 384, 512];

async function render(svg, size, file) {
  await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
  return path.relative(root, file);
}

async function main() {
  await mkdir(iconsDir, { recursive: true });

  // 벡터 원본도 남겨 둔다 — 다시 그릴 때는 이 스크립트를 고친다.
  await writeFile(path.join(iconsDir, 'icon.svg'), rounded, 'utf8');

  const written = ['public/icons/icon.svg'];
  for (const size of PWA_SIZES) {
    written.push(await render(rounded, size, path.join(iconsDir, `icon-${size}x${size}.png`)));
  }
  written.push(
    await render(maskable, 512, path.join(iconsDir, 'icon-512x512-maskable.png')),
    await render(rounded, 32, path.join(publicDir, 'favicon-32x32.png')),
    await render(rounded, 16, path.join(publicDir, 'favicon-16x16.png')),
    // iOS는 자체 마스크를 씌우므로 모서리를 채운 정사각형을 준다.
    await render(square, 180, path.join(publicDir, 'apple-touch-icon.png'))
  );

  console.log(`아이콘 ${written.length}개 생성:\n  ${written.join('\n  ')}`);
}

await main();
