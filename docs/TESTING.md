# Testing Guide

## Overview

This project uses **Vitest** for unit and integration testing. Tests are organized by type and scope.

## Test Structure

```text
tests/
└── unit/                    # Unit tests (isolated functions/tools)
    └── tools/
        └── search-books-tool.test.ts  # 9 tests covering all scenarios
```

**Note**: Integration tests for Genkit flows are not included due to framework limitations. The Genkit Dev UI serves as the integration testing environment for flows.

## Running Tests

```bash
# Run tests in watch mode (interactive)
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Writing Tests

### Unit Tests

Unit tests should test individual functions or tools in isolation, mocking external dependencies.

**Example**:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import nock from 'nock';
import { searchBooksTool } from '../../../src/tools/search-books-tool.js';

describe('searchBooksTool', () => {
  beforeEach(() => {
    process.env.GOOGLE_BOOKS_API_KEY = 'test-key';
    nock.cleanAll();
  });

  it('should return books for valid query', async () => {
    // Mock HTTP request
    nock('https://www.googleapis.com')
      .get('/books/v1/volumes')
      .query(true)
      .reply(200, mockResponse);

    const result = await searchBooksTool({ query: 'test' });
    expect(result).toHaveLength(1);
  });
});
```

### Testing Genkit Flows

Genkit flows are best tested through the **Genkit Dev UI** rather than automated tests:

1. Start the dev server: `npm run genkit:start`
2. Open http://localhost:4000
3. Select the flow to test
4. Provide test input
5. Verify output

This approach provides better visibility into flow execution and AI interactions.

## Mocking HTTP Requests

We use **nock** to mock HTTP requests:

```typescript
import nock from 'nock';

// Mock a successful response
nock('https://api.example.com')
  .get('/endpoint')
  .query({ key: 'value' })
  .reply(200, { data: 'success' });

// Mock an error
nock('https://api.example.com')
  .get('/endpoint')
  .reply(401, { error: 'Unauthorized' });

// Mock network error
nock('https://api.example.com')
  .get('/endpoint')
  .replyWithError('Network error');
```

## Test Coverage

Coverage reports are generated in `coverage/` directory:

```bash
npm run test:coverage
```

**Coverage goals**:
- Tools: 90%+ coverage
- Flows: Tested manually via Genkit Dev UI
- Types: Excluded from coverage

## Best Practices

1. **Isolate tests**: Each test should be independent
2. **Clean up**: Use `beforeEach`/`afterEach` to reset state
3. **Mock external APIs**: Never make real API calls in tests
4. **Test error cases**: Test both success and failure paths
5. **Descriptive names**: Test names should explain what they test
6. **Arrange-Act-Assert**: Structure tests clearly

## CI Integration

Tests run automatically on:
- Pre-commit (via husky)
- Pull requests (via GitHub Actions)

All tests must pass before merging.
