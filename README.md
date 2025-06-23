# Polymer Simple Relayer Backend

A robust TypeScript/Bun backend relayer for cross-chain operations. This relayer monitors blockchain events on source chains, requests proofs, and executes transactions on destination chains.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Source Chain  │    │   Proof API     │    │  Dest Chain     │
│   Listeners     │────│   Service       │────│  Executors      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Job Queue     │
                    │   & SQLite DB   │
                    └─────────────────┘
```

Under the hood, the relayer operates as a stateful, service-oriented application. **Listeners** are dedicated to monitoring specific smart contract events on configured source chains. When a target event is detected, a **job** is created and enqueued into a persistent **SQLite database**, ensuring no events are lost. A central **Job Queue** processes these jobs based on their status. If a job requires cross-chain verification, the **Proof Service** communicates with an external API (e.g., the Polymer testnet proof API) to fetch a cryptographic proof. Once the proof is secured, an **Executor** service constructs and dispatches the final transaction to the destination chain, completing the cross-chain action. This architecture ensures reliability through persistent state and a robust retry mechanism for each stage of the process.

## 🚀 Features

- **Configuration-Driven**: Easily manage chains, contracts, and event mappings via a central JSON file.
- **Multi-chain Support**: Monitor multiple blockchains and relay between them simultaneously.
- **Reliable & Resilient**: Persistent job queue with automatic retries and state tracking in an SQLite database.
- **Pluggable Proofs**: Integrates with proof generation services like the Polymer API for verified cross-chain data.
- **Dynamic Destination Resolvers**: Sophisticated logic to determine where to send transactions based on event data.
- **Type-Safe & Modern**: Built with TypeScript and Bun for performance and developer experience.
- **Metrics & Logging**: Built-in, configurable logging and performance metrics.

## 📦 Installation

```bash
# Install dependencies
bun install

# Start the development server with auto-reload
bun run dev

# Or build and run for production
bun run build
bun run start
```

## 🐳 Running with Docker

For a consistent and portable environment, you can build and run the relayer using Docker.

1.  **Create a `.env` file** at the root of the project. This is necessary because the Docker container will need the environment variables to configure itself. You can copy the example:
    ```bash
    cp .env.example .env
    ```
    Then, edit the `.env` file with your RPC URLs and private key.

2.  **Build the Docker image:**
    ```bash
    docker build -t polymer-relayer .
    ```

3.  **Run the Docker container:**
    ```bash
    docker run --rm -it --env-file .env polymer-relayer
    ```
    The `--env-file` flag securely passes your environment variables to the container. The container will automatically use the `relayer.config.json` from the source code.

## ⚙️ Configuration

The entire relayer is controlled by a single `relayer.config.json` file. Use environment variables (e.g., `${PRIVATE_KEY}`) for sensitive data.

A fully documented version of the configuration can be found at `src/config/relayer.config.documented.jsonc`.

Below is a summary of the main sections:

### 1. Chains & Contracts

Define the blockchains and smart contracts the relayer will interact with.

```json
{
  "chains": {
    "baseSepolia": {
      "chainId": 84532,
      "rpc": "${BASE_SEPOLIA_RPC_URL}",
      "privateKey": "${PRIVATE_KEY}",
      "pollingInterval": 2000,
      "blockConfirmations": 1,
      "gasMultiplier": 1.1
    },
    "arbitrumSepolia": {
      "chainId": 421614,
      "rpc": "${ARBITRUM_SEPOLIA_RPC_URL}",
      "privateKey": "${PRIVATE_KEY}",
      "pollingInterval": 1000,
      "blockConfirmations": 1,
      "gasMultiplier": 1.0
    }
  },
  "contracts": {
    "StateSyncV2": {
      "baseSepolia": {
        "address": "0x53489524c94f1A9197c3399435013054174b121d",
        "type": "source"
      },
      "arbitrumSepolia": {
        "address": "0x324670730736B72A3EA73067F30c54F03B23934E",
        "type": "destination"
      }
    }
  }
}
```

### 2. Event Mappings

This is the core logic, linking a source event to a destination contract call.

```json
{
  "eventMappings": [
    {
      "name": "ValueSetCrossChain",
      "sourceEvent": {
        "contractName": "StateSyncV2",
        "eventName": "ValueSet",
        "eventSignature": "ValueSet(string key, bytes value)"
      },
      "destinationCall": {
        "contractName": "StateSyncV2",
        "methodName": "setValueFromSource",
        "methodSignature": "setValueFromSource(string key, bytes value, bytes proof)"
      },
      "destinationResolver": "baseToArbitrum",
      "proofRequired": true,
      "enabled": true
    }
  ]
}
```

### 3. Destination Resolvers

Define strategies to determine the destination chain for a given event.

```json
{
  "destinationResolvers": {
    "baseToArbitrum": {
      "type": "static",
      "destinations": ["arbitrumSepolia"]
    }
  }
}
```

### 4. Other Settings

```json
{
  "proofApi": {
    "baseUrl": "https://proof.testnet.polymer.zone",
    "timeout": 30000,
    "retryAttempts": 3
  },
  "database": {
    "path": "./relayer.db"
  },
  "logging": {
    "level": "info",
    "enableFileLogging": false
  }
}
```

## 🔧 Usage

### Starting the Relayer

The relayer will load its configuration from `relayer.config.json` by default.

```bash
# Development mode with file watching
bun run dev

# Production mode
bun run start

# Use a custom config file path
CONFIG_PATH=/path/to/your/config.json bun run start
```

### Database Operations

The application uses SQLite for state management. A few helpful scripts are included in `package.json`:

```bash
# Initialize the database schema (only needs to be run once)
bun run db:init

# View the contents of the jobs table
bun run db:view

# Clear the database for a fresh start
bun run db:clear
```

## 📊 Database Schema

### Jobs Table
```sql
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unique_id TEXT UNIQUE NOT NULL,
  source_chain TEXT NOT NULL,
  source_tx_hash TEXT NOT NULL,
  source_block_number INTEGER NOT NULL,
  dest_chain TEXT NOT NULL,
  dest_address TEXT NOT NULL,
  dest_method TEXT NOT NULL,
  dest_method_signature TEXT,
  event_data TEXT NOT NULL,
  proof_data TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  proof_required BOOLEAN DEFAULT 0,
  dest_tx_hash TEXT,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  last_retry_at TEXT,
  mapping_name TEXT
);
```

### Chain State Table
```sql
CREATE TABLE chain_state (
  chain_name TEXT PRIMARY KEY,
  last_processed_block INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
```

## 🔄 Job Processing Flow

1.  **Event Detection**: `ChainListener` services monitor each source chain for configured events.
2.  **Job Creation**: When a valid event is found, a new job is created in the `jobs` table with a `pending` status.
3.  **Proof Request**: The `JobQueue` sees the `pending` job. If `proofRequired` is true, it calls the `ProofService` to fetch a proof from the Polymer API. The job status becomes `proof_requested`.
4.  **Execution**: Once the proof is returned, the job status changes to `proof_ready`. The `JobQueue` then passes the job to the appropriate `ExecutorService`, which builds and sends the transaction to the destination chain.
5.  **Completion**: The job is marked as `completed` with the destination transaction hash. If any step fails, the job is marked `failed`, and the `JobQueue` will retry it up to a configured limit.

### Job Statuses
- `pending`: Waiting for proof request (if required) or execution.
- `proof_requested`: Proof API call is in progress.
- `proof_ready`: Proof has been obtained, ready for execution.
- `executing`: The transaction is being submitted to the destination chain.
- `completed`: The transaction has been successfully confirmed on-chain.
- `failed`: The job has failed. It will be retried automatically.

## 🛠️ Development

### Project Structure
```
src/
├── config/           # Relayer configuration files
├── listeners/        # Blockchain event listeners (ChainListener)
├── services/         # Core services (Database, Proof, Executor, DestinationResolver)
├── queue/            # Job queue and processors (JobQueue)
├── types/            # TypeScript type definitions
├── utils/            # Utilities (logger, metrics, config loader)
└── main.ts           # Application entry point (RelayerApp)
```

### Adding New Chains or Contracts

1.  Add the new chain and/or contract details to your `relayer.config.json` file.
2.  Restart the relayer.

The application will automatically create the necessary listeners and executors based on your configuration. No code changes are needed for simple additions.

## 📝 Logging

Logs are written to the console with clear, concise messages. The log level can be configured in `relayer.config.json`.

```
ℹ️  Starting Polymer Relayer { chains: [ 'baseSepolia', 'arbitrumSepolia' ], ... }
ℹ️  Initialized chain: baseSepolia { startBlock: 27379492, ... }
ℹ️  Created job: ValueSetCrossChain { jobId: 1, sourceTx: '0x...', ... }
ℹ️  Requesting proof for job 1 { txHash: '0x...', chain: 'baseSepolia' }
ℹ️  Proof obtained for job 1
ℹ️  Executing job 1: ValueSetCrossChain { destChain: 'arbitrumSepolia', ... }
ℹ️  Transaction submitted { txHash: '0x...', method: 'setValueFromSource' }
ℹ️  Transaction confirmed { txHash: '0x...', blockNumber: 165808112 }
ℹ️  Job 1 completed: ValueSetCrossChain { destTxHash: '0x...' }
```

## 🧪 Testing

```bash
# Run tests
bun test
```

## 🚨 Error Handling

The relayer includes robust error handling:
- **Automatic Retries**: Failed jobs are automatically retried with a delay.
- **Persistent Job Queue**: Jobs are stored in SQLite, so they are not lost if the relayer restarts.
- **Graceful Shutdown**: On SIGINT/SIGTERM, the relayer finishes in-flight work before exiting.
- **Configuration Validation**: The relayer validates your configuration file on startup to catch errors early.

## 🔒 Security

- **Private Key Management**: Use environment variables (e.g., `${PRIVATE_KEY}`) in your config to keep keys out of version control.
- **RPC Endpoint Security**: Use authenticated RPC endpoints for production workloads.
- **Input Validation**: The relayer validates event and method signatures to ensure data integrity.
- **Error Sanitization**: Sensitive data is excluded from logs where possible.

## 🤝 Contributing

1.  Fork the repository
2.  Create a feature branch: `git checkout -b feature/amazing-feature`
3.  Commit changes: `git commit -m 'Add amazing feature'`
4.  Push to branch: `git push origin feature/amazing-feature`
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For questions and support:
- Create an issue on GitHub
- Join our Discord community
- Read the documentation at [docs.polymerlabs.org](https://docs.polymerlabs.org) 