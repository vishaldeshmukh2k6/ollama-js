import { describe, it, expect, vi, beforeEach } from 'vitest'
import { get, parseJSON } from '../src/utils'

describe('get Function Header Tests', () => {
  const mockFetch = vi.fn();
  const mockResponse = new Response(null, { status: 200 });

  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(mockResponse);
  });

  const defaultHeaders = {
    'content-type': 'application/json',
    'accept': 'application/json',
    'user-agent': expect.stringMatching(/ollama-js\/.*/)
  };

  it('should use default headers when no headers provided', async () => {
    await get(mockFetch, 'http://example.com');
    
    expect(mockFetch).toHaveBeenCalledWith('http://example.com', {
      headers: expect.objectContaining(defaultHeaders)
    });
  });

  it('should handle Headers instance', async () => {
    const customHeaders = new Headers({
      'Authorization': 'Bearer token',
      'X-Custom': 'value'
    });

    await get(mockFetch, 'http://example.com', { headers: customHeaders });

    expect(mockFetch).toHaveBeenCalledWith('http://example.com', {
      headers: expect.objectContaining(defaultHeaders)
    });
  });

  it('should handle plain object headers', async () => {
    const customHeaders = {
      'Authorization': 'Bearer token',
      'X-Custom': 'value'
    };

    await get(mockFetch, 'http://example.com', { headers: customHeaders });

    expect(mockFetch).toHaveBeenCalledWith('http://example.com', {
      headers: expect.objectContaining(defaultHeaders)
    });
  });

  it('should not allow custom headers to override default User-Agent', async () => {
    const customHeaders = {
      'User-Agent': 'custom-agent'
    };

    await get(mockFetch, 'http://example.com', { headers: customHeaders });

    expect(mockFetch).toHaveBeenCalledWith('http://example.com', {
      headers: expect.objectContaining({
        'user-agent': expect.stringMatching(/ollama-js\/.*/)
      })
    });
  });

  it('should handle empty headers object', async () => {
    await get(mockFetch, 'http://example.com', { headers: {} });

    expect(mockFetch).toHaveBeenCalledWith('http://example.com', {
      headers: expect.objectContaining(defaultHeaders)
    });
  });
});

describe('parseJSON UTF-8 multibyte character handling', () => {
  it('should correctly decode multibyte UTF-8 characters split across chunk boundaries', async () => {
    const encoder = new TextEncoder()

    // Create chunks where the 'ь' character (UTF-8: 0xD1 0x8C) is split
    const chunks = [
      new Uint8Array([...encoder.encode('{"text":"использоват'), 0xd1]),
      new Uint8Array([0x8c, ...encoder.encode('"}\n')]),
    ]

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk)
        }
        controller.close()
      },
    })

    const itr = parseJSON<{ text: string }>(stream)
    const { value } = await itr.next()
    expect(value?.text).toBe('использовать')
  })
});
