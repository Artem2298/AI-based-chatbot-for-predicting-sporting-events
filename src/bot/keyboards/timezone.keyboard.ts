import { InlineKeyboard } from 'grammy';

export interface TimezoneCity {
  label: string;
  iana: string;
  utcOffset: string;
}

const EUROPE_CITIES: TimezoneCity[] = [
  { label: 'London', iana: 'Europe/London', utcOffset: 'UTC+0' },
  { label: 'Berlin', iana: 'Europe/Berlin', utcOffset: 'UTC+1' },
  { label: 'Kyiv', iana: 'Europe/Kyiv', utcOffset: 'UTC+2' },
  { label: 'Istanbul', iana: 'Europe/Istanbul', utcOffset: 'UTC+3' },
];

const RUSSIA_CITIES: TimezoneCity[] = [
  { label: 'Kaliningrad', iana: 'Europe/Kaliningrad', utcOffset: 'UTC+2' },
  { label: 'Moscow', iana: 'Europe/Moscow', utcOffset: 'UTC+3' },
  { label: 'Samara', iana: 'Europe/Samara', utcOffset: 'UTC+4' },
  { label: 'Yekaterinburg', iana: 'Asia/Yekaterinburg', utcOffset: 'UTC+5' },
  { label: 'Omsk', iana: 'Asia/Omsk', utcOffset: 'UTC+6' },
  { label: 'Krasnoyarsk', iana: 'Asia/Krasnoyarsk', utcOffset: 'UTC+7' },
  { label: 'Irkutsk', iana: 'Asia/Irkutsk', utcOffset: 'UTC+8' },
  { label: 'Vladivostok', iana: 'Asia/Vladivostok', utcOffset: 'UTC+10' },
];

const OTHER_CITIES: TimezoneCity[] = [
  { label: 'Dubai', iana: 'Asia/Dubai', utcOffset: 'UTC+4' },
  { label: 'Tashkent', iana: 'Asia/Tashkent', utcOffset: 'UTC+5' },
  { label: 'Almaty', iana: 'Asia/Almaty', utcOffset: 'UTC+6' },
  { label: 'Beijing', iana: 'Asia/Shanghai', utcOffset: 'UTC+8' },
  { label: 'Tokyo', iana: 'Asia/Tokyo', utcOffset: 'UTC+9' },
  { label: 'Sydney', iana: 'Australia/Sydney', utcOffset: 'UTC+10' },
];

export const TIMEZONE_REGIONS: Record<string, TimezoneCity[]> = {
  europe: EUROPE_CITIES,
  russia: RUSSIA_CITIES,
  other: OTHER_CITIES,
};

export function buildRegionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🇪🇺 Europe', 'tz_region:europe')
    .text('🇷🇺 Russia', 'tz_region:russia')
    .row()
    .text('🌍 Other', 'tz_region:other');
}

export function buildCityKeyboard(region: string): InlineKeyboard {
  const cities = TIMEZONE_REGIONS[region];
  if (!cities) return buildRegionKeyboard();

  const keyboard = new InlineKeyboard();

  cities.forEach((city, idx) => {
    keyboard.text(`${city.label} (${city.utcOffset})`, `tz:${city.iana}`);
    if (idx % 2 === 1) keyboard.row();
  });

  if (cities.length % 2 !== 0) keyboard.row();
  keyboard.text('◀️ Back', 'tz_region:back');

  return keyboard;
}
