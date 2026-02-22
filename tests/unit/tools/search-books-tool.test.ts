import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { searchBooksTool } from '../../../src/tools/search-books-tool.js';
import type { GoogleBooksSearchResponse } from '../../../src/lib/google-books-types.js';

describe('searchBooksTool', () => {
  const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com';
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    // Set up environment variable
    process.env['GOOGLE_BOOKS_API_KEY'] = mockApiKey;

    // Clean all HTTP mocks before each test
    nock.cleanAll();
  });

  afterEach(() => {
    // Restore environment
    delete process.env['GOOGLE_BOOKS_API_KEY'];
  });

  describe('Successful searches', () => {
    it('should return books for a valid query', async () => {
      const mockResponse: GoogleBooksSearchResponse = {
        kind: 'books#volumes',
        totalItems: 1,
        items: [
          {
            kind: 'books#volume',
            id: 'test-book-id',
            etag: 'test-etag',
            selfLink: 'https://www.googleapis.com/books/v1/volumes/test-book-id',
            volumeInfo: {
              title: 'The Great Gatsby',
              authors: ['F. Scott Fitzgerald'],
              publisher: 'Scribner',
              publishedDate: '2004-09-30',
              description: 'A classic American novel',
              industryIdentifiers: [
                { type: 'ISBN_13', identifier: '9780743273565' },
                { type: 'ISBN_10', identifier: '0743273567' },
              ],
              pageCount: 180,
              categories: ['Fiction'],
              imageLinks: {
                thumbnail: 'http://books.google.com/thumbnail.jpg',
                smallThumbnail: 'http://books.google.com/small.jpg',
              },
              language: 'en',
              previewLink: 'http://books.google.com/preview',
            },
          },
        ],
      };

      nock(GOOGLE_BOOKS_API_URL)
        .get('/books/v1/volumes')
        .query({
          q: 'intitle:The Great Gatsby',
          key: mockApiKey,
          maxResults: 10,
          printType: 'books',
          orderBy: 'relevance',
          langRestrict: 'en',
        })
        .reply(200, mockResponse);

      const result = await searchBooksTool({ query: 'The Great Gatsby', language: 'en' });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'test-book-id',
        title: 'The Great Gatsby',
        authors: ['F. Scott Fitzgerald'],
        publisher: 'Scribner',
        publishedDate: '2004-09-30',
        description: 'A classic American novel',
        isbn: '9780743273565', // Should prefer ISBN-13
        pageCount: 180,
        categories: ['Fiction'],
        imageLinks: {
          thumbnail: 'http://books.google.com/thumbnail.jpg',
          smallThumbnail: 'http://books.google.com/small.jpg',
        },
        language: 'en',
        previewLink: 'http://books.google.com/preview',
      });
    });

    it('should return empty array when no results found', async () => {
      const mockResponse: GoogleBooksSearchResponse = {
        kind: 'books#volumes',
        totalItems: 0,
      };

      nock(GOOGLE_BOOKS_API_URL).get('/books/v1/volumes').query(true).reply(200, mockResponse);

      const result = await searchBooksTool({ query: 'nonexistentbook12345', language: 'en' });

      expect(result).toEqual([]);
    });

    it('should handle books without ISBN', async () => {
      const mockResponse: GoogleBooksSearchResponse = {
        kind: 'books#volumes',
        totalItems: 1,
        items: [
          {
            kind: 'books#volume',
            id: 'no-isbn-book',
            etag: 'test-etag',
            selfLink: 'https://www.googleapis.com/books/v1/volumes/no-isbn-book',
            volumeInfo: {
              title: 'Book Without ISBN',
              authors: ['Unknown Author'],
            },
          },
        ],
      };

      nock(GOOGLE_BOOKS_API_URL).get('/books/v1/volumes').query(true).reply(200, mockResponse);

      const result = await searchBooksTool({ query: 'test', language: 'en' });

      expect(result).toHaveLength(1);
      expect(result[0]?.isbn).toBeUndefined();
    });

    it('should prefer ISBN-13 over ISBN-10', async () => {
      const mockResponse: GoogleBooksSearchResponse = {
        kind: 'books#volumes',
        totalItems: 1,
        items: [
          {
            kind: 'books#volume',
            id: 'test-id',
            etag: 'test-etag',
            selfLink: 'https://www.googleapis.com/books/v1/volumes/test-id',
            volumeInfo: {
              title: 'Test Book',
              industryIdentifiers: [
                { type: 'ISBN_10', identifier: '1234567890' },
                { type: 'ISBN_13', identifier: '9781234567890' },
              ],
            },
          },
        ],
      };

      nock(GOOGLE_BOOKS_API_URL).get('/books/v1/volumes').query(true).reply(200, mockResponse);

      const result = await searchBooksTool({ query: 'test', language: 'en' });

      expect(result[0]?.isbn).toBe('9781234567890');
    });
  });

  describe('Error handling', () => {
    it('should throw error when API key is missing', async () => {
      delete process.env['GOOGLE_BOOKS_API_KEY'];

      await expect(searchBooksTool({ query: 'test', language: 'en' })).rejects.toThrow(
        'GOOGLE_BOOKS_API_KEY environment variable is not configured'
      );
    });

    it('should throw error on 401 authentication failure', async () => {
      nock(GOOGLE_BOOKS_API_URL)
        .get('/books/v1/volumes')
        .query(true)
        .reply(401, {
          error: {
            code: 401,
            message: 'Invalid API key',
          },
        });

      await expect(searchBooksTool({ query: 'test', language: 'en' })).rejects.toThrow(
        'Google Books API authentication failed. Please check your API key.'
      );
    });

    it('should throw error on 429 rate limit', async () => {
      nock(GOOGLE_BOOKS_API_URL)
        .get('/books/v1/volumes')
        .query(true)
        .reply(429, {
          error: {
            code: 429,
            message: 'Rate limit exceeded',
          },
        });

      await expect(searchBooksTool({ query: 'test', language: 'en' })).rejects.toThrow(
        'Google Books API rate limit exceeded. Please try again later.'
      );
    });

    it('should throw error on network failure', async () => {
      nock(GOOGLE_BOOKS_API_URL)
        .get('/books/v1/volumes')
        .query(true)
        .replyWithError('Network error');

      await expect(searchBooksTool({ query: 'test', language: 'en' })).rejects.toThrow(
        'Network error: Unable to reach Google Books API'
      );
    });
  });

  describe('Input validation', () => {
    it('should handle empty query string', async () => {
      // Zod validation should catch this before the API call
      await expect(searchBooksTool({ query: '', language: 'en' })).rejects.toThrow();
    });
  });
});
