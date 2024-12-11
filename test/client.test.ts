import * as http from 'http';
import * as https from 'https';

import { AtmosphereClient, EnvironmentAllocation } from '../src';

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
          sessionToken: 'sessionToken'
         } 
        }
      }
  
      simulateResponses({ statusCode: 200, statusMessage: 'OK', data: Buffer.from(JSON.stringify(response))});
  
      const client = new AtmosphereClient('endpoint');
      const data = await client.acquire();
  
      expect(data).toEqual(response);
      expect(https.request).toHaveBeenCalledTimes(1);
  
    })
  
    test('exponentially waits until an environment is available', async () => {
  
      const allocation: EnvironmentAllocation = {
        allocationId: 'id',
        environment: {
         account: 'account',
         region: 'region',
         credentials: {
          accessKeyId: 'accessKeyId',
          secretAccessKey: 'secretAccessKey',
          sessionToken: 'sessionToken'
         } 
        }
      }
  
      const originalSetTimeout = setTimeout;
      jest.spyOn(global, 'setTimeout').mockImplementation((callback, _ms) => {
        return originalSetTimeout(callback, 0);
      });

      simulateResponses(
        { statusCode: 423, statusMessage: 'Locked', data: Buffer.from('{"message": "No available environments"}')},
        { statusCode: 423, statusMessage: 'Locked', data: Buffer.from('{"message": "No available environments"}')},
        { statusCode: 423, statusMessage: 'Locked', data: Buffer.from('{"message": "No available environments"}')},
        { statusCode: 200, statusMessage: 'Locked', data: Buffer.from(JSON.stringify(allocation))},
      );
  
      const client = new AtmosphereClient('endpoint');
      const data = await client.acquire();
  
      expect(data).toEqual(allocation);
      expect(https.request).toHaveBeenCalledTimes(4);

      expect(setTimeout).toHaveBeenCalledTimes(3);
      expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), 1000);
      expect(setTimeout).toHaveBeenNthCalledWith(2, expect.any(Function), 2000);
      expect(setTimeout).toHaveBeenNthCalledWith(3, expect.any(Function), 4000);
  
    })

    test('times out if no environments are available', async () => {
    
      jest.useFakeTimers();
      const originalSetTimeout = setTimeout;
      jest.spyOn(global, 'setTimeout').mockImplementation((callback, ms) => {
        const timeout = originalSetTimeout(callback, ms);
        if (ms) {
          jest.advanceTimersByTime(ms);
        }
        return timeout;
      });

      simulateResponses(
        { statusCode: 423, statusMessage: 'Locked', data: Buffer.from('{"message": "No available environments"}')},
        { statusCode: 423, statusMessage: 'Locked', data: Buffer.from('{"message": "No available environments"}')},
        { statusCode: 423, statusMessage: 'Locked', data: Buffer.from('{"message": "No available environments"}')},
      );
  
      const client = new AtmosphereClient('endpoint');
      await expect(client.acquire()).rejects.toThrow('Failed to acquire environment within 10 minutes');
    
    })
    
    test.each([{ statusCode: 400, statusMessage: 'BadRequest' }, { statusCode: 500, statusMessage: 'Internal Error' }])('throws on error status codes', async ({ statusCode, statusMessage }) => {
  
      const client = new AtmosphereClient('endpoint');
  
      simulateResponses({statusCode, statusMessage, data: Buffer.from('{"message":"Invalid Input"}')});
      await expect(client.acquire()).rejects.toThrow(`${statusCode} (${statusMessage}): Invalid Input`);
  
    })
  
    test('defaults to an unknown error if service doesnt provide message on error', async () => {
  
      const client = new AtmosphereClient('endpoint');
  
      simulateResponses({ statusCode: 400, statusMessage: 'BadRequest', data: Buffer.from('{}')});
      await expect(client.acquire()).rejects.toThrow(`400 (BadRequest): Unknown error`);
  
    });
  
  })

});

interface MockResponse {
  statusCode: number;
  statusMessage: string;
  data: Buffer;
}

function simulateResponses(...responses: MockResponse[]) {

  const last = responses[responses.length - 1];
  const request = https.request as jest.MockedFunction<any>;
  request.mockImplementation((_options: http.RequestOptions, callback?: (res: http.IncomingMessage) => void) => {

    const mockResponse = responses.shift() ?? last;
    if (!mockResponse) throw new Error('Unexpected invocation count');

    const response = {
      statusCode: mockResponse.statusCode,
      statusMessage: mockResponse.statusMessage,
      on: (event: string, listener: (...args: any[]) => void) => {

        switch (event) {
          case 'data':
            listener(mockResponse.data);
            break;
          case 'end':
            listener();
            break;
        }
  
        return response;
  
      },
    };

    if (callback) callback(response as unknown as http.IncomingMessage);

  });

}
