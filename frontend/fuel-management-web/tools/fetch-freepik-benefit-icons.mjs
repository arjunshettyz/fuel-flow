import fs from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.resolve(PROJECT_ROOT, 'src', 'assets', 'icons', 'benefits');

const ICON_SPECS = [
  { key: 'coverage', terms: ['globe', 'world', 'map'] },
  { key: 'search', terms: ['search', 'magnifying glass', 'find'] },
  { key: 'emergency', terms: ['clock', 'alarm', 'emergency'] },
  { key: 'pricing', terms: ['price tag', 'pricing', 'tag'] },
];

function pickHttpModule(url) {
  return url.startsWith('http://') ? http : https;
}

function request(url, { method = 'GET', headers = {}, maxRedirects = 5 } = {}) {
  return new Promise((resolve, reject) => {
    const mod = pickHttpModule(url);
    const req = mod.request(url, { method, headers }, (res) => {
      const statusCode = res.statusCode ?? 0;
      const location = res.headers.location;

      if (statusCode >= 300 && statusCode < 400 && location && maxRedirects > 0) {
        const nextUrl = new URL(location, url).toString();
        res.resume();
        request(nextUrl, { method, headers, maxRedirects: maxRedirects - 1 }).then(resolve, reject);
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({ statusCode, headers: res.headers, body });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function requestJson(url, headers) {
  const { statusCode, body } = await request(url, { headers });

  if (statusCode < 200 || statusCode >= 300) {
    const text = body.toString('utf8');
    throw new Error(`HTTP ${statusCode} for ${url}\n${text}`);
  }

  try {
    return JSON.parse(body.toString('utf8'));
  } catch (err) {
    throw new Error(`Failed to parse JSON from ${url}: ${err}`);
  }
}

function buildIconsSearchUrl(term) {
  const qs = new URLSearchParams();
  qs.set('term', term);
  qs.set('per_page', '50');
  qs.set('order', 'relevance');
  qs.set('filters[shape]', 'outline');
  qs.set('filters[free_svg]', 'free');
  return `https://api.freepik.com/v1/icons?${qs.toString()}`;
}

async function findFreeSvgIconId(apiKey, term) {
  const url = buildIconsSearchUrl(term);
  const json = await requestJson(url, {
    'x-freepik-api-key': apiKey,
    'accept': 'application/json',
    'accept-language': 'en-US',
  });

  const data = Array.isArray(json?.data) ? json.data : [];
  const match = data.find((item) => item?.free_svg === true) ?? data[0];
  const id = match?.id;

  if (typeof id !== 'number') {
    return null;
  }

  return id;
}

async function getSvgDownloadUrl(apiKey, iconId) {
  const url = `https://api.freepik.com/v1/icons/${iconId}/download?format=svg`;
  const json = await requestJson(url, {
    'x-freepik-api-key': apiKey,
    'accept': 'application/json',
    'accept-language': 'en-US',
  });

  const downloadUrl = json?.data?.url;
  if (typeof downloadUrl !== 'string' || downloadUrl.length === 0) {
    throw new Error(`No download URL returned for icon ${iconId}`);
  }

  return downloadUrl;
}

async function downloadSvg(downloadUrl) {
  const { statusCode, body, headers } = await request(downloadUrl, {
    headers: {
      'accept': 'image/svg+xml,application/octet-stream,*/*',
    },
  });

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`HTTP ${statusCode} downloading ${downloadUrl}`);
  }

  const contentType = String(headers['content-type'] ?? '').toLowerCase();
  if (contentType && !contentType.includes('svg') && body.length < 10) {
    throw new Error(`Unexpected content-type for SVG download: ${contentType}`);
  }

  return body;
}

function resolveApiKey() {
  const direct = process.env.FREEPIK_API_KEY;
  if (typeof direct === 'string' && direct.trim().length > 0) {
    return direct.trim();
  }

  return null;
}

async function main() {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.error('Missing FREEPIK_API_KEY.\n\nSet it in your shell, then run:\n  npm run fetch:freepik-icons');
    process.exit(1);
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  for (const spec of ICON_SPECS) {
    const outPath = path.join(OUTPUT_DIR, `${spec.key}.svg`);
    let iconId = null;

    for (const term of spec.terms) {
      process.stdout.write(`Searching Freepik icon for "${spec.key}" (term: ${term})... `);
      try {
        iconId = await findFreeSvgIconId(apiKey, term);
      } catch (err) {
        console.log('failed');
        console.error(String(err));
        continue;
      }

      if (iconId) {
        console.log(`found id ${iconId}`);
        break;
      }

      console.log('no match');
    }

    if (!iconId) {
      console.warn(`Skipping ${spec.key}: no icon found for any search term.`);
      continue;
    }

    process.stdout.write(`Downloading SVG for ${spec.key} (id: ${iconId})... `);
    try {
      const downloadUrl = await getSvgDownloadUrl(apiKey, iconId);
      const svg = await downloadSvg(downloadUrl);

      const tmpPath = `${outPath}.tmp`;
      await fs.writeFile(tmpPath, svg);
      await fs.rename(tmpPath, outPath);
      console.log('done');
    } catch (err) {
      console.log('failed');
      console.error(String(err));
    }
  }
}

await main();
