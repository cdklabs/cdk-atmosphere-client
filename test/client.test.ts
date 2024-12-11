import * as https from 'https';

import { AtmosphereClient, EnvironmentAllocation } from '../src';
import { MockHttps } from './https.mock';

jest.mock('https');

beforeEach(() => {
  jest.resetAllMocks();
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('AtmosphereClient', () => {

  describe('acquire', () => {

    test('returns immediately if an environment is available', async () => {

      const response: EnvironmentAllocation = {
        allocationId: 'id',
        environment: {
          account: 'account',
          region: 'region',
          credentials: {
            accessKeyId: 'accessKeyId',
            secretAccessKey: 'secretAccessKey',
            sessionToken: 'sessionToken',
          },
        },
      };

      MockHttps.respond({ responses: [{ statusCode: 200, statusMessage: 'OK', data: Buffer.from(JSON.stringify(response)) }] });

      const client = new AtmosphereClient('endpoint');
      const data = await client.acquire();

      expect(data).toEqual(response);
      expect(https.request).toHaveBeenCalledTimes(1);
      expect(https.request).toHaveBeenCalledWith(
        {
          hostname: 'endpoint',
          port: 443,
          headers: {
            'Content-Type': 'application/json',
          },
          path: '/allocations',
          method: 'POST',
        },
        expect.any(Function),
      );

    });

    test('exponentially waits until an environment is available', async () => {

      const allocation: EnvironmentAllocation = {
        allocationId: 'id',
        environment: {
          account: 'account',
          region: 'region',
          credentials: {
            accessKeyId: 'accessKeyId',
            secretAccessKey: 'secretAccessKey',
            sessionToken: 'sessionToken',
          },
        },
      };

      mockSetTimeout();

      MockHttps.respond({
        responses: [
          { statusCode: 423, statusMessage: 'Locked', data: Buffer.from('{"message": "No available environments"}') },
          { statusCode: 423, statusMessage: 'Locked', data: Buffer.from('{"message": "No available environments"}') },
          { statusCode: 423, statusMessage: 'Locked', data: Buffer.from('{"message": "No available environments"}') },
          { statusCode: 200, statusMessage: 'Locked', data: Buffer.from(JSON.stringify(allocation)) },
        ],
      });

      const client = new AtmosphereClient('endpoint');
      const data = await client.acquire();

      expect(data).toEqual(allocation);
      expect(https.request).toHaveBeenCalledTimes(4);

      expect(setTimeout).toHaveBeenCalledTimes(3);
      expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), 1000);
      expect(setTimeout).toHaveBeenNthCalledWith(2, expect.any(Function), 2000);
      expect(setTimeout).toHaveBeenNthCalledWith(3, expect.any(Function), 4000);

    });

    test('times out if no environments are available', async () => {

      mockSetTimeout();

      MockHttps.respond({
        responses: [{ statusCode: 423, statusMessage: 'Locked', data: Buffer.from('{"message": "No available environments"}') }],
        keepLastResponse: true,
      });

      const client = new AtmosphereClient('endpoint');
      const start = Date.now();
      await expect(client.acquire()).rejects.toThrow('Failed to acquire environment within 10 minutes');
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(10 * 60 * 1000);

    });

    test('waits maximum 1 minute between retries', async () => {

      const setTimeout = mockSetTimeout();

      MockHttps.respond({
        responses: [{ statusCode: 423, statusMessage: 'Locked', data: Buffer.from('{"message": "No available environments"}') }],
        keepLastResponse: true,
      });

      const client = new AtmosphereClient('endpoint');
      const start = Date.now();
      await expect(client.acquire()).rejects.toThrow('Failed to acquire environment within 10 minutes');
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(10 * 60 * 1000);
      expect(setTimeout).toHaveBeenCalledTimes(15);
      expect(setTimeout).toHaveBeenNthCalledWith(14, expect.any(Function), 60 * 1000);
      expect(setTimeout).toHaveBeenNthCalledWith(15, expect.any(Function), 60 * 1000);

    });

    test('respects timeout', async () => {

      mockSetTimeout();

      MockHttps.respond({
        responses: [{ statusCode: 423, statusMessage: 'Locked', data: Buffer.from('{"message": "No available environments"}') }],
        keepLastResponse: true,
      });

      const client = new AtmosphereClient('endpoint');

      const start = Date.now();
      await expect(client.acquire({ timeoutMinutes: 20 })).rejects.toThrow('Failed to acquire environment within 20 minutes');
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(20 * 60 * 1000);

    });

    test.each([{ statusCode: 400, statusMessage: 'BadRequest' }, { statusCode: 500, statusMessage: 'Internal Error' }])('throws on error status codes', async ({ statusCode, statusMessage }) => {

      const client = new AtmosphereClient('endpoint');
      MockHttps.respond({ responses: [{ statusCode, statusMessage, data: Buffer.from('{"message":"Invalid Input"}') }] });

      await expect(client.acquire()).rejects.toThrow(`${statusCode} (${statusMessage}): Invalid Input`);

    });

    test('defaults to an unknown error if service doesnt provide message on error', async () => {

      const client = new AtmosphereClient('endpoint');
      MockHttps.respond({ responses: [{ statusCode: 400, statusMessage: 'BadRequest', data: Buffer.from('{}') }] });

      await expect(client.acquire()).rejects.toThrow('400 (BadRequest): Unknown error');

    });

    test('throws if the unable to perform the request', async () => {

      const client = new AtmosphereClient('endpoint');

      MockHttps.error({ error: new Error('Unable to perform request') });

      await expect(client.acquire()).rejects.toThrow('Unable to perform request');

    });

  });

  describe('release', () => {

    test('makes a single request', async () => {

      MockHttps.respond({ responses: [{ statusCode: 200, statusMessage: 'OK', data: Buffer.from('{}') }] });

      const client = new AtmosphereClient('endpoint');

      await client.release('id');
      expect(https.request).toHaveBeenCalledTimes(1);
      expect(https.request).toHaveBeenCalledWith(
        {
          hostname: 'endpoint',
          port: 443,
          headers: {
            'Content-Type': 'application/json',
          },
          path: '/allocations/id',
          method: 'DELETE',
        },
        expect.any(Function),
      );

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