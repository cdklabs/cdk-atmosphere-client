import * as aws4fetch from 'aws4fetch';
import { enableFetchMocks } from 'jest-fetch-mock';
import { AtmosphereClient, Allocation } from '../src';

jest.mock('@aws-sdk/credential-providers', () => ({
  fromNodeProviderChain: jest.fn().mockReturnValue(() => Promise.resolve({
    accessKeyId: 'accessKeyId',
    secretAccessKey: 'secretAccessKey',
    sessionToken: 'sessionToken',
  })),
}));

enableFetchMocks();

// otherwise, aws4fetch invokes the original fetch function with a signed request - which is very
// difficult to assert on. its fine - we dont mean to test request signature headers here.
jest.spyOn(aws4fetch.AwsClient.prototype, 'fetch').mockImplementation(async (...args: any[]) => {
  return Promise.resolve(fetch(args[0], args[1]));
});

const endpoint = 'https://endpoint.com';

describe('AtmosphereClient', () => {

  const client = new AtmosphereClient(endpoint);

  beforeEach(() => {
    fetchMock.resetMocks();
  });

  describe('constructor', () => {

    test('sets crypto', () => {

      (global as any).crypto = undefined;
      new AtmosphereClient('endpoint');
      expect((global as any).crypto).toBeDefined();

    });

  });

  describe('acquire', () => {

    test('returns immediately if an environment is available', async () => {

      const response: Allocation = {
        id: 'id',
        environment: {
          account: 'account',
          region: 'region',
        },
        credentials: {
          accessKeyId: 'accessKeyId',
          secretAccessKey: 'secretAccessKey',
          sessionToken: 'sessionToken',
        },
      };

      fetchMock.mockResponse(JSON.stringify(response));

      const data = await client.acquire({ pool: 'pool', requester: 'user' });

      expect(data).toEqual(response);
      expect(aws4fetch.AwsClient.prototype.fetch).toHaveBeenCalledTimes(1);
      expect(aws4fetch.AwsClient.prototype.fetch).toHaveBeenCalledWith(`${endpoint}/allocations`, {
        body: JSON.stringify({ pool: 'pool', requester: 'user' }),
        method: 'POST',
      });

    });

    test('exponentially waits until an environment is available', async () => {

      mockSetTimeout();

      fetchMock.mockResponses(
        [JSON.stringify({ message: 'No available environments' }), { status: 423, statusText: 'Locked' }],
        [JSON.stringify({ message: 'No available environments' }), { status: 423, statusText: 'Locked' }],
        [JSON.stringify({ message: 'No available environments' }), { status: 423, statusText: 'Locked' }],
        [JSON.stringify({}), { status: 200, statusText: 'Locked' }],
      );

      await client.acquire({ pool: 'pool', requester: 'user' });

      expect(setTimeout).toHaveBeenCalledTimes(3);
      expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), 1000);
      expect(setTimeout).toHaveBeenNthCalledWith(2, expect.any(Function), 2000);
      expect(setTimeout).toHaveBeenNthCalledWith(3, expect.any(Function), 4000);

    });

    test('times out if no environments are available', async () => {

      mockSetTimeout();

      fetchMock.mockResponse(JSON.stringify({ message: 'No available environments' }), { status: 423, statusText: 'Locked' });

      const start = Date.now();
      await expect(client.acquire({ pool: 'pool', requester: 'user' })).rejects.toThrow('Failed to acquire environment within 600 seconds');
      const end = Date.now();

      expect(end - start).toBeLessThanOrEqual(11 * 60 * 1000);

    });

    test('waits maximum 1 minute between retries', async () => {

      const setTimeout = mockSetTimeout();

      fetchMock.mockResponse(JSON.stringify({ message: 'No available environments' }), { status: 423, statusText: 'Locked' });

      await expect(client.acquire({ pool: 'pool', requester: 'user' })).rejects.toThrow('Failed to acquire environment within 600 seconds');

      expect(setTimeout).toHaveBeenNthCalledWith(14, expect.any(Function), 60 * 1000);
      expect(setTimeout).toHaveBeenNthCalledWith(15, expect.any(Function), 60 * 1000);

    });

    test('respects timeout', async () => {

      mockSetTimeout();

      fetchMock.mockResponse(JSON.stringify({ message: 'No available environments' }), { status: 423, statusText: 'Locked' });

      const start = Date.now();
      await expect(client.acquire({ timeoutSeconds: 1200, pool: 'pool', requester: 'user' })).rejects.toThrow('Failed to acquire environment within 1200 seconds');
      const end = Date.now();

      expect(end - start).toBeLessThanOrEqual(21 * 60 * 1000);

    });

    test.each([{ statusCode: 400, statusMessage: 'BadRequest' }, { statusCode: 500, statusMessage: 'Internal Error' }])('throws on error status codes', async ({ statusCode, statusMessage }) => {

      fetchMock.mockResponse(JSON.stringify({ message: 'Invalid Input' }), { status: statusCode, statusText: statusMessage });

      await expect(client.acquire({ pool: 'pool', requester: 'user' })).rejects.toThrow(`${statusCode} (${statusMessage}): Invalid Input`);

    });

    test('defaults to an unknown error if service doesnt provide message on error', async () => {

      fetchMock.mockResponse(JSON.stringify({}), { status: 400, statusText: 'BadRequest' });

      await expect(client.acquire({ pool: 'pool', requester: 'user' })).rejects.toThrow('400 (BadRequest): Unknown error');

    });

    test('throws if the unable to perform the request', async () => {

      fetchMock.mockReject(new Error('Unable to perform request'));

      await expect(client.acquire({ pool: 'pool', requester: 'user' })).rejects.toThrow('Unable to perform request');

    });

  });

  describe('release', () => {

    test('makes a single request', async () => {

      fetchMock.mockResponse(JSON.stringify({}), { status: 200, statusText: 'OK' });

      await client.release('id', 'success');
      expect(aws4fetch.AwsClient.prototype.fetch).toHaveBeenCalledTimes(1);
      expect(aws4fetch.AwsClient.prototype.fetch).toHaveBeenCalledWith(`${endpoint}/allocations/id`, {
        body: JSON.stringify({ outcome: 'success' }),
        method: 'DELETE',
      });

    });

  });
});

function mockSetTimeout() {

  jest.useFakeTimers();
  const spy = jest.spyOn(global, 'setTimeout');
  spy.mockImplementation((callback, ms) => {
    if (ms) {
      // simulate the passage of time
      jest.advanceTimersByTime(ms);
    }
    callback();
    return {} as unknown as NodeJS.Timeout;
  });
  return spy;
}
