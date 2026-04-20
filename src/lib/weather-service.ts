/** Open-Meteo 기반 당일 예보 (위치 미허용 시 서울 좌표) */

export interface WeatherInfo {
  minTemperature: number;
  maxTemperature: number;
  description: string;
  icon: string;
}

const SEOUL = { lat: 37.5665, lon: 126.978 };

export async function getWeatherInfo(latitude?: number, longitude?: number): Promise<WeatherInfo | null> {
  const lat = latitude ?? SEOUL.lat;
  const lon = longitude ?? SEOUL.lon;

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul&forecast_days=1`
    );
    if (!response.ok) throw new Error("weather");

    const data = await response.json();
    const daily = data.daily;
    const code = daily.weather_code[0] as number;

    return {
      maxTemperature: Math.round(daily.temperature_2m_max[0]),
      minTemperature: Math.round(daily.temperature_2m_min[0]),
      description: getWeatherDescription(code),
      icon: getWeatherIconFromCode(code),
    };
  } catch {
    return null;
  }
}

function getWeatherDescription(code: number): string {
  const map: Record<number, string> = {
    0: "맑음",
    1: "대체로 맑음",
    2: "구름 조금",
    3: "흐림",
    45: "안개",
    48: "짙은 안개",
    51: "가벼운 이슬비",
    53: "이슬비",
    55: "짙은 이슬비",
    61: "가벼운 비",
    63: "비",
    65: "폭우",
    71: "가벼운 눈",
    73: "눈",
    95: "천둥번개",
  };
  return map[code] ?? "맑음";
}

function getWeatherIconFromCode(code: number): string {
  const map: Record<number, string> = {
    0: "01d",
    1: "02d",
    2: "03d",
    3: "04d",
    45: "50d",
    48: "50d",
    51: "09d",
    53: "09d",
    55: "09d",
    61: "10d",
    63: "10d",
    65: "10d",
    71: "13d",
    73: "13d",
    95: "11d",
  };
  return map[code] ?? "01d";
}

export function getWeatherEmoji(icon: string): string {
  const m: Record<string, string> = {
    "01d": "☀️",
    "01n": "🌙",
    "02d": "⛅️",
    "02n": "☁️",
    "03d": "☁️",
    "04d": "☁️",
    "09d": "🌧️",
    "10d": "🌦️",
    "11d": "⛈️",
    "13d": "🌨️",
    "50d": "🌫️",
  };
  return m[icon] ?? "🌤️";
}
