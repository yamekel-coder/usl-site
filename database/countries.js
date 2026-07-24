// Shared country list used across registration, profile and admin panels.
// Each entry: { code, name } — code is ISO-3166 alpha-2 (used for flag emoji).

const COUNTRIES = [
  { code: 'RU', name: 'Russia' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'BY', name: 'Belarus' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'GE', name: 'Georgia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'EE', name: 'Estonia' },
  { code: 'PL', name: 'Poland' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'GR', name: 'Greece' },
  { code: 'TR', name: 'Turkey' },
  { code: 'RS', name: 'Serbia' },
  { code: 'HR', name: 'Croatia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'AL', name: 'Albania' },
  { code: 'XK', name: 'Kosovo' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'IS', name: 'Iceland' },
  { code: 'MT', name: 'Malta' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'MC', name: 'Monaco' },
  { code: 'SM', name: 'San Marino' },
  { code: 'AD', name: 'Andorra' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'FO', name: 'Faroe Islands' },
  { code: 'VA', name: 'Vatican City' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Peru' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'BZ', name: 'Belize' },
  { code: 'HN', name: 'Honduras' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'PA', name: 'Panama' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PH', name: 'Philippines' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'EG', name: 'Egypt' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'Other', name: 'Other' }
];

// Build lookup maps: code→name, lowercased name→code, and aliases
var codeMap = {};
var nameMap = {};
var aliasMap = {};
COUNTRIES.forEach(function (c) {
  codeMap[c.code] = c.name;
  nameMap[c.name.toLowerCase()] = c.code;
});

// Russian/common aliases for countries
[
  ['RU', 'россия', 'российская федерация', 'ru'],
  ['UA', 'украина', 'украинa', 'ukr'],
  ['BY', 'беларусь', 'belorussia'],
  ['KZ', 'казахстан'],
  ['UZ', 'узбекистан'],
  ['KG', 'кыргызстан'],
  ['TJ', 'таджикистан'],
  ['TM', 'туркменистан'],
  ['AM', 'армения'],
  ['AZ', 'азербайджан'],
  ['GE', 'грузия'],
  ['MD', 'молдова', 'moldavia'],
  ['LV', 'латвия'],
  ['LT', 'литва'],
  ['EE', 'эстония'],
  ['PL', 'польша'],
  ['DE', 'германия'],
  ['FR', 'франция'],
  ['GB', 'великобритания', 'great britain'],
  ['ES', 'испания'],
  ['IT', 'италия'],
  ['NL', 'нидерланды', 'holland'],
  ['TR', 'турция', 'türkiye'],
  ['US', 'сша', 'америка', 'usa'],
  ['CA', 'канада'],
  ['BR', 'бразилия'],
  ['AU', 'австралия'],
  ['JP', 'япония'],
  ['KR', 'корея', 'korea'],
  ['CN', 'китай'],
  ['ID', 'индонезия'],
  ['PH', 'филиппины'],
  ['IN', 'индия'],
  ['AR', 'аргентина'],
  ['MX', 'мексика'],
  ['CO', 'колумбия'],
  ['CL', 'чили'],
  ['PE', 'перу'],
  ['PT', 'португалия'],
  ['CZ', 'чехия', 'czechia'],
  ['RO', 'румыния', 'românia'],
  ['HU', 'венгрия'],
  ['BG', 'болгария'],
  ['RS', 'сербия'],
  ['HR', 'хорватия'],
  ['TH', 'таиланд'],
  ['VN', 'вьетнам'],
  ['MY', 'малайзия'],
  ['SG', 'сингапур'],
  ['FI', 'финляндия'],
  ['SE', 'швеция'],
  ['NO', 'норвегия'],
  ['DK', 'дания'],
  ['IL', 'израиль'],
  ['EG', 'египет'],
  ['ZA', 'south africa'],
  ['PK', 'пакистан'],
  ['BD', 'бангладеш'],
  ['NG', 'нигерия'],
  ['KE', 'кения'],
].forEach(function (entry) {
  var code = entry[0];
  for (var i = 1; i < entry.length; i++) {
    aliasMap[entry[i].toLowerCase()] = code;
  }
});

// Resolve any input (ISO code, full name, alias, etc.) to { code, name }.
function resolve(input) {
  if (!input || typeof input !== 'string') return null;
  var trimmed = input.trim();
  if (!trimmed) return null;
  if (codeMap[trimmed]) return { code: trimmed, name: codeMap[trimmed] };
  var low = trimmed.toLowerCase();
  if (nameMap[low]) return { code: nameMap[low], name: codeMap[nameMap[low]] };
  if (aliasMap[low]) return { code: aliasMap[low], name: codeMap[aliasMap[low]] };
  var up = trimmed.toUpperCase();
  if (codeMap[up]) return { code: up, name: codeMap[up] };
  return null;
}

function flagEmoji(input) {
  var r = resolve(input);
  if (!r || r.code === 'Other') return '';
  var upper = r.code.toUpperCase();
  return String.fromCodePoint(
    ...[...upper].map(function (ch) { return 0x1F1E6 + (ch.charCodeAt(0) - 65); })
  );
}

function countryName(input) {
  var r = resolve(input);
  return r ? r.name : (input || '');
}

module.exports = COUNTRIES;
module.exports.flagEmoji = flagEmoji;
module.exports.countryName = countryName;
module.exports.resolve = resolve;
