import * as https from 'https';

/**
 * Credentials for a specific environment.
 *
 */
export interface EnvironmentCredentials {
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

  /**
   * Credentials.
   */
  readonly credentials: EnvironmentCredentials;
}

/**
 * An allocation of a single environment.
 */
export interface EnvironmentAllocation {

  /**
   * The allocation id.
   */
  readonly allocationId: string;

  /**
   * The allocated environment.
   */
  readonly environment: Environment;
}

export interface AcquireOptions {
  /**
   * How many minutes to wait in case an environment is not immediately available.
   *
   * @default 10
   */
  readonly timeoutMinutes?: number;
}

/**
 * Client for the Atmosphere service.
 */
export class AtmosphereClient {

  public constructor(private readonly endpoint: string) {}

  /**
   * Waits until an environment could be allocated by the service.
   *
   * @returns allocation information.
   * @throws if an environment could not be acquired within the specified timeout.
   */
  public async acquire(options: AcquireOptions = {}): Promise<EnvironmentAllocation> {

    const timeoutMinutes = options.timeoutMinutes ?? 10;
    const startTime = Date.now();
    const timeoutMs = 60 * timeoutMinutes * 1000;

    let retryDelay = 1000; // start with 1 second
    const maxRetryDelay = 60000; // max 1 minute

    const req: https.RequestOptions = {
      path: '/allocations',
      method: 'POST',
    };

    while (true) {
      try {
        const res = await this.request(req);
        return res;
      } catch (error: any) {

        // retry if no environment is available yet.
        if (error.statusCode === 423) {

          const elapsed = Date.now() - startTime;
          if (elapsed >= timeoutMs) {
            throw new Error(`Failed to acquire environment within ${timeoutMinutes} minutes`);
          }

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
  public async release(allocationId: string) {

    const options: https.RequestOptions = {
      path: `/allocations/${allocationId}`,
      method: 'DELETE',
    };

    await this.request(options);
  }

  private async request(options: https.RequestOptions): Promise<any> {

    const req_opts: https.RequestOptions = {
      hostname: this.endpoint,
      port: 443,
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    return new Promise((resolve, reject) => {
      const req = https.request(req_opts, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {

          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          }

          // service should include a detailed error message in the 'message' field.
          const message = JSON.parse(data).message ?? 'Unknown error';
          const error = new Error(`${res.statusCode} (${res.statusMessage}): ${message}`);

          // so we can gracefully handle some specific http responses
          (error as any).statusCode = res.statusCode;

          reject(error);

        });

      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

}