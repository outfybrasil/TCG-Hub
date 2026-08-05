import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { load } from 'cheerio';
import { fetchWithBrowser } from '@/lib/browser-pool';
import {
    calculateTcgHubPriceIndex,
    type PriceObservation,
    type TcgHubPriceIndex,
} from '@/lib/tcg-hub-price-index';

const execFileAsync = promisify(execFile);

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const CURL_BINARY = process.platform === 'win32' ? 'curl.exe' : 'curl';
const MYP_BASE_URL = 'https://mypcards.com';
const LIGA_BASE_URL = 'https://www.ligapokemon.com.br';

export interface MarketLookupInput {
    cardName: string;
    cardNameEn?: string | null;
    cardSet?: string | null;
    cardSetEn?: string | null;
    cardNumber?: string | null;
    condition?: string | null;
    finish?: string | null;
    language?: string | null;
}

export function buildMarketSearchKey(input: MarketLookupInput): string {
    return [
        input.cardName,
        input.cardNameEn,
        input.cardSet,
        input.cardSetEn,
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

type MatchType = 'exact' | 'partial' | 'lowest_available' | 'general' | 'unavailable';

interface NormalizedFilters {
    condition: string | null;
    finish: string | null;
    language: string | null;
}

interface MypSearchCandidate {
    title: string;
    setName: string;
    href: string;
    dataId: string;
}

interface LigaSearchCandidate {
    title: string;
    numericCode: string;
    setName: string;
    editionName: string;
    href: string;
    minPrice: number | null;
    avgPrice: number | null;
    maxPrice: number | null;
}

interface MypOffer {
    seller: string;
    finishLabel: string;
    finishKey: string;
    conditionLabel: string;
    conditionKey: string;
    languageLabel: string;
    languageKey: string;
    quantity: number | null;
    price: number;
}

interface SitePriceResult {
    site: string;
    url: string;
    matchedPrice: number | null;
    fallbackPrice: number | null;
    selectedPrice: number | null;
    selectedMatchType: MatchType;
    selectedVariantLabel: string | null;
    note: string | null;
    offersCount: number;
}

export interface MarketLookupResult {
    hubIndex: TcgHubPriceIndex;
    bestMatched: {
        store: string | null;
        price: number | null;
    };
    bestAvailable: {
        store: string | null;
        price: number | null;
        matchType: MatchType;
    };
    sites: {
        mypCards: SitePriceResult;
        ligaPokemon: SitePriceResult & {
            minPrice: number | null;
            avgPrice: number | null;
            maxPrice: number | null;
        };
    };
    manualLinks: {
        mypCards: string;
        ligaPokemon: string;
    };
    criteria: {
        condition: string | null;
        finish: string | null;
        language: string | null;
    };
    fetchedAt: string;
}

export async function lookupBrazilianMarketPrices(input: MarketLookupInput): Promise<MarketLookupResult> {
    const filters = normalizeFilters(input);
    const [mypResult, ligaResult] = await Promise.allSettled([
        lookupMypCards(input, filters),
        lookupLigaPokemon(input),
    ]);
    const mypCards = mypResult.status === 'fulfilled'
        ? mypResult.value
        : unavailableSite('MYP Cards', buildMypSearchUrl(input.cardNumber || input.cardName), mypResult.reason);
    const ligaPokemon = ligaResult.status === 'fulfilled'
        ? ligaResult.value
        : {
            ...unavailableSite('Liga Pokemon', buildLigaUrl(buildLigaSearchQuery(input), input.condition, input.finish), ligaResult.reason),
            minPrice: null,
            avgPrice: null,
            maxPrice: null,
        };

    const matchedOptions = [mypCards, ligaPokemon]
        .filter((site) => site.matchedPrice !== null)
        .sort((left, right) => (left.matchedPrice ?? Infinity) - (right.matchedPrice ?? Infinity));
    const availableOptions = [mypCards, ligaPokemon]
        .filter((site) => site.selectedPrice !== null)
        .sort((left, right) => (left.selectedPrice ?? Infinity) - (right.selectedPrice ?? Infinity));

    const observations: PriceObservation[] = [];
    if (mypCards.selectedPrice !== null) {
        observations.push({ price: mypCards.selectedPrice, kind: 'trusted_listing', source: 'MYP Cards' });
    }
    // Liga publishes a market range. Each point is kept as an announcement,
    // never as a verified sale, so confidence remains deliberately conservative.
    if (ligaPokemon.minPrice !== null) {
        observations.push({ price: ligaPokemon.minPrice, kind: 'listing', source: 'Liga Pokemon - menor' });
    }
    if (ligaPokemon.avgPrice !== null) {
        observations.push({ price: ligaPokemon.avgPrice, kind: 'trusted_listing', source: 'Liga Pokemon - medio' });
    }
    if (ligaPokemon.maxPrice !== null) {
        observations.push({ price: ligaPokemon.maxPrice, kind: 'listing', source: 'Liga Pokemon - maior' });
    }

    return {
        hubIndex: calculateTcgHubPriceIndex(observations),
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
            ligaPokemon: buildLigaUrl(buildLigaSearchQuery(input), input.condition, input.finish),
        },
        criteria: filters,
        fetchedAt: new Date().toISOString(),
    };
}

function unavailableSite(site: string, url: string, error: unknown): SitePriceResult {
    const message = error instanceof Error ? error.message : String(error || 'falha desconhecida');
    console.warn(`[market-pricing] ${site} indisponivel: ${message}`);
    return {
        site,
        url,
        matchedPrice: null,
        fallbackPrice: null,
        selectedPrice: null,
        selectedMatchType: 'unavailable',
        selectedVariantLabel: null,
        note: 'Loja temporariamente indisponivel. Use o link para consultar diretamente.',
        offersCount: 0,
    };
}

async function lookupMypCards(
    input: MarketLookupInput,
    filters: NormalizedFilters
): Promise<SitePriceResult> {
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
        const sameVariantOffer = exactOffer ? null : selectFirstOfferWithSameConditionAndFinish(offers, filters);
        const partialOffer = exactOffer || sameVariantOffer ? null : selectClosestOffer(offers, filters);
        const chosenOffer = exactOffer ?? sameVariantOffer ?? partialOffer ?? lowestOffer;
        const chosenMatchType: MatchType = exactOffer
            ? 'exact'
            : sameVariantOffer
                ? 'partial'
            : partialOffer
                ? 'partial'
                : 'lowest_available';

        return {
            site: 'MYP Cards',
            url: product.href,
            matchedPrice: exactOffer?.price ?? sameVariantOffer?.price ?? null,
            fallbackPrice: lowestOffer.price,
            selectedPrice: chosenOffer.price,
            selectedMatchType: chosenMatchType,
            selectedVariantLabel: describeOffer(chosenOffer),
            note: sameVariantOffer
                ? 'Primeira oferta com a mesma qualidade e acabamento da carta.'
                : null,
            offersCount: offers.length,
        };
    } catch (error) {
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

async function lookupLigaPokemon(
    input: MarketLookupInput
): Promise<SitePriceResult & { minPrice: number | null; avgPrice: number | null; maxPrice: number | null }> {
    const fallbackUrl = buildLigaUrl(buildLigaSearchQuery(input), input.condition, input.finish);

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

        // Fetch the card page to get specific offers matching our condition
        const qualParam = getLigaConditionParam(input.condition);
        const fetchUrl = qualParam ? `${candidate.href}&qual=${qualParam}` : candidate.href;
        
        const cardHtml = await fetchWithBrowser(fetchUrl, { waitForSelector: '.container-price-mkp, .estoque-lista-precoestoque' });
        const summaries = parseLigaSummaries(cardHtml);
        
        let matchedPrice: number | null = null;
        let selectedExtraLabel: string | null = null;
        
        if (summaries.length > 0) {
            const inputFinishKey = input.finish ? normalizeFinish(input.finish) || 'normal' : 'normal';
            
            let match = summaries.find(s => (normalizeFinish(s.extra) || 'normal') === inputFinishKey);
            
            // Fallback to normal if requested foil/finish isn't available
            if (!match && inputFinishKey !== 'normal') {
                match = summaries.find(s => (normalizeFinish(s.extra) || 'normal') === 'normal');
            }
            if (!match) {
                match = summaries[0];
            }
            
            matchedPrice = match.minPrice ?? match.avgPrice;
            selectedExtraLabel = match.extra;
        }

        const minPrice = candidate.minPrice;
        const avgPrice = candidate.avgPrice;
        const maxPrice = candidate.maxPrice;
        
        // Final selection: matched NM price > summary min > summary avg
        const selectedPrice = matchedPrice ?? minPrice ?? avgPrice;

        return {
            site: 'Liga Pokemon',
            url: candidate.href,
            matchedPrice: matchedPrice,
            fallbackPrice: minPrice ?? avgPrice,
            selectedPrice,
            selectedMatchType: matchedPrice ? 'exact' : (selectedPrice !== null ? 'general' : 'unavailable'),
            selectedVariantLabel: selectedPrice !== null
                ? [candidate.numericCode, candidate.setName || candidate.editionName, selectedExtraLabel || 'Normal'].filter(Boolean).join(' | ')
                : null,
            note: matchedPrice 
                ? 'Preço Near Mint (NM) extraído diretamente das ofertas.'
                : (selectedPrice !== null 
                    ? 'Extração de NM falhou, usando resumo de preços da busca (Geral).'
                    : 'Carta encontrada na Liga Pokemon, mas sem precos ativos.'),
            offersCount: summaries.length || (selectedPrice !== null ? 1 : 0),
            minPrice,
            avgPrice,
            maxPrice,
        };
    } catch (error) {
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

async function findBestMypProduct(input: MarketLookupInput): Promise<MypSearchCandidate | null> {
    const queries = Array.from(new Set([
        input.cardNumber?.trim(),
        [input.cardName, input.cardNumber].filter(Boolean).join(' ').trim(),
        input.cardName.trim(),
    ].filter(Boolean) as string[]));

    let bestCandidate: MypSearchCandidate | null = null;
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

async function findBestLigaProduct(input: MarketLookupInput): Promise<LigaSearchCandidate | null> {
    const queries = Array.from(new Set([
        input.cardName.trim(),
        input.cardNameEn?.trim(),
        [input.cardNameEn || input.cardName, input.cardNumber].filter(Boolean).join(' ').trim(),
        input.cardNumber?.trim(),
    ].filter(Boolean) as string[]));

    let bestCandidate: LigaSearchCandidate | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const query of queries) {
        const url = buildLigaUrl(query, input.condition, input.finish);
        const html = await fetchWithBrowser(url, { waitForSelector: '.main-link-card, .mtg-single' });
        const candidates = parseLigaSearchCandidates(html);
        
        if (candidates.length === 0) {
            console.warn(`[liga] No candidates found for query "${query}", DOM may have changed.`);
        }

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

function parseMypSearchCandidates(html: string): MypSearchCandidate[] {
    const $ = load(html);
    const candidates: MypSearchCandidate[] = [];

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

function parseMypOffers(html: string): MypOffer[] {
    const $ = load(html);
    const offers: MypOffer[] = [];

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
            finishKey: normalizeFinish(finishLabel) || 'normal',
            conditionLabel,
            conditionKey: normalizeCondition(conditionLabel) || 'nm',
            languageLabel: languageLabel || 'Nao informado',
            languageKey: normalizeLanguage(languageLabel) || 'pt',
            quantity: Number.isFinite(quantity) ? quantity : null,
            price,
        });
    });

    return offers;
}

function parseLigaSearchCandidates(html: string): LigaSearchCandidate[] {
    const $ = load(html);
    let candidates: LigaSearchCandidate[] = [];

    // Strategy 1: Old list-view layout (.mtg-single)
    $('.mtg-single').each((_, element) => {
        const item = $(element);
        const href = item.find('a.main-link-card').attr('href') || item.find('.mtg-name a').attr('href');
        const title = cleanText(item.find('.mtg-name a').first().text());
        const numericCode = cleanText(item.find('.mtg-numeric-code').first().text());
        const setName = cleanText(
            item.find('.mtg-set img').attr('title') ||
            item.find('.mtg-set img').attr('alt') ||
            ''
        );
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

    // Strategy 2: New grid-view layout (.main-link-card tiles)
    if (candidates.length === 0) {
        $('a.main-link-card').each((_, element) => {
            const link = $(element);
            const href = link.attr('href');
            // In grid view, the card name is in a text node or nested div
            const titleEl = link.find('.mtg-name').first();
            const title = cleanText(
                titleEl.text() ||
                link.find('div').filter((__, el) => {
                    const text = $(el).text().trim();
                    return text.length > 2 && text.length < 100 && !text.includes('R$');
                }).first().text()
            );
            const numericCode = cleanText(link.find('.mtg-numeric-code').first().text());
            
            // Try to find prices from sibling or parent elements
            const container = link.closest('.grid-item, .card-tile, [class*="card"]').length > 0
                ? link.closest('.grid-item, .card-tile, [class*="card"]')
                : link.parent();
            const priceTexts = container.find('[class*="price"], [class*="valor"]');
            const allPriceValues: number[] = [];
            priceTexts.each((__, priceEl) => {
                const val = parseFirstPrice($(priceEl).text());
                if (val !== null) allPriceValues.push(val);
            });
            
            // Also check for price text directly in/near the link
            if (allPriceValues.length === 0) {
                const parentText = container.text();
                const priceMatches = parentText.match(/R\$\s*[\d\.,]+/g);
                if (priceMatches) {
                    for (const m of priceMatches) {
                        const val = parseFirstPrice(m);
                        if (val !== null) allPriceValues.push(val);
                    }
                }
            }

            if (!href || !title) {
                return;
            }

            candidates.push({
                title,
                numericCode,
                setName: '',
                editionName: '',
                href: new URL(href, LIGA_BASE_URL).toString(),
                minPrice: allPriceValues.length >= 1 ? Math.min(...allPriceValues) : null,
                avgPrice: allPriceValues.length >= 2 ? allPriceValues[Math.floor(allPriceValues.length / 2)] : (allPriceValues[0] ?? null),
                maxPrice: allPriceValues.length >= 1 ? Math.max(...allPriceValues) : null,
            });
        });
    }

    // Strategy 3: Last resort — find any card link with href containing "view=cards/card"
    if (candidates.length === 0) {
        $('a[href*="view=cards/card"]').each((_, element) => {
            const link = $(element);
            const href = link.attr('href');
            if (!href) return;
            
            const container = link.parent();
            const title = cleanText(link.attr('title') || link.text());
            if (!title || title.length < 2 || title.length > 150) return;

            const containerText = container.text();
            const priceMatches = containerText.match(/R\$\s*[\d\.,]+/g);
            const allPrices: number[] = [];
            if (priceMatches) {
                for (const m of priceMatches) {
                    const val = parseFirstPrice(m);
                    if (val !== null) allPrices.push(val);
                }
            }

            candidates.push({
                title,
                numericCode: '',
                setName: '',
                editionName: '',
                href: new URL(href, LIGA_BASE_URL).toString(),
                minPrice: allPrices.length >= 1 ? Math.min(...allPrices) : null,
                avgPrice: allPrices[0] ?? null,
                maxPrice: allPrices.length >= 1 ? Math.max(...allPrices) : null,
            });
        });

        // Deduplicate by href
        const seen = new Set<string>();
        candidates = candidates.filter(c => {
            if (seen.has(c.href)) return false;
            seen.add(c.href);
            return true;
        });
    }

    console.log(`[liga] parseLigaSearchCandidates found ${candidates.length} candidates`);
    return candidates;
}

function parseLigaSummaries(html: string) {
    const $ = load(html);
    const summaries: Array<{ extra: string; minPrice: number | null; avgPrice: number | null }> = [];
    
    $('.container-price-mkp').each((_, el) => {
        const block = $(el);
        const extraText = block.find('.container-extras span').text().trim();
        const minText = block.find('.min .price').text().trim();
        const avgText = block.find('.medium .price').text().trim();
        
        summaries.push({
            extra: extraText || 'Normal',
            minPrice: parseFirstPrice(minText),
            avgPrice: parseFirstPrice(avgText)
        });
    });
    
    return summaries;
}

function selectExactOffer(offers: MypOffer[], filters: NormalizedFilters): MypOffer | null {
    const exactMatches = offers.filter((offer) => matchesOffer(offer, filters));
    if (exactMatches.length === 0) {
        return null;
    }

    return [...exactMatches].sort((left, right) => left.price - right.price)[0];
}

function selectFirstOfferWithSameConditionAndFinish(
    offers: MypOffer[],
    filters: NormalizedFilters
): MypOffer | null {
    const matches = offers.filter((offer) => {
        if (filters.condition && offer.conditionKey !== filters.condition) {
            return false;
        }
        if (filters.finish && offer.finishKey !== filters.finish) {
            return false;
        }

        return Boolean(filters.condition || filters.finish);
    });

    return matches[0] ?? null;
}

function selectClosestOffer(offers: MypOffer[], filters: NormalizedFilters): MypOffer | null {
    const scored = offers
        .map((offer) => ({ offer, score: scoreOffer(offer, filters) }))
        .filter((item) => item.score > 0)
        .sort((left, right) => right.score - left.score || left.offer.price - right.offer.price);

    return scored[0]?.offer ?? null;
}

function matchesOffer(offer: MypOffer, filters: NormalizedFilters): boolean {
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

function scoreOffer(offer: MypOffer, filters: NormalizedFilters): number {
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

function scoreMypCandidate(candidate: MypSearchCandidate, input: MarketLookupInput): number {
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
    } else if (cardName && cardName.split(' ').some((token) => token.length >= 4 && title.includes(token))) {
        score += 2;
    }
    if (cardSet && setName === cardSet) {
        score += 10;
    } else if (cardSet && setName && (setName.includes(cardSet) || cardSet.includes(setName))) {
        score += 5;
    }

    return score;
}

function scoreLigaCandidate(candidate: LigaSearchCandidate, input: MarketLookupInput): number {
    const title = normalizeText(candidate.title);
    const setName = normalizeText(candidate.setName);
    const editionName = normalizeText(candidate.editionName);
    
    const cardName = normalizeText(input.cardName);
    const cardNameEn = normalizeText(input.cardNameEn || '');
    const cardSet = normalizeText(input.cardSet || '');
    const cardSetEn = normalizeText(input.cardSetEn || '');
    
    const candidateNumber = normalizeCardNumber(candidate.numericCode);
    const cardNumber = normalizeCardNumber(input.cardNumber || '');

    let score = 0;

    // Number matching is highest weight
    if (cardNumber && candidateNumber === cardNumber) {
        score += 15;
    } else if (cardNumber && candidateNumber && candidateNumber.startsWith(cardNumber.split('/')[0])) {
        score += 5;
    }

    // Name matching
    if (cardName && title.includes(cardName)) {
        score += 8;
    } else if (cardNameEn && title.includes(cardNameEn)) {
        score += 8;
    }

    // Set matching
    if (cardSet && (setName === cardSet || editionName === cardSet)) {
        score += 10;
    } else if (cardSetEn && (setName === cardSetEn || editionName === cardSetEn)) {
        score += 10;
    } else if (cardSet && (
        (setName && (setName.includes(cardSet) || cardSet.includes(setName))) ||
        (editionName && (editionName.includes(cardSet) || cardSet.includes(editionName)))
    )) {
        score += 4;
    }

    if (candidate.minPrice !== null) {
        score += 1;
    }

    return score;
}

async function fetchWithCurl(url: string): Promise<string> {
    const { stdout } = await execFileAsync(
        CURL_BINARY,
        [
            '-L',
            '--silent',
            '--show-error',
            '--compressed',
            '--max-time',
            '20',
            '-A',
            USER_AGENT,
            url,
        ],
        {
            maxBuffer: 8 * 1024 * 1024,
        }
    );

    return stdout;
}

function normalizeFilters(input: MarketLookupInput): NormalizedFilters {
    return {
        condition: normalizeCondition(input.condition),
        finish: normalizeFinish(input.finish),
        language: normalizeLanguage(input.language),
    };
}

function normalizeCondition(value?: string | null): string | null {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    if (normalized === 'm' || normalized.includes('mint')) return 'm';
    if (normalized.startsWith('nm') || normalized.includes('near mint') || normalized.includes('quase nova')) return 'nm';
    if (normalized.startsWith('lp') || normalized.startsWith('sp') || normalized.includes('lightly') || normalized.includes('pouco jogada')) return 'sp';
    if (normalized.startsWith('mp') || normalized.includes('moderately') || normalized.includes('muito jogada')) return 'mp';
    if (normalized.startsWith('hp') || normalized.includes('heavily') || normalized.includes('jogada demais')) return 'hp';
    if (normalized.startsWith('d') || normalized.includes('damaged') || normalized.includes('danificada')) return 'd';
    return normalized;
}

function normalizeFinish(value?: string | null): string | null {
    const normalized = normalizeText(value);
    if (!normalized || normalized === 'normal') return 'normal';
    if (normalized.includes('reverse')) return 'reverse_holo';
    if (normalized.includes('full art')) return 'full_art';
    if (normalized.includes('alternative') || normalized.includes('alt art') || normalized.includes('alt')) return 'alt_art';
    if (normalized.includes('foil') || normalized.includes('holo')) return 'foil';
    return normalized;
}

function normalizeLanguage(value?: string | null): string | null {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    if (normalized.includes('portugues')) return 'pt';
    if (normalized.includes('ingles') || normalized.includes('english')) return 'en';
    if (normalized.includes('japones') || normalized.includes('japanese')) return 'ja';
    if (normalized.includes('espanhol') || normalized.includes('spanish')) return 'es';
    return normalized;
}

function buildMypSearchUrl(query: string): string {
    return `${MYP_BASE_URL}/pokemon?ProdutoSearch%5Bquery%5D=${encodeURIComponent(query)}`;
}

function getLigaConditionParam(condition?: string | null): string {
    const norm = normalizeCondition(condition);
    switch (norm) {
        case 'm':
        case 'nm': return '1';
        case 'sp': return '2';
        case 'mp': return '3';
        case 'hp': return '4';
        case 'd': return '5';
        default: return '';
    }
}

function getLigaFinishParam(finish?: string | null): string {
    const norm = normalizeFinish(finish);
    if (norm === 'foil' || norm === 'reverse_holo') {
        return '1';
    }
    return '';
}

function buildLigaUrl(query: string, condition?: string | null, finish?: string | null): string {
    let url = `${LIGA_BASE_URL}/?view=cards/card&card=${encodeURIComponent(query)}`;
    
    const qualParam = getLigaConditionParam(condition);
    if (qualParam) url += `&qual=${qualParam}`;
    
    const encParam = getLigaFinishParam(finish);
    if (encParam) url += `&enc=${encParam}`;

    return url;
}

function buildLigaSearchQuery(input: MarketLookupInput): string {
    const name = input.cardName || '';
    const num = formatCardNumberForSearch(input.cardNumber);
    if (!name) return num;
    if (!num) return name;
    return `${name} ${num}`;
}

function formatCardNumberForSearch(value?: string | null): string {
    if (!value) return '';
    // Remove # and parentheses
    let cleaned = value.replace(/[()#]/g, '').trim();
    
    // Handle split numbers like 056/94 -> 056/094
    const parts = cleaned.split('/');
    if (parts.length === 2) {
        return parts.map(p => {
            const trimmed = p.trim();
            // Pad to 3 digits only if it's purely numeric
            if (/^\d+$/.test(trimmed)) {
                return trimmed.padStart(3, '0');
            }
            return trimmed;
        }).join('/');
    }
    
    return cleaned;
}

function parseFirstPrice(value?: string | null): number | null {
    if (!value) {
        return null;
    }

    const match = value.match(/R\$\s*([\d\.,]+)/);
    if (!match) {
        return null;
    }

    return parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
}

function describeOffer(offer: MypOffer): string {
    return [offer.conditionLabel, offer.finishLabel, offer.languageLabel]
        .filter(Boolean)
        .join(' | ');
}

function normalizeCardNumber(value?: string | null): string {
    const normalized = normalizeText(value).replace(/[()#]/g, '').trim();
    if (!normalized) {
        return '';
    }

    const matches = normalized.match(/\d+/g);
    if (!matches || matches.length === 0) {
        return normalized;
    }

    // For comparison, we always remove leading zeros to match 056/094 with 56/94
    const parts = matches.slice(0, 2).map((part) => part.replace(/^0+(?=\d)/, '') || '0');
    return parts.join('/');
}

function cleanText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

function normalizeText(value?: string | null): string {
    return cleanText(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
