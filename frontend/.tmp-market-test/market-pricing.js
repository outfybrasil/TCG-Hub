"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMarketSearchKey = buildMarketSearchKey;
exports.lookupBrazilianMarketPrices = lookupBrazilianMarketPrices;
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const cheerio_1 = require("cheerio");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const CURL_BINARY = process.platform === 'win32' ? 'curl.exe' : 'curl';
const MYP_BASE_URL = 'https://mypcards.com';
const LIGA_BASE_URL = 'https://www.ligapokemon.com.br';
function buildMarketSearchKey(input) {
    return [
        input.cardName,
        input.cardSet,
        input.cardNumber,
        input.condition,
        input.finish,
        input.language,
    ]
        .filter(Boolean)
        .join('|')
        .toLowerCase()
        .trim();
}
async function lookupBrazilianMarketPrices(input) {
    const filters = normalizeFilters(input);
    const [mypCards, ligaPokemon] = await Promise.all([
        lookupMypCards(input, filters),
        lookupLigaPokemon(input),
    ]);
    const matchedOptions = [mypCards, ligaPokemon]
        .filter((site) => site.matchedPrice !== null)
        .sort((left, right) => (left.matchedPrice ?? Infinity) - (right.matchedPrice ?? Infinity));
    const availableOptions = [mypCards, ligaPokemon]
        .filter((site) => site.selectedPrice !== null)
        .sort((left, right) => (left.selectedPrice ?? Infinity) - (right.selectedPrice ?? Infinity));
    return {
        bestMatched: {
            store: matchedOptions[0]?.site ?? null,
            price: matchedOptions[0]?.matchedPrice ?? null,
        },
        bestAvailable: {
            store: availableOptions[0]?.site ?? null,
            price: availableOptions[0]?.selectedPrice ?? null,
            matchType: availableOptions[0]?.selectedMatchType ?? 'unavailable',
        },
        sites: {
            mypCards,
            ligaPokemon,
        },
        manualLinks: {
            mypCards: buildMypSearchUrl(input.cardNumber || input.cardName),
            ligaPokemon: buildLigaUrl(buildLigaSearchQuery(input)),
        },
        criteria: filters,
        fetchedAt: new Date().toISOString(),
    };
}
async function lookupMypCards(input, filters) {
    const product = await findBestMypProduct(input);
    if (!product) {
        return {
            site: 'MYP Cards',
            url: buildMypSearchUrl(input.cardNumber || input.cardName),
            matchedPrice: null,
            fallbackPrice: null,
            selectedPrice: null,
            selectedMatchType: 'unavailable',
            selectedVariantLabel: null,
            note: 'Carta nao encontrada no MYP.',
            offersCount: 0,
        };
    }
    try {
        const html = await fetchWithCurl(product.href);
        const offers = parseMypOffers(html);
        if (offers.length === 0) {
            return {
                site: 'MYP Cards',
                url: product.href,
                matchedPrice: null,
                fallbackPrice: null,
                selectedPrice: null,
                selectedMatchType: 'unavailable',
                selectedVariantLabel: null,
                note: 'Pagina encontrada, mas sem ofertas ativas.',
                offersCount: 0,
            };
        }
        const lowestOffer = [...offers].sort((left, right) => left.price - right.price)[0];
        const exactOffer = selectExactOffer(offers, filters);
        const partialOffer = exactOffer ? null : selectClosestOffer(offers, filters);
        const chosenOffer = exactOffer ?? partialOffer ?? lowestOffer;
        const chosenMatchType = exactOffer
            ? 'exact'
            : partialOffer
                ? 'partial'
                : 'lowest_available';
        return {
            site: 'MYP Cards',
            url: product.href,
            matchedPrice: exactOffer?.price ?? null,
            fallbackPrice: lowestOffer.price,
            selectedPrice: chosenOffer.price,
            selectedMatchType: chosenMatchType,
            selectedVariantLabel: describeOffer(chosenOffer),
            note: null,
            offersCount: offers.length,
        };
    }
    catch (error) {
        return {
            site: 'MYP Cards',
            url: product.href,
            matchedPrice: null,
            fallbackPrice: null,
            selectedPrice: null,
            selectedMatchType: 'unavailable',
            selectedVariantLabel: null,
            note: error instanceof Error ? error.message : 'Falha ao consultar o MYP.',
            offersCount: 0,
        };
    }
}
async function lookupLigaPokemon(input) {
    const fallbackUrl = buildLigaUrl(buildLigaSearchQuery(input));
    try {
        const candidate = await findBestLigaProduct(input);
        if (!candidate) {
            return {
                site: 'Liga Pokemon',
                url: fallbackUrl,
                matchedPrice: null,
                fallbackPrice: null,
                selectedPrice: null,
                selectedMatchType: 'unavailable',
                selectedVariantLabel: null,
                note: 'Carta nao encontrada na Liga Pokemon.',
                offersCount: 0,
                minPrice: null,
                avgPrice: null,
                maxPrice: null,
            };
        }
        const minPrice = candidate.minPrice;
        const avgPrice = candidate.avgPrice;
        const maxPrice = candidate.maxPrice;
        const selectedPrice = minPrice;
        return {
            site: 'Liga Pokemon',
            url: candidate.href,
            matchedPrice: null,
            fallbackPrice: selectedPrice,
            selectedPrice,
            selectedMatchType: selectedPrice !== null ? 'general' : 'unavailable',
            selectedVariantLabel: selectedPrice !== null
                ? [candidate.numericCode, candidate.setName || candidate.editionName].filter(Boolean).join(' | ')
                : null,
            note: selectedPrice !== null
                ? 'A Liga Pokemon nao expõe filtro por estado/acabamento nesta coleta.'
                : 'Carta encontrada na Liga Pokemon, mas sem precos ativos.',
            offersCount: selectedPrice !== null ? 1 : 0,
            minPrice,
            avgPrice,
            maxPrice,
        };
    }
    catch (error) {
        return {
            site: 'Liga Pokemon',
            url: fallbackUrl,
            matchedPrice: null,
            fallbackPrice: null,
            selectedPrice: null,
            selectedMatchType: 'unavailable',
            selectedVariantLabel: null,
            note: error instanceof Error ? error.message : 'Falha ao consultar a Liga Pokemon.',
            offersCount: 0,
            minPrice: null,
            avgPrice: null,
            maxPrice: null,
        };
    }
}
async function findBestMypProduct(input) {
    const queries = Array.from(new Set([
        input.cardNumber?.trim(),
        [input.cardName, input.cardNumber].filter(Boolean).join(' ').trim(),
        input.cardName.trim(),
    ].filter(Boolean)));
    let bestCandidate = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const query of queries) {
        const html = await fetchWithCurl(buildMypSearchUrl(query));
        const candidates = parseMypSearchCandidates(html);
        for (const candidate of candidates) {
            const score = scoreMypCandidate(candidate, input);
            if (score > bestScore) {
                bestCandidate = candidate;
                bestScore = score;
            }
        }
        if (bestScore >= 20) {
            break;
        }
    }
    return bestCandidate;
}
async function findBestLigaProduct(input) {
    const queries = Array.from(new Set([
        input.cardName.trim(),
        [input.cardName, input.cardNumber].filter(Boolean).join(' ').trim(),
        input.cardNumber?.trim(),
    ].filter(Boolean)));
    let bestCandidate = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const query of queries) {
        const html = await fetchWithCurl(buildLigaUrl(query));
        const candidates = parseLigaSearchCandidates(html);
        for (const candidate of candidates) {
            const score = scoreLigaCandidate(candidate, input);
            if (score > bestScore) {
                bestCandidate = candidate;
                bestScore = score;
            }
        }
        if (bestScore >= 20) {
            break;
        }
    }
    return bestCandidate;
}
function parseMypSearchCandidates(html) {
    const $ = (0, cheerio_1.load)(html);
    const candidates = [];
    $('li.stream-item .card').each((_, element) => {
        const card = $(element);
        const href = card.find('a.card-img-link').attr('href') || card.find('a.bt-offers').attr('href');
        const title = cleanText(card.find('.card-name h3').attr('title') || card.find('.card-name h3').text());
        const setName = cleanText(card.find('.card-edicao').attr('title') || card.find('.card-edicao').text());
        const dataId = cleanText(card.attr('data-ga-item-id') || '');
        if (!href || !title) {
            return;
        }
        candidates.push({
            title,
            setName,
            href: new URL(href, MYP_BASE_URL).toString(),
            dataId,
        });
    });
    return candidates;
}
function parseMypOffers(html) {
    const $ = (0, cheerio_1.load)(html);
    const offers = [];
    $('tr[data-key]').each((_, element) => {
        const row = $(element);
        const seller = cleanText(row.find('td.estoque-lista-nomevendedor').text());
        const finishLabel = cleanText(row.find('td.estoque-lista-nomeenfoil').text());
        const qualityCell = row.find('td.estoque-lista-qualidadenome').first();
        const languageLabel = cleanText(qualityCell.find('.flag-icon').attr('title') || '');
        const qualityClone = qualityCell.clone();
        qualityClone.find('.flag-icon, .foto-icon, img, svg, i').remove();
        const conditionLabel = cleanText(qualityClone.text());
        const quantity = parseInt(cleanText(row.find('td.estoque-lista-quantidadeestoque').text()).replace(/\D/g, ''), 10);
        const price = parseFirstPrice(row.find('td.estoque-lista-precoestoque').text());
        if (price === null) {
            return;
        }
        offers.push({
            seller,
            finishLabel: finishLabel || 'Normal',
            finishKey: normalizeFinish(finishLabel),
            conditionLabel,
            conditionKey: normalizeCondition(conditionLabel),
            languageLabel: languageLabel || 'Nao informado',
            languageKey: normalizeLanguage(languageLabel),
            quantity: Number.isFinite(quantity) ? quantity : null,
            price,
        });
    });
    return offers;
}
function parseLigaSearchCandidates(html) {
    const $ = (0, cheerio_1.load)(html);
    const candidates = [];
    $('.mtg-single').each((_, element) => {
        const item = $(element);
        const href = item.find('a.main-link-card').attr('href') || item.find('.mtg-name a').attr('href');
        const title = cleanText(item.find('.mtg-name a').first().text());
        const numericCode = cleanText(item.find('.mtg-numeric-code').first().text());
        const setName = cleanText(item.find('.mtg-set img').attr('title') ||
            item.find('.mtg-set img').attr('alt') ||
            '');
        const editionName = cleanText(item.find('.edition-name').first().text());
        const minPrice = parseFirstPrice(item.find('.price-min').first().text());
        const avgPrice = parseFirstPrice(item.find('.price-avg').first().text());
        const maxPrice = parseFirstPrice(item.find('.price-max').first().text());
        if (!href || !title) {
            return;
        }
        candidates.push({
            title,
            numericCode,
            setName,
            editionName,
            href: new URL(href, LIGA_BASE_URL).toString(),
            minPrice,
            avgPrice,
            maxPrice,
        });
    });
    return candidates;
}
function selectExactOffer(offers, filters) {
    const exactMatches = offers.filter((offer) => matchesOffer(offer, filters));
    if (exactMatches.length === 0) {
        return null;
    }
    return [...exactMatches].sort((left, right) => left.price - right.price)[0];
}
function selectClosestOffer(offers, filters) {
    const scored = offers
        .map((offer) => ({ offer, score: scoreOffer(offer, filters) }))
        .filter((item) => item.score > 0)
        .sort((left, right) => right.score - left.score || left.offer.price - right.offer.price);
    return scored[0]?.offer ?? null;
}
function matchesOffer(offer, filters) {
    if (filters.condition && offer.conditionKey !== filters.condition) {
        return false;
    }
    if (filters.finish && offer.finishKey !== filters.finish) {
        return false;
    }
    if (filters.language && offer.languageKey !== filters.language) {
        return false;
    }
    return true;
}
function scoreOffer(offer, filters) {
    let score = 0;
    if (filters.condition && offer.conditionKey === filters.condition) {
        score += 5;
    }
    if (filters.finish && offer.finishKey === filters.finish) {
        score += 4;
    }
    if (filters.language && offer.languageKey === filters.language) {
        score += 3;
    }
    return score;
}
function scoreMypCandidate(candidate, input) {
    const title = normalizeText(candidate.title);
    const setName = normalizeText(candidate.setName);
    const dataId = normalizeText(candidate.dataId);
    const cardName = normalizeText(input.cardName);
    const cardSet = normalizeText(input.cardSet || '');
    const cardNumber = normalizeText(input.cardNumber || '');
    let score = 0;
    if (cardNumber && title.includes(cardNumber)) {
        score += 8;
    }
    if (cardNumber && dataId.includes(cardNumber)) {
        score += 4;
    }
    if (cardName && title.includes(cardName)) {
        score += 7;
    }
    else if (cardName && cardName.split(' ').some((token) => token.length >= 4 && title.includes(token))) {
        score += 2;
    }
    if (cardSet && setName === cardSet) {
        score += 10;
    }
    else if (cardSet && setName && (setName.includes(cardSet) || cardSet.includes(setName))) {
        score += 5;
    }
    return score;
}
function scoreLigaCandidate(candidate, input) {
    const title = normalizeText(candidate.title);
    const setName = normalizeText(candidate.setName);
    const editionName = normalizeText(candidate.editionName);
    const cardName = normalizeText(input.cardName);
    const cardSet = normalizeText(input.cardSet || '');
    const candidateNumber = normalizeCardNumber(candidate.numericCode);
    const cardNumber = normalizeCardNumber(input.cardNumber || '');
    let score = 0;
    if (cardNumber && candidateNumber === cardNumber) {
        score += 12;
    }
    else if (cardNumber && candidateNumber && candidateNumber.startsWith(cardNumber.split('/')[0])) {
        score += 4;
    }
    if (cardName && title.includes(cardName)) {
        score += 8;
    }
    else if (cardName && cardName.split(' ').some((token) => token.length >= 4 && title.includes(token))) {
        score += 2;
    }
    if (cardSet && (setName === cardSet || editionName === cardSet)) {
        score += 10;
    }
    else if (cardSet && ((setName && (setName.includes(cardSet) || cardSet.includes(setName))) ||
        (editionName && (editionName.includes(cardSet) || cardSet.includes(editionName))))) {
        score += 5;
    }
    if (candidate.minPrice !== null) {
        score += 1;
    }
    return score;
}
async function fetchWithCurl(url) {
    const { stdout } = await execFileAsync(CURL_BINARY, [
        '-L',
        '--silent',
        '--show-error',
        '--compressed',
        '--max-time',
        '20',
        '-A',
        USER_AGENT,
        url,
    ], {
        maxBuffer: 8 * 1024 * 1024,
    });
    return stdout;
}
function normalizeFilters(input) {
    return {
        condition: normalizeCondition(input.condition),
        finish: normalizeFinish(input.finish),
        language: normalizeLanguage(input.language),
    };
}
function normalizeCondition(value) {
    const normalized = normalizeText(value);
    if (!normalized)
        return null;
    if (normalized === 'm' || normalized.includes('mint'))
        return 'mint';
    if (normalized.startsWith('nm') || normalized.includes('near mint') || normalized.includes('quase nova'))
        return 'nm';
    if (normalized.startsWith('lp') || normalized.startsWith('sp') || normalized.includes('lightly') || normalized.includes('pouco jogada'))
        return 'lp';
    if (normalized.startsWith('mp') || normalized.includes('moderately') || normalized.includes('muito jogada'))
        return 'mp';
    if (normalized.startsWith('hp') || normalized.includes('heavily') || normalized.includes('jogada demais'))
        return 'hp';
    if (normalized.startsWith('dmg') || normalized.includes('damaged'))
        return 'dmg';
    return normalized;
}
function normalizeFinish(value) {
    const normalized = normalizeText(value);
    if (!normalized || normalized === 'normal')
        return normalized ? 'normal' : null;
    if (normalized.includes('reverse'))
        return 'reverse_holo';
    if (normalized.includes('full art'))
        return 'full_art';
    if (normalized.includes('alternative') || normalized.includes('alt art'))
        return 'alt_art';
    if (normalized.includes('foil') || normalized.includes('holo'))
        return 'foil';
    return normalized;
}
function normalizeLanguage(value) {
    const normalized = normalizeText(value);
    if (!normalized)
        return null;
    if (normalized.includes('portugues'))
        return 'pt';
    if (normalized.includes('ingles') || normalized.includes('english'))
        return 'en';
    if (normalized.includes('japones') || normalized.includes('japanese'))
        return 'ja';
    if (normalized.includes('espanhol') || normalized.includes('spanish'))
        return 'es';
    return normalized;
}
function buildMypSearchUrl(query) {
    return `${MYP_BASE_URL}/pokemon?ProdutoSearch%5Bquery%5D=${encodeURIComponent(query)}`;
}
function buildLigaUrl(query) {
    return `${LIGA_BASE_URL}/?view=cards/card&card=${encodeURIComponent(query)}`;
}
function buildLigaSearchQuery(input) {
    return cleanText(input.cardName || input.cardNumber || '');
}
function parseFirstPrice(value) {
    if (!value) {
        return null;
    }
    const match = value.match(/R\$\s*([\d\.,]+)/);
    if (!match) {
        return null;
    }
    return parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
}
function describeOffer(offer) {
    return [offer.conditionLabel, offer.finishLabel, offer.languageLabel]
        .filter(Boolean)
        .join(' | ');
}
function normalizeCardNumber(value) {
    const normalized = normalizeText(value).replace(/[()#]/g, '');
    if (!normalized) {
        return '';
    }
    const matches = normalized.match(/\d+/g);
    if (!matches || matches.length === 0) {
        return normalized;
    }
    const parts = matches.slice(0, 2).map((part) => part.replace(/^0+(?=\d)/, ''));
    return parts.join('/');
}
function cleanText(value) {
    return value.replace(/\s+/g, ' ').trim();
}
function normalizeText(value) {
    return cleanText(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
