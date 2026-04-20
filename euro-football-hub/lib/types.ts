export type MatchRow = {
  fixtureId: number;
  date: string;
  status: string;
  elapsed?: number | null;
  leagueId?: number;
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

export type DashboardPayload = {
  standings: StandingRow[];
  fixtures: MatchRow[];
  results: MatchRow[];
  live: MatchRow[];
  teamNews: TeamNewsItem[];
};