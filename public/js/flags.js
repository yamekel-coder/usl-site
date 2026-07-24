(function () {
  'use strict';

  var countryCodes = {
    'RU': 'RU', 'UA': 'UA', 'BY': 'BY', 'KZ': 'KZ', 'UZ': 'UZ',
    'KG': 'KG', 'TJ': 'TJ', 'TM': 'TM', 'AM': 'AM', 'AZ': 'AZ',
    'GE': 'GE', 'MD': 'MD', 'LV': 'LV', 'LT': 'LT', 'EE': 'EE',
    'US': 'US', 'GB': 'GB', 'DE': 'DE', 'FR': 'FR', 'ES': 'ES',
    'IT': 'IT', 'PL': 'PL', 'CZ': 'CZ', 'RO': 'RO', 'HU': 'HU',
    'BG': 'BG', 'RS': 'RS', 'HR': 'HR', 'SI': 'SI', 'SK': 'SK',
    'NL': 'NL', 'BE': 'BE', 'CH': 'CH', 'AT': 'AT', 'SE': 'SE',
    'NO': 'NO', 'FI': 'FI', 'DK': 'DK', 'IS': 'IS', 'IE': 'IE',
    'PT': 'PT', 'GR': 'GR', 'TR': 'TR', 'IL': 'IL', 'EG': 'EG',
    'ZA': 'ZA', 'NG': 'NG', 'KE': 'KE', 'MA': 'MA', 'TN': 'TN',
    'DZ': 'DZ', 'CN': 'CN', 'JP': 'JP', 'KR': 'KR', 'KP': 'KP',
    'IN': 'IN', 'PK': 'PK', 'BD': 'BD', 'TH': 'TH', 'VN': 'VN',
    'ID': 'ID', 'MY': 'MY', 'PH': 'PH', 'SG': 'SG', 'AU': 'AU',
    'NZ': 'NZ', 'CA': 'CA', 'MX': 'MX', 'BR': 'BR', 'AR': 'AR',
    'CO': 'CO', 'CL': 'CL', 'PE': 'PE', 'VE': 'VE', 'UY': 'UY',
    'EC': 'EC', 'PY': 'PY', 'BO': 'BO', 'CU': 'CU', 'DO': 'DO',
    'PR': 'PR',
    'Россия': 'RU', 'Russia': 'RU',
    'Украина': 'UA', 'Ukraine': 'UA',
    'Беларусь': 'BY', 'Belarus': 'BY', 'Белоруссия': 'BY',
    'Казахстан': 'KZ', 'Kazakhstan': 'KZ',
    'Узбекистан': 'UZ', 'Uzbekistan': 'UZ',
    'Кыргызстан': 'KG', 'Kyrgyzstan': 'KG',
    'Таджикистан': 'TJ', 'Tajikistan': 'TJ',
    'Туркменистан': 'TM', 'Turkmenistan': 'TM',
    'Армения': 'AM', 'Armenia': 'AM',
    'Азербайджан': 'AZ', 'Azerbaijan': 'AZ',
    'Грузия': 'GE', 'Georgia': 'GE',
    'Молдова': 'MD', 'Moldova': 'MD',
    'Латвия': 'LV', 'Latvia': 'LV',
    'Литва': 'LT', 'Lithuania': 'LT',
    'Эстония': 'EE', 'Estonia': 'EE',
    'США': 'US', 'USA': 'US', 'United States': 'US', 'United States of America': 'US',
    'Великобритания': 'GB', 'United Kingdom': 'GB', 'UK': 'GB', 'Britain': 'GB',
    'Германия': 'DE', 'Germany': 'DE',
    'Франция': 'FR', 'France': 'FR',
    'Испания': 'ES', 'Spain': 'ES',
    'Италия': 'IT', 'Italy': 'IT',
    'Польша': 'PL', 'Poland': 'PL',
    'Чехия': 'CZ', 'Czech Republic': 'CZ', 'Czechia': 'CZ',
    'Румыния': 'RO', 'Romania': 'RO',
    'Венгрия': 'HU', 'Hungary': 'HU',
    'Болгария': 'BG', 'Bulgaria': 'BG',
    'Сербия': 'RS', 'Serbia': 'RS',
    'Хорватия': 'HR', 'Croatia': 'HR',
    'Словения': 'SI', 'Slovenia': 'SI',
    'Словакия': 'SK', 'Slovakia': 'SK',
    'Нидерланды': 'NL', 'Netherlands': 'NL', 'Holland': 'NL',
    'Бельгия': 'BE', 'Belgium': 'BE',
    'Швейцария': 'CH', 'Switzerland': 'CH',
    'Австрия': 'AT', 'Austria': 'AT',
    'Швеция': 'SE', 'Sweden': 'SE',
    'Норвегия': 'NO', 'Norway': 'NO',
    'Финляндия': 'FI', 'Finland': 'FI',
    'Дания': 'DK', 'Denmark': 'DK',
    'Исландия': 'IS', 'Iceland': 'IS',
    'Ирландия': 'IE', 'Ireland': 'IE',
    'Португалия': 'PT', 'Portugal': 'PT',
    'Греция': 'GR', 'Greece': 'GR',
    'Турция': 'TR', 'Turkey': 'TR',
    'Израиль': 'IL', 'Israel': 'IL',
    'Египет': 'EG', 'Egypt': 'EG',
    'ЮАР': 'ZA', 'South Africa': 'ZA',
    'Нигерия': 'NG', 'Nigeria': 'NG',
    'Кения': 'KE', 'Kenya': 'KE',
    'Марокко': 'MA', 'Morocco': 'MA',
    'Тунис': 'TN', 'Tunisia': 'TN',
    'Алжир': 'DZ', 'Algeria': 'DZ',
    'Китай': 'CN', 'China': 'CN',
    'Япония': 'JP', 'Japan': 'JP',
    'Корея': 'KR', 'South Korea': 'KR', 'Korea': 'KR',
    'КНДР': 'KP', 'North Korea': 'KP',
    'Индия': 'IN', 'India': 'IN',
    'Пакистан': 'PK', 'Pakistan': 'PK',
    'Бангладеш': 'BD', 'Bangladesh': 'BD',
    'Таиланд': 'TH', 'Thailand': 'TH',
    'Вьетнам': 'VN', 'Vietnam': 'VN',
    'Индонезия': 'ID', 'Indonesia': 'ID',
    'Малайзия': 'MY', 'Malaysia': 'MY',
    'Филиппины': 'PH', 'Philippines': 'PH',
    'Сингапур': 'SG', 'Singapore': 'SG',
    'Австралия': 'AU', 'Australia': 'AU',
    'Новая Зеландия': 'NZ', 'New Zealand': 'NZ',
    'Канада': 'CA', 'Canada': 'CA',
    'Мексика': 'MX', 'Mexico': 'MX',
    'Бразилия': 'BR', 'Brazil': 'BR',
    'Аргентина': 'AR', 'Argentina': 'AR',
    'Колумбия': 'CO', 'Colombia': 'CO',
    'Чили': 'CL', 'Chile': 'CL',
    'Перу': 'PE', 'Peru': 'PE',
    'Венесуэла': 'VE', 'Venezuela': 'VE',
    'Уругвай': 'UY', 'Uruguay': 'UY',
    'Эквадор': 'EC', 'Ecuador': 'EC',
    'Парагвай': 'PY', 'Paraguay': 'PY',
    'Боливия': 'BO', 'Bolivia': 'BO',
    'Куба': 'CU', 'Cuba': 'CU',
    'Доминикана': 'DO', 'Dominican Republic': 'DO',
    'Пуэрто-Рико': 'PR', 'Puerto Rico': 'PR'
  };

  function codeToFlag(code) {
    if (!code) return '';
    var c = code.toUpperCase();
    return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65, 0x1F1E6 + c.charCodeAt(1) - 65);
  }

  window.getCountryFlag = function (country) {
    if (!country) return '';
    var code = countryCodes[country];
    if (!code) {
      var keys = Object.keys(countryCodes);
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].toLowerCase() === country.toLowerCase()) {
          code = countryCodes[keys[i]];
          break;
        }
      }
    }
    return codeToFlag(code);
  };

  window.applyFlags = function (root) {
    var scope = root || document;
    var els = scope.querySelectorAll('[data-country]');
    els.forEach(function (el) {
      if (el.querySelector('.flag-icon')) return;
      var country = el.getAttribute('data-country');
      var flag = window.getCountryFlag(country);
      if (flag) {
        var span = document.createElement('span');
        span.className = 'flag-icon';
        span.textContent = flag + ' ';
        el.prepend(span);
      }
    });
  };
})();
