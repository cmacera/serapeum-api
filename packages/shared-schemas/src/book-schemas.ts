import { z } from 'zod';

export const BookSearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()).optional(),
  publisher: z.string().optional(),
  publishedDate: z.string().optional(),
  description: z.string().optional(),
  isbn: z.string().optional(),
  pageCount: z.number().optional(),
  categories: z.array(z.string()).optional(),
  imageLinks: z
    .object({
      thumbnail: z.string().optional(),
      smallThumbnail: z.string().optional(),
    })
    .optional(),
  language: z.string().optional(),
  previewLink: z.string().optional(),
  averageRating: z.number().optional(),
  printType: z.string().optional(),
  maturityRating: z.string().optional(),
});

export type BookSearchResult = z.infer<typeof BookSearchResultSchema>;

export const PaginatedBookResultSchema = z.object({
  results: z.array(BookSearchResultSchema),
  page: z.number().int().positive(),
  hasMore: z.boolean(),
  total: z.number().int().nonnegative().optional(),
});

export type PaginatedBookResult = z.infer<typeof PaginatedBookResultSchema>;
