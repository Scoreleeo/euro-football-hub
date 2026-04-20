import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export const config = {
  apiFootballKey: required("API_FOOTBALL_KEY"),
  apiFootballBaseUrl: "https://v3.football.api-sports.io",
  defaultSeason: 2025,
};