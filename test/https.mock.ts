import * as http from 'http';
import * as https from 'https';

/**
 * Mock response coming from the service.
 */
export interface MockResponse {
  /**
   * HTTP status code.
   */
  readonly statusCode: number;

  /**
   * HTTP status message.
   */
  readonly statusMessage?: string;

  /**
   * Response body.
   */
  readonly data: Buffer;
}

export interface MockHttpsRespondOptions {
  /**
   * List of ordered responses coming from the service.
   *
   * Use this to simulate the service's responses.
   */
  readonly responses: MockResponse[];

  /**
   * Whether the last response should be preserved as the response in case
   * service invocation count is higher than the provided responses length.
   *
   * @default false
   */
  readonly keepLastResponse?: boolean;
}

export interface MockHttpsErrorOptions {
  /**
   * Error thrown by the request.
   *
   * Use this to simulate an error while initiating the connection.
   *
   * @default undefined
   */
  readonly error?: Error;
}

/**
 * Mocks the https module used by the client.
 */
export class MockHttps {

  /**
   * Simulate the service's responses.
   */
  public static respond(options: MockHttpsRespondOptions) {
    return new MockHttps(options.responses ?? [], options.keepLastResponse ?? false, undefined);
  }

  /**
   * Simulate an error while initiating the connection.
   */
  public static error(options: MockHttpsErrorOptions) {
    return new MockHttps([], false, options.error);
  }

  private constructor(
    responses: MockResponse[],
    keepLastResponse: boolean,
    error?: Error,
  ) {

    const last = responses[responses.length - 1];
    const request = https.request as jest.MockedFunction<any>;
    request.mockImplementation((_options: http.RequestOptions, callback?: (res: http.IncomingMessage) => void) => {

      if (error) {
        // no need to invoke the callback because we
        // are not expecting responses.
        return { on: this.errorHandler(error) };
      }

      if (callback) {

        const current = responses.shift() ?? (keepLastResponse ? last : undefined);

        // bug in the test, it didn't account for how many invocations
        // will actually occur.
        if (!current) throw new Error('Unexpected invocation count. You have a bug in your test.');

        const mockResponse = {
          statusCode: current.statusCode,
          statusMessage: current.statusMessage,
          on: this.responseHandler(current.data),
        };

        callback(mockResponse as unknown as http.IncomingMessage);

      }

      return { on: jest.fn(), end: jest.fn() } as unknown as http.ClientRequest;
    });

  }

  private errorHandler(error: Error) {
    return (event: string, listener: (...args: any[]) => void) => {
      switch (event) {
        case 'error':
          listener(error);
          break;
        case 'end':
          listener();
          break;
      }
    };
  }

  private responseHandler(data: Buffer) {
    return (event: string, listener: (...args: any[]) => void) => {
      switch (event) {
        case 'data':
          listener(data);
          break;
        case 'end':
          listener();
          break;
      }
    };
  }
}

