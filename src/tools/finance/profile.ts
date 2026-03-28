import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { api } from './api.js';
import { formatToolResult } from '../types.js';

export const getCompanyProfile = new DynamicStructuredTool({
  name: 'get_company_profile',
  description: 'Get company profile data including sector, industry, market cap, CEO, exchange, website, and description.',
  schema: z.object({
    ticker: z.string().describe("The stock ticker symbol. For example, 'AAPL' for Apple."),
  }),
  func: async ({ ticker }) => {
    try {
      const response = await api.get(`/v3/reference/tickers/${ticker}`, {}, {
        cacheable: true,
      });

      const items = response.data.results;
      if (!items) {
        return formatToolResult({ error: `No profile data found for ${ticker}.` }, [response.url]);
      }

      return formatToolResult(items, [response.url]);
    } catch (error) {
      return formatToolResult(
        { error: `Error fetching profile: ${error instanceof Error ? error.message : String(error)}` },
        []
      );
    }
  },
});
