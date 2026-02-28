/**
 * Google Books API Response Types
 * Based on: https://developers.google.com/books/docs/v1/reference/volumes
 */

export interface IndustryIdentifier {
  type: 'ISBN_10' | 'ISBN_13' | 'ISSN' | 'OTHER';
  identifier: string;
}

export interface ImageLinks {
  smallThumbnail?: string;
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
  extraLarge?: string;
}

export interface VolumeInfo {
  title: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: IndustryIdentifier[];
  pageCount?: number;
  printType?: string;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  maturityRating?: string;
  imageLinks?: ImageLinks;
  language?: string;
  previewLink?: string;
  infoLink?: string;
  canonicalVolumeLink?: string;
}

export interface GoogleBooksVolume {
  kind: 'books#volume';
  id: string;
  etag: string;
  selfLink: string;
  volumeInfo: VolumeInfo;
}

export interface GoogleBooksSearchResponse {
  kind: 'books#volumes';
  totalItems: number;
  items?: GoogleBooksVolume[];
}

/**
 * Book search result for tool output
 */
export interface BookSearchResult {
  id: string;
  title: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  isbn?: string;
  pageCount?: number;
  categories?: string[];
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
  language?: string;
  previewLink?: string;
  averageRating?: number;
  printType?: string;
  maturityRating?: string;
}
