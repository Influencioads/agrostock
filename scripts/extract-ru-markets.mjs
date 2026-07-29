#!/usr/bin/env node
/**
 * Pulls wholesale agricultural markets in Russia out of Google Places and
 * writes them to `data/markets/ru-wholesale.{csv,json}` for review.
 *
 *   node scripts/extract-ru-markets.mjs --pilot        # 3 cities, ~12 requests
 *   node scripts/extract-ru-markets.mjs                # every city below
 *   node scripts/extract-ru-markets.mjs --pages 2      # also fetch page 2 (2x cost)
 *
 * Places Text Search bills per request (~$32/1000), so the city list is the
 * cost knob: cities × queries × pages. Results are deduped on place_id and
 * nothing is written to the database — this produces a file to eyeball.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const KEY = (readFileSync('.env', 'utf8').match(/^GOOGLE_MAPS_API_KEY=(.*)$/m)?.[1] ?? '').trim();
if (!KEY) throw new Error('GOOGLE_MAPS_API_KEY is not set in .env');

/**
 * Query terms, in Russian, because that is how these places are named on the
 * map. English terms return the tourist food halls instead of the trade yards.
 */
const QUERIES = [
  'оптовый продовольственный рынок',
  'плодоовощная база оптовая',
  'сельскохозяйственный рынок',
  'оптовая база продуктов питания',
];

/** Regional centres + the million-plus cities; `region` is the federal subject. */
const CITIES = [
  ['Москва', 'Москва'],
  ['Санкт-Петербург', 'Санкт-Петербург'],
  ['Новосибирск', 'Новосибирская область'],
  ['Екатеринбург', 'Свердловская область'],
  ['Казань', 'Республика Татарстан'],
  ['Нижний Новгород', 'Нижегородская область'],
  ['Челябинск', 'Челябинская область'],
  ['Самара', 'Самарская область'],
  ['Омск', 'Омская область'],
  ['Ростов-на-Дону', 'Ростовская область'],
  ['Уфа', 'Республика Башкортостан'],
  ['Красноярск', 'Красноярский край'],
  ['Воронеж', 'Воронежская область'],
  ['Волгоград', 'Волгоградская область'],
  ['Краснодар', 'Краснодарский край'],
  ['Саратов', 'Саратовская область'],
  ['Тюмень', 'Тюменская область'],
  ['Тольятти', 'Самарская область'],
  ['Ижевск', 'Удмуртская Республика'],
  ['Барнаул', 'Алтайский край'],
  ['Ульяновск', 'Ульяновская область'],
  ['Иркутск', 'Иркутская область'],
  ['Хабаровск', 'Хабаровский край'],
  ['Владивосток', 'Приморский край'],
  ['Ярославль', 'Ярославская область'],
  ['Махачкала', 'Республика Дагестан'],
  ['Томск', 'Томская область'],
  ['Оренбург', 'Оренбургская область'],
  ['Кемерово', 'Кемеровская область'],
  ['Новокузнецк', 'Кемеровская область'],
  ['Рязань', 'Рязанская область'],
  ['Астрахань', 'Астраханская область'],
  ['Набережные Челны', 'Республика Татарстан'],
  ['Пенза', 'Пензенская область'],
  ['Липецк', 'Липецкая область'],
  ['Киров', 'Кировская область'],
  ['Чебоксары', 'Чувашская Республика'],
  ['Тула', 'Тульская область'],
  ['Калининград', 'Калининградская область'],
  ['Курск', 'Курская область'],
  ['Ставрополь', 'Ставропольский край'],
  ['Улан-Удэ', 'Республика Бурятия'],
  ['Сочи', 'Краснодарский край'],
  ['Тверь', 'Тверская область'],
  ['Магнитогорск', 'Челябинская область'],
  ['Иваново', 'Ивановская область'],
  ['Брянск', 'Брянская область'],
  ['Белгород', 'Белгородская область'],
  ['Сургут', 'Ханты-Мансийский АО'],
  ['Владимир', 'Владимирская область'],
  ['Нижний Тагил', 'Свердловская область'],
  ['Архангельск', 'Архангельская область'],
  ['Чита', 'Забайкальский край'],
  ['Симферополь', 'Республика Крым'],
  ['Калуга', 'Калужская область'],
  ['Смоленск', 'Смоленская область'],
  ['Волжский', 'Волгоградская область'],
  ['Курган', 'Курганская область'],
  ['Череповец', 'Вологодская область'],
  ['Орёл', 'Орловская область'],
  ['Саранск', 'Республика Мордовия'],
  ['Якутск', 'Республика Саха (Якутия)'],
  ['Владикавказ', 'Республика Северная Осетия'],
  ['Подольск', 'Московская область'],
  ['Грозный', 'Чеченская Республика'],
  ['Мурманск', 'Мурманская область'],
  ['Тамбов', 'Тамбовская область'],
  ['Петрозаводск', 'Республика Карелия'],
  ['Кострома', 'Костромская область'],
  ['Нижневартовск', 'Ханты-Мансийский АО'],
  ['Новороссийск', 'Краснодарский край'],
  ['Йошкар-Ола', 'Республика Марий Эл'],
  ['Стерлитамак', 'Республика Башкортостан'],
  ['Нальчик', 'Кабардино-Балкарская Республика'],
  ['Таганрог', 'Ростовская область'],
  ['Сыктывкар', 'Республика Коми'],
  ['Псков', 'Псковская область'],
  ['Великий Новгород', 'Новгородская область'],
  ['Благовещенск', 'Амурская область'],
  ['Абакан', 'Республика Хакасия'],
  ['Южно-Сахалинск', 'Сахалинская область'],
  ['Вологда', 'Вологодская область'],
  ['Северодвинск', 'Архангельская область'],
  ['Армавир', 'Краснодарский край'],
  ['Пятигорск', 'Ставропольский край'],
  ['Балашиха', 'Московская область'],
  ['Хасавюрт', 'Республика Дагестан'],
  ['Элиста', 'Республика Калмыкия'],
  ['Майкоп', 'Республика Адыгея'],
  ['Черкесск', 'Карачаево-Черкесская Республика'],
  ['Магас', 'Республика Ингушетия'],
  ['Кызыл', 'Республика Тыва'],
  ['Горно-Алтайск', 'Республика Алтай'],
  ['Биробиджан', 'Еврейская АО'],
  ['Анадырь', 'Чукотский АО'],
  ['Салехард', 'Ямало-Ненецкий АО'],
  ['Ханты-Мансийск', 'Ханты-Мансийский АО'],
  ['Нарьян-Мар', 'Ненецкий АО'],
  ['Петропавловск-Камчатский', 'Камчатский край'],
  ['Магадан', 'Магаданская область'],
];

/**
 * Retail groceries dominate these searches, so anything that is only a shop is
 * dropped. Kept deliberately loose — the output is reviewed by a human, and a
 * false positive costs a glance while a false negative is invisible.
 */
const SHOP_ONLY = new Set(['supermarket', 'grocery_store', 'convenience_store', 'department_store']);
const MARKET_WORDS = /рынок|база|опт|агро|ярмарк|market|плодоовощ|продоволь|мандарин|терминал/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SUBJECT_SUFFIX = /обл\.|край|респ|АО|округ/i;

/**
 * The searched city is not where the hit necessarily IS — searching Moscow
 * returns Balashikha and Dolgoprudny too — so pull the city out of the address
 * itself. Russian formatted addresses end `…, <city>[, <subject>], <postcode>`.
 */
function cityFromAddress(address, fallback) {
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return fallback;
  if (/^\d{6}$/.test(parts.at(-1))) parts.pop();
  // Some addresses spell the country out; without this the "city" came back as
  // "Россия" for every one of them.
  if (/^(Россия|Russia)$/i.test(parts.at(-1) ?? '')) parts.pop();
  if (parts.length > 1 && SUBJECT_SUFFIX.test(parts.at(-1))) parts.pop();
  const city = parts.at(-1);
  // A trailing street fragment means the address had no city at all.
  return !city || /^\d|ул\.|ш\.|пр-т|бул|стр\.|д\./i.test(city) ? fallback : city;
}

async function textSearch(query, pageToken) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('key', KEY);
  url.searchParams.set('language', 'ru');
  url.searchParams.set('region', 'ru');
  if (pageToken) url.searchParams.set('pagetoken', pageToken);
  else url.searchParams.set('query', query);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places ${res.status}: ${await res.text()}`);
  const body = await res.json();
  if (body.status !== 'OK' && body.status !== 'ZERO_RESULTS') {
    throw new Error(`Places ${body.status}: ${body.error_message ?? ''}`);
  }
  return body;
}

const args = process.argv.slice(2);
const pilot = args.includes('--pilot');
const maxPages = Number(args[args.indexOf('--pages') + 1]) || 1;
const cities = pilot ? CITIES.slice(0, 3) : CITIES;

const found = new Map(); // place_id → row
let requests = 0;

for (const [city, region] of cities) {
  for (const q of QUERIES) {
    let token;
    for (let page = 0; page < maxPages; page++) {
      // The next_page_token is not valid immediately after it is issued.
      if (token) await sleep(2000);
      const body = await textSearch(`${q} ${city}`, token);
      requests++;

      for (const p of body.results ?? []) {
        if (found.has(p.place_id)) continue;
        const types = p.types ?? [];
        const shopOnly = types.some((t) => SHOP_ONLY.has(t)) && !MARKET_WORDS.test(p.name);
        if (shopOnly) continue;
        const address = p.formatted_address ?? '';
        found.set(p.place_id, {
          name: p.name,
          address,
          city: cityFromAddress(address, city),
          searchedCity: city,
          region,
          country: 'Russia',
          lat: p.geometry?.location?.lat ?? '',
          lng: p.geometry?.location?.lng ?? '',
          rating: p.rating ?? '',
          reviews: p.user_ratings_total ?? '',
          businessStatus: p.business_status ?? '',
          types: types.join('|'),
          placeId: p.place_id,
          matchedQuery: q,
          // Weak signal for the reviewer: does the name read like a trade yard?
          looksWholesale: MARKET_WORDS.test(p.name) ? 'yes' : 'check',
        });
      }

      token = body.next_page_token;
      if (!token) break;
    }
  }
  console.log(`${city}: ${found.size} total after ${requests} request(s)`);
}

const rows = [...found.values()].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
const columns = Object.keys(rows[0] ?? { name: '' });
const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

mkdirSync('data/markets', { recursive: true });
const stem = pilot ? 'data/markets/ru-wholesale-pilot' : 'data/markets/ru-wholesale';
writeFileSync(`${stem}.json`, JSON.stringify(rows, null, 2) + '\n', 'utf8');
writeFileSync(
  `${stem}.csv`,
  '﻿' + [columns.join(','), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n',
  'utf8',
);

console.log(`\n${rows.length} market(s) from ${requests} request(s) → ${stem}.csv`);
console.log(`approx cost: $${((requests * 32) / 1000).toFixed(2)} at $32/1000 Text Search`);
