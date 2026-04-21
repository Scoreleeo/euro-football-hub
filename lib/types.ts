export type MatchRow = {
  fixtureId: number;
  date: string;
  status: string;
  elapsed?: number | null;
  leagueName: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  goals: {
    home: number | null;
    away: number | null;
  };
};

export type StandingRow = {
  rank: number;
  teamId: number;
  team: string;
  logo?: string;
  played: number;
  goalDiff: number;
  points: number;
  form: string;
};

export type TeamNewsItem = {
  id: string;
  title: string;
  summary: string;
  kind: "injury" | "transfer";
};

export type NewsItem = {
  id: string;
  title: string;
  summary?: string;
  source?: string;
  date?: string;
  link?: string;
  image?: string;
  kind?: "breaking" | "injury" | "transfer" | "news" | string;
};

export type DashboardPayload = {
  standings: StandingRow[];
  fixtures: MatchRow[];
  results: MatchRow[];
  live: MatchRow[];
  teamNews: TeamNewsItem[];
  news?: NewsItem[];
};

export type FixtureEvent = {
  time: string;
  type: string;
  detail: string;
  teamName: string;
  playerName?: string;
  assistName?: string;
};

export type FixtureStatistic = {
  teamName: string;
  teamLogo?: string;
  stats: Record<string, string | number>;
};

export type FixtureLineup = {
  teamName: string;
  teamLogo?: string;
  formation?: string;
  coach?: string;
  startXI: string[];
  substitutes: string[];
};

export type FixtureDetail = {
  fixtureId: number;
  date: string;
  status: string;
  elapsed?: number | null;
  leagueName: string;
  venue?: string;
  referee?: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  goals: {
    home: number | null;
    away: number | null;
  };
  events: FixtureEvent[];
  statistics: FixtureStatistic[];
  lineups: FixtureLineup[];
};