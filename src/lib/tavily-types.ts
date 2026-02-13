export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
  publishedDate?: string; // Add both to be safe or check SDK
}

export interface TavilySearchResponse {
  query: string;
  follow_up_questions: string[] | null;
  answer: string | null;
  images: unknown[] | null;
  results: TavilySearchResult[];
  response_time: number;
}
