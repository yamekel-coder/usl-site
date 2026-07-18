// Shared country list used across registration, profile and admin panels.
// Each entry: { code, name } — code is ISO-3166 alpha-2 (used for flag emoji).

// Convert ISO-3166 alpha-2 code to flag emoji (regional indicator symbols).
function flagEmoji(code) {
  if (!code || code === 'Other' || code.length !== 2) return '';
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    ...[...upper].map(function (ch) { return 0x1F1E6 + (ch.charCodeAt(0) - 65); })
  );
}

// Map ISO-3166 alpha-2 code to full country name (or the code itself if unknown).
function countryName(code) {
  if (!code) return '';
  const found = COUNTRIES.find(function (c) { return c.code === code; });
  return found ? found.name : code;
}

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

module.exports = COUNTRIES;
module.exports.flagEmoji = flagEmoji;
module.exports.countryName = countryName;
