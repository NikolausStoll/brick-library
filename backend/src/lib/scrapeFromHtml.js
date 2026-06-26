import * as cheerio from 'cheerio';

const bestSrcFromImg = ($, el) => {
  const $el = $(el);
  if ($el.hasClass('zoomImg')) return null;

  const dataLarge = $el.attr('data-large_image');
  if (dataLarge) return dataLarge;

  const dataSrc = $el.attr('data-src');
  if (dataSrc) return dataSrc;

  const srcset = $el.attr('srcset');
  if (srcset) {
    let best = null;
    let bestW = 0;
    for (const entry of srcset.split(',')) {
      const parts = entry.trim().split(/\s+/);
      const w = parseInt(parts[1], 10) || 0;
      if (w > bestW) {
        bestW = w;
        best = parts[0];
      }
    }
    if (best) return best;
  }

  return $el.attr('src') || null;
};

export const normalizeContainerSelector = (containerSelector) =>
  containerSelector && !/^[.#\[\*>~+:,]/.test(containerSelector.trim())
    ? `.${containerSelector.trim()}`
    : containerSelector?.trim();

export const collectImageSources = async ({ pageUrl, containerSelector, rawHtml, baseUrl }) => {
  const normalizedSelector = normalizeContainerSelector(containerSelector);
  const hasUrlMode = pageUrl && normalizedSelector;
  const hasHtmlMode = rawHtml;

  if (!hasUrlMode && !hasHtmlMode) {
    return { error: 'Provide either pageUrl + containerSelector, or rawHtml', status: 400 };
  }

  let parsedBaseUrl = null;
  const baseUrlSource = baseUrl || pageUrl;
  if (baseUrlSource) {
    try {
      parsedBaseUrl = new URL(baseUrlSource);
    } catch {
      return { error: 'baseUrl / pageUrl is not a valid URL', status: 400 };
    }
  }

  let imgSrcs = [];

  if (hasHtmlMode) {
    const $ = cheerio.load(rawHtml);
    $('img').each((_, el) => {
      const src = bestSrcFromImg($, el);
      if (src) imgSrcs.push(src);
    });
  } else {
    let html;
    try {
      const response = await fetch(pageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      });
      if (!response.ok) {
        return { error: `Failed to fetch page: HTTP ${response.status}`, status: 502 };
      }
      html = await response.text();
    } catch (error) {
      return { error: `Failed to fetch page: ${error.message}`, status: 502 };
    }

    const $ = cheerio.load(html);
    const container = $(normalizedSelector);
    if (container.length === 0) {
      return { error: `Selector "${normalizedSelector}" matched no elements`, status: 400 };
    }
    container.find('img').each((_, el) => {
      const src = bestSrcFromImg($, el);
      if (src) imgSrcs.push(src);
    });
  }

  imgSrcs = [...new Set(imgSrcs)];

  if (imgSrcs.length === 0) {
    return { resolvedUrls: [], empty: true };
  }

  const resolvedUrls = imgSrcs
    .map((src) => {
      try {
        const parsed = new URL(src, parsedBaseUrl ?? undefined);
        parsed.search = '';
        return parsed.href;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return { resolvedUrls, empty: resolvedUrls.length === 0 };
};
