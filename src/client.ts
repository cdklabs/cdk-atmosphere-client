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
 * An allocation constraint
 */
export interface Constraint {
  /**
   * The constraint type.
   */
  readonly type: string;
  /**
   * Value qualifying the constraint.
   * E.g. a list of regions.
   */
  readonly value: unknown;
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

  /**
   * Constraints used to fullfil this allocation, if any.
   */
  readonly constraints?: Constraint[];
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
  /**
   * Constraints imposed on the environment request.
   *
   * @default - no constraints
   */
  readonly constraints?: Constraint[];
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
  /**
   * AWS credentials to use for requests
   *
   * @default - Use standard AWS credential provider chain
   */
  readonly credentials?: Credentials;
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
          constraints: options.constraints,
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

  /**
   * Access the admin endpoint of the Atmosphere service.
   *
   * This API requires additional permissions to the admin endpoint, which are not normally
   * available to regular Atmosphere clients.
   */
  public admin(): AdminClient {
    return {
      listEnvironments: async (): Promise<AtmosphereEnvironment[]> => {
        this.log('AdminListEnvironments | Requesting list of environments');
        const environments = await this.request('GET', '/admin/environments');
        return environments;
      },
      dangerouslyAcquireSession: async (env: AtmosphereEnvironment): Promise<Credentials> => {
        this.log(`AdminDangerouslyAcquireSession | Requesting environment from pool '${env.pool}': ${env.account}/${env.region}`);
        const credentials: Credentials = await this.request('POST', `/admin/dangerously-acquire-session/${encodeURIComponent(env.pool)}/${encodeURIComponent(env.account)}/${encodeURIComponent(env.region)}`, undefined);
        this.log(`AdminDangerouslyAcquireSession | Successfully acquired environment from pool '${env.pool}': ${env.account}/${env.region}`);
        return credentials;
      },
    };
  }

  private async aws(): Promise<AwsClient> {
    if (!this._aws) {
      const creds = this.options.credentials ?? await fromNodeProviderChain()();
      this._aws = new AwsClient({
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
        service: 'execute-api',
      });
    }
    return this._aws;
  }

  private async request(method: 'GET', path: string): Promise<any>;
  private async request(method: 'POST' | 'DELETE', path: string, body: any): Promise<any>;
  private async request(method: string, path: string, body?: any): Promise<any> {
    const aws = await this.aws();

    const response = await aws.fetch(`${this.endpoint}${path}`, {
      method,
      // Fetch will throw an exception if we supply a body with 'GET'
      body: method !== 'GET' ? JSON.stringify(body) : undefined,
      headers: {
        ...method !== 'GET' ? { 'Content-Type': 'application/json' } : {},
      },
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

/**
 * The admin client interface
 */
export interface AdminClient {
  /**
   * Return a list of environments managed by the service.
   */
  listEnvironments(): Promise<AtmosphereEnvironment[]>;

  /**
   * Acquire a targeted session for a specific environment.
   *
   * In contrast to `acquire()`, this allows you to acquire a session for an environment
   * of your choice, even one that is currently locked by an existing allocation. Because
   * this method bypasses locks, it should be used with caution.
   *
   * This should *preferably* be used for read-only tasks, and if used for write
   * operations care should be taken not to interfere with running tests.
   */
  dangerouslyAcquireSession(environment: AtmosphereEnvironment): Promise<Credentials>;
}

export interface AtmosphereEnvironment {
  readonly pool: string;
  readonly account: string;
  readonly region: string;
}
