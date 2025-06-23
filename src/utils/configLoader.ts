import { readFileSync } from 'fs';
import type { RelayerConfig } from '../types/index.js';
import { logger } from './logger.js';

/**
 * Load and parse configuration with environment variable substitution
 */
export function loadConfig(configPath: string = './src/config/relayer.config.json'): RelayerConfig {
  try {
    const configContent = readFileSync(configPath, 'utf-8');
    const processedContent = substituteEnvironmentVariables(configContent);
    const config = JSON.parse(processedContent) as RelayerConfig;
    
    // Process private key with the same logic as Hardhat config
    processPrivateKeys(config);
    
    logger.info('Configuration loaded successfully', {
      chains: Object.keys(config.chains).length,
      contracts: Object.keys(config.contracts).length,
      eventMappings: config.eventMappings.length
    });
    
    return config;
  } catch (error) {
    logger.error('Failed to load configuration', error);
    throw new Error(`Configuration loading failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Substitute environment variables in configuration
 * Supports patterns like:
 * - ${VAR_NAME} - required variable
 * - ${VAR_NAME:default_value} - variable with default
 */
function substituteEnvironmentVariables(content: string): string {
  return content.replace(/\$\{([^}]+)\}/g, (match, varExpression) => {
    const [varName, defaultValue] = varExpression.split(':');
    const envValue = process.env[varName];
    
    if (envValue !== undefined) {
      return envValue;
    }
    
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    // For required variables without defaults, use empty string and log warning
    logger.warn(`Environment variable ${varName} not found and no default provided`);
    return '';
  });
}

/**
 * Process private keys with the same logic as Hardhat config
 */
function processPrivateKeys(config: RelayerConfig): void {
  const PRIVATE_KEY = process.env.PRIVATE_KEY
    ? process.env.PRIVATE_KEY.startsWith('0x') 
      ? process.env.PRIVATE_KEY 
      : `0x${process.env.PRIVATE_KEY}`
    : "0000000000000000000000000000000000000000000000000000000000000000";

  // Replace ${PRIVATE_KEY} placeholder with processed private key
  Object.values(config.chains).forEach(chainConfig => {
    if (chainConfig.privateKey === '${PRIVATE_KEY}' || chainConfig.privateKey === '') {
      chainConfig.privateKey = PRIVATE_KEY;
    }
  });
  
  if (PRIVATE_KEY === "0000000000000000000000000000000000000000000000000000000000000000") {
    logger.warn('Using default private key - set PRIVATE_KEY environment variable for production');
  }
}

/**
 * Validate configuration after loading
 */
export function validateConfig(config: RelayerConfig): string[] {
  const errors: string[] = [];
  
  // Validate chains have required fields
  Object.entries(config.chains).forEach(([chainName, chainConfig]) => {
    if (!chainConfig.rpc) {
      errors.push(`Chain ${chainName}: RPC URL is required`);
    }
    if (!chainConfig.privateKey || chainConfig.privateKey === "0000000000000000000000000000000000000000000000000000000000000000") {
      errors.push(`Chain ${chainName}: Valid private key is required`);
    }
    if (!chainConfig.chainId) {
      errors.push(`Chain ${chainName}: Chain ID is required`);
    }
  });
  
  // Validate contracts exist on chains
  config.eventMappings.forEach(mapping => {
    const sourceContract = config.contracts[mapping.sourceEvent.contractName];
    if (!sourceContract) {
      errors.push(`Mapping '${mapping.name}': Source contract '${mapping.sourceEvent.contractName}' not found`);
      return;
    }
    
    const destContract = config.contracts[mapping.destinationCall.contractName];
    if (!destContract) {
      errors.push(`Mapping '${mapping.name}': Destination contract '${mapping.destinationCall.contractName}' not found`);
      return;
    }
    
    // Check if contracts are deployed on at least one chain
    const sourceChains = Object.keys(sourceContract);
    const destChains = Object.keys(destContract);
    
    if (sourceChains.length === 0) {
      errors.push(`Mapping '${mapping.name}': Source contract has no deployments`);
    }
    if (destChains.length === 0) {
      errors.push(`Mapping '${mapping.name}': Destination contract has no deployments`);
    }
  });
  
  return errors;
} 