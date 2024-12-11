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
  
      mockResponse(200, 'OK', Buffer.from(JSON.stringify(response)));
  
      const client = new AtmosphereClient('endpoint');
      const data = await client.acquire();
  
      expect(data).toEqual(response);
      expect(https.request).toHaveBeenCalledTimes(1);
  
    })
  
    test('retries if an environment is not available', async () => {
  
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
  
      mockResponse(423, 'Locked', Buffer.from(JSON.stringify(response)));
  
      const client = new AtmosphereClient('endpoint');
      const data = await client.acquire();
  
      expect(data).toEqual(response);
      expect(https.request).toHaveBeenCalledTimes(1);
  
    })
  
    test.each([{ statusCode: 400, statusMessage: 'BadRequest' }, { statusCode: 500, statusMessage: 'Internal Error' }])('throws on error status codes', async ({ statusCode, statusMessage }) => {
  
      const client = new AtmosphereClient('endpoint');
  
      mockResponse(statusCode, statusMessage, Buffer.from('{"message":"Invalid Input"}'));
      await expect(client.acquire()).rejects.toThrow(`${statusCode} (${statusMessage}): Invalid Input`);
  
    })
  
    test('defaults to an unknown error if service doesnt provide message on error', async () => {
  
      const client = new AtmosphereClient('endpoint');
  
      mockResponse(400, 'BadRequest', Buffer.from('{}'));
      await expect(client.acquire()).rejects.toThrow(`400 (BadRequest): Unknown error`);
  
    });
  
  })

});

function mockResponse(statusCode: number, statusMessage: string, data: Buffer) {

  const request = https.request as jest.MockedFunction<any>;
  request.mockImplementation((_options: http.RequestOptions, callback?: (res: http.IncomingMessage) => void) => {

    const response = {
      statusCode,
      statusMessage,
      on: (event: string, listener: (...args: any[]) => void) => {

        switch (event) {
          case 'data':
            listener(data);
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
