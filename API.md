# API Reference <a name="API Reference" id="api-reference"></a>


## Structs <a name="Structs" id="Structs"></a>

### AcquireOptions <a name="AcquireOptions" id="@cdklabs/cdk-atmosphere-client.AcquireOptions"></a>

#### Initializer <a name="Initializer" id="@cdklabs/cdk-atmosphere-client.AcquireOptions.Initializer"></a>

```typescript
import { AcquireOptions } from '@cdklabs/cdk-atmosphere-client'

const acquireOptions: AcquireOptions = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-atmosphere-client.AcquireOptions.property.timeoutMinutes">timeoutMinutes</a></code> | <code>number</code> | How many minutes to wait in case an environment is not immediately available. |

---

##### `timeoutMinutes`<sup>Optional</sup> <a name="timeoutMinutes" id="@cdklabs/cdk-atmosphere-client.AcquireOptions.property.timeoutMinutes"></a>

```typescript
public readonly timeoutMinutes: number;
```

- *Type:* number
- *Default:* 10

How many minutes to wait in case an environment is not immediately available.

---

### Environment <a name="Environment" id="@cdklabs/cdk-atmosphere-client.Environment"></a>

Environment information.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-atmosphere-client.Environment.Initializer"></a>

```typescript
import { Environment } from '@cdklabs/cdk-atmosphere-client'

const environment: Environment = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-atmosphere-client.Environment.property.account">account</a></code> | <code>string</code> | Account ID. |
| <code><a href="#@cdklabs/cdk-atmosphere-client.Environment.property.credentials">credentials</a></code> | <code><a href="#@cdklabs/cdk-atmosphere-client.EnvironmentCredentials">EnvironmentCredentials</a></code> | Credentials. |
| <code><a href="#@cdklabs/cdk-atmosphere-client.Environment.property.region">region</a></code> | <code>string</code> | Region. |

---

##### `account`<sup>Required</sup> <a name="account" id="@cdklabs/cdk-atmosphere-client.Environment.property.account"></a>

```typescript
public readonly account: string;
```

- *Type:* string

Account ID.

---

##### `credentials`<sup>Required</sup> <a name="credentials" id="@cdklabs/cdk-atmosphere-client.Environment.property.credentials"></a>

```typescript
public readonly credentials: EnvironmentCredentials;
```

- *Type:* <a href="#@cdklabs/cdk-atmosphere-client.EnvironmentCredentials">EnvironmentCredentials</a>

Credentials.

---

##### `region`<sup>Required</sup> <a name="region" id="@cdklabs/cdk-atmosphere-client.Environment.property.region"></a>

```typescript
public readonly region: string;
```

- *Type:* string

Region.

---

### EnvironmentAllocation <a name="EnvironmentAllocation" id="@cdklabs/cdk-atmosphere-client.EnvironmentAllocation"></a>

An allocation of a single environment.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-atmosphere-client.EnvironmentAllocation.Initializer"></a>

```typescript
import { EnvironmentAllocation } from '@cdklabs/cdk-atmosphere-client'

const environmentAllocation: EnvironmentAllocation = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-atmosphere-client.EnvironmentAllocation.property.allocationId">allocationId</a></code> | <code>string</code> | The allocation id. |
| <code><a href="#@cdklabs/cdk-atmosphere-client.EnvironmentAllocation.property.environment">environment</a></code> | <code><a href="#@cdklabs/cdk-atmosphere-client.Environment">Environment</a></code> | The allocated environment. |

---

##### `allocationId`<sup>Required</sup> <a name="allocationId" id="@cdklabs/cdk-atmosphere-client.EnvironmentAllocation.property.allocationId"></a>

```typescript
public readonly allocationId: string;
```

- *Type:* string

The allocation id.

---

##### `environment`<sup>Required</sup> <a name="environment" id="@cdklabs/cdk-atmosphere-client.EnvironmentAllocation.property.environment"></a>

```typescript
public readonly environment: Environment;
```

- *Type:* <a href="#@cdklabs/cdk-atmosphere-client.Environment">Environment</a>

The allocated environment.

---

### EnvironmentCredentials <a name="EnvironmentCredentials" id="@cdklabs/cdk-atmosphere-client.EnvironmentCredentials"></a>

Credentials for a specific environment.

#### Initializer <a name="Initializer" id="@cdklabs/cdk-atmosphere-client.EnvironmentCredentials.Initializer"></a>

```typescript
import { EnvironmentCredentials } from '@cdklabs/cdk-atmosphere-client'

const environmentCredentials: EnvironmentCredentials = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-atmosphere-client.EnvironmentCredentials.property.accessKeyId">accessKeyId</a></code> | <code>string</code> | AccessKeyId. |
| <code><a href="#@cdklabs/cdk-atmosphere-client.EnvironmentCredentials.property.secretAccessKey">secretAccessKey</a></code> | <code>string</code> | SecretAccessKey. |
| <code><a href="#@cdklabs/cdk-atmosphere-client.EnvironmentCredentials.property.sessionToken">sessionToken</a></code> | <code>string</code> | SessionToken. |

---

##### `accessKeyId`<sup>Required</sup> <a name="accessKeyId" id="@cdklabs/cdk-atmosphere-client.EnvironmentCredentials.property.accessKeyId"></a>

```typescript
public readonly accessKeyId: string;
```

- *Type:* string

AccessKeyId.

---

##### `secretAccessKey`<sup>Required</sup> <a name="secretAccessKey" id="@cdklabs/cdk-atmosphere-client.EnvironmentCredentials.property.secretAccessKey"></a>

```typescript
public readonly secretAccessKey: string;
```

- *Type:* string

SecretAccessKey.

---

##### `sessionToken`<sup>Required</sup> <a name="sessionToken" id="@cdklabs/cdk-atmosphere-client.EnvironmentCredentials.property.sessionToken"></a>

```typescript
public readonly sessionToken: string;
```

- *Type:* string

SessionToken.

---

## Classes <a name="Classes" id="Classes"></a>

### AtmosphereClient <a name="AtmosphereClient" id="@cdklabs/cdk-atmosphere-client.AtmosphereClient"></a>

Client for the Atmosphere service.

#### Initializers <a name="Initializers" id="@cdklabs/cdk-atmosphere-client.AtmosphereClient.Initializer"></a>

```typescript
import { AtmosphereClient } from '@cdklabs/cdk-atmosphere-client'

new AtmosphereClient(endpoint: string)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@cdklabs/cdk-atmosphere-client.AtmosphereClient.Initializer.parameter.endpoint">endpoint</a></code> | <code>string</code> | *No description.* |

---

##### `endpoint`<sup>Required</sup> <a name="endpoint" id="@cdklabs/cdk-atmosphere-client.AtmosphereClient.Initializer.parameter.endpoint"></a>

- *Type:* string

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@cdklabs/cdk-atmosphere-client.AtmosphereClient.acquire">acquire</a></code> | Waits until an environment could be allocated by the service. |
| <code><a href="#@cdklabs/cdk-atmosphere-client.AtmosphereClient.release">release</a></code> | Release an environment based on the allocation id. |

---

##### `acquire` <a name="acquire" id="@cdklabs/cdk-atmosphere-client.AtmosphereClient.acquire"></a>

```typescript
public acquire(options?: AcquireOptions): EnvironmentAllocation
```

Waits until an environment could be allocated by the service.

###### `options`<sup>Optional</sup> <a name="options" id="@cdklabs/cdk-atmosphere-client.AtmosphereClient.acquire.parameter.options"></a>

- *Type:* <a href="#@cdklabs/cdk-atmosphere-client.AcquireOptions">AcquireOptions</a>

---

##### `release` <a name="release" id="@cdklabs/cdk-atmosphere-client.AtmosphereClient.release"></a>

```typescript
public release(allocationId: string): void
```

Release an environment based on the allocation id.

After releasing an environment,
its provided credentials are deactivated.

###### `allocationId`<sup>Required</sup> <a name="allocationId" id="@cdklabs/cdk-atmosphere-client.AtmosphereClient.release.parameter.allocationId"></a>

- *Type:* string

---





