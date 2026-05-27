export type AICompanyCategory =
  | 'silicon'
  | 'hyperscaler'
  | 'ai-native'
  | 'infra'
  | 'consumer';

export interface AICompany {
  ticker: string;
  cik: string;
  name: string;
  display_name: string;
  exchange: 'NASDAQ' | 'NYSE';
  category: AICompanyCategory;
  ai_angle: string;
  news_aliases: ReadonlyArray<string>;
  website: string;
}

export const CATEGORY_LABEL: Record<AICompanyCategory, string> = {
  silicon: 'Silicon',
  hyperscaler: 'Hyperscaler',
  'ai-native': 'AI Native',
  infra: 'Infrastructure',
  consumer: 'Consumer',
};
