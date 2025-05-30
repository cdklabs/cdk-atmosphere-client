import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { AwsClient } from 'aws4fetch';

/**
 * Error coming from the service.
 */
export class ServiceError extends Error {
  constructor(public readonly statusCode: number, message: string, statusText?: string) {
    super(`${statusCode} ${statusText ? `(${statusText})` : ''}: ${message}`);
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

/**
 * Interface of a writable log stream
 *
 * This interface should be assignment-compatible with `process.stdout` and
 * `process.stderr`, but at the same time not place too many Node implementation
 * requirements on implementors.
 */
export interface IWritable {
  write(chunk: string): void;
}

export interface AtmosphereClientOptions {
  /**
   * Direct logging messages to this stream if given
   *
   * @default - Use `console.log()`.
   */
  readonly logStream?: IWritable;
}

/**
 * Client for the Atmosphere service. Requires AWS credentials to be available
 * via standard mechanisms.
 */
export class AtmosphereClient {

  private _aws: AwsClient | undefined;

  public constructor(private readonly endpoint: string, private readonly options: AtmosphereClientOptions = {}) {

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

    const timeoutSeconds = options.timeoutSeconds ?? 600;
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;

    let retryDelay = 1000; // start with 1 second
    const maxRetryDelay = 60000; // max 1 minute

    this.log(`Acquire | environment from pool '${options.pool}' (requester: '${options.requester}')`);
    while (true) {
      try {
        const acquired = await this.request('POST', '/allocations', {
          pool: options.pool,
          requester: options.requester,
        });
        this.log(`Acquire | Successfully acquired environment from pool ${options.pool} (requester: ${options.requester})`);
        return acquired;
      } catch (error: any) {

        // retry if no environment is available yet.
        if (error.statusCode === 423) {

          const elapsed = Date.now() - startTime;
          if (elapsed >= timeoutMs) {
            throw error;
          }

          this.log(`Acquire | Retrying due to: ${error.message}`);

          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay = Math.min(retryDelay * 2, maxRetryDelay);
          continue;
        }

        throw error;
      }
    }
  }

  /**
   * Release an environment based on the allocation id. After releasing an environment,
   * its provided credentials are deactivated.
   */
  public async release(allocationId: string, outcome: string) {
    this.log(`Release | Allocation '${allocationId}' (outcome: '${outcome}')`);
    const released = await this.request('DELETE', `/allocations/${allocationId}`, { outcome });
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

  private async request(method: string, path: string, body: any): Promise<any> {

    const aws = await this.aws();

    const response = await aws.fetch(`${this.endpoint}${path}`, {
      method,
      body: JSON.stringify(body),
    });

    const responseBody = await response.json() as any;

    if (response.status === 200) {
      return responseBody;
    }

    throw new ServiceError(response.status, responseBody.message ?? 'Unknown error', response.statusText);
  }

  private log(message: string) {
    const line = `[${new Date().toISOString()}] ${message}`;
    if (this.options.logStream) {
      this.options.logStream.write(`${line}\n`);
    } else {
      console.log(line);
    }
  }

}