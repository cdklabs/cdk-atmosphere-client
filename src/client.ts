import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { AwsClient } from 'aws4fetch';

/**
 * Error coming from the service.
 */
export class ServiceError extends Error {
  constructor(public readonly statusCode: number, message: string, statusText: string) {
    super(`${statusCode} (${statusText}): ${message}`);
  }
}

/**
 * Credentials for a specific environment.
 *
 */
export interface Credentials {
  /**
   * AccessKeyId
   */
  readonly accessKeyId: string;

  /**
   * SecretAccessKey
   */
  readonly secretAccessKey: string;

  /**
   * SessionToken
   *
   */
  readonly sessionToken: string;
}

/**
 * Environment information.
 */
export interface Environment {

  /**
   * Account ID.
   */
  readonly account: string;

  /**
   * Region.
   */
  readonly region: string;
}

/**
 * An allocation of a single environment.
 */
export interface Allocation {

  /**
   * The allocation id.
   */
  readonly id: string;

  /**
   * The allocated environment.
   */
  readonly environment: Environment;

  /**
   * Credentials.
   */
  readonly credentials: Credentials;

}

export interface AcquireOptions {
  /**
   * Which pool to acquire an environment from.
   */
  readonly pool: string;
  /**
   * Identity for the requester.
   */
  readonly requester: string;
  /**
   * How many seconds to wait in case an environment is not immediately available.
   *
   * @default 600
   */
  readonly timeoutSeconds?: number;
}

interface RequestRetryOptions {
  timeoutSeconds: number;
  maxDelaySeconds: number;
  retryOnStatus?: number[];
}

/**
 * Client for the Atmosphere service. Requires AWS credentials to be available
 * via standard mechanisms.
 */
export class AtmosphereClient {

  private _aws: AwsClient | undefined;

  public constructor(private readonly endpoint: string) {

    // aws4fetch relies on `crypto` being available globally.
    // looks like in node < 20, even though it is included in the runtime,
    // it isn't defined globally, so we polyfill it.
    if ((global as any).crypto == null) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (global as any).crypto = require('crypto');
    }
  }

  /**
   * Waits until an environment could be allocated by the service.
   *
   * @returns allocation information.
   * @throws if an environment could not be acquired within the specified timeout.
   */
  public async acquire(options: AcquireOptions): Promise<Allocation> {
    this.log(`Acquire | environment from pool '${options.pool}' (requester: '${options.requester}')`);
    const acquired = await this.request('POST', '/allocations', {
      pool: options.pool,
      requester: options.requester,
    }, {
      timeoutSeconds: options.timeoutSeconds ?? 600,
      maxDelaySeconds: 60000,
      retryOnStatus: [423],
    });
    this.log(`Acquire | Successfully acquired environment from pool ${options.pool} (requester: ${options.requester})`);
    return acquired;
  }

  /**
   * Release an environment based on the allocation id. After releasing an environment,
   * its provided credentials are deactivated.
   */
  public async release(allocationId: string, outcome: string) {
    this.log(`Release | Allocation '${allocationId}' (outcome: '${outcome}')`);
    const released = await this.request('DELETE', `/allocations/${allocationId}`, { outcome }, {
      timeoutSeconds: 30,
      maxDelaySeconds: 32000,
    });
    this.log(`Release | Successfully released allocation '${allocationId}' (outcome: '${outcome}')`);
    return released;
  }

  private async aws(): Promise<AwsClient> {
    if (!this._aws) {
      const provider = fromNodeProviderChain();
      const creds = await provider();
      this._aws = new AwsClient({
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
        service: 'execute-api',
      });
    }
    return this._aws;
  }

  private async request(method: string, path: string, body: any, retryOptions: RequestRetryOptions): Promise<any> {

    const aws = await this.aws();

    const timeoutSeconds = retryOptions.timeoutSeconds;
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;

    let retryDelay = 1000; // start with 1 second
    const maxRetryDelay = retryOptions.maxDelaySeconds;

    while (true) {
      const response = await aws.fetch(`${this.endpoint}${path}`, {
        method,
        body: JSON.stringify(body),
      });

      const responseBody = await response.json() as any;
      if (response.status === 200) {
        return responseBody;
      }

      const retryable = [
        // TooManyRequests (API level throttling)
        429,

        // Additional codes specific to the request.
        ...(retryOptions.retryOnStatus ?? []),
      ];

      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs || !retryable.includes(response.status)) {
        throw new ServiceError(response.status, responseBody.message ?? 'Unknown error', response.statusText);
      }

      this.log(`${response.status} | Retrying after ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      retryDelay = Math.min(retryDelay * 2, maxRetryDelay);
    }

  }

  private log(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

}