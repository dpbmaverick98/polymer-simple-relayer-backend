#!/usr/bin/env node

// Simple test script to verify configuration loading
// Run with: PRIVATE_KEY=0x123... node test-config.js

import { loadConfig, validateConfig } from './src/utils/configLoader.js';

async function testConfig() {
  try {
    console.log('🔧 Testing configuration loading...\n');
    
    // Load config
    const config = loadConfig('./src/config/relayer.config.json');
    
    console.log('✅ Configuration loaded successfully!');
    console.log(`📊 Chains: ${Object.keys(config.chains).join(', ')}`);
    console.log(`📄 Contracts: ${Object.keys(config.contracts).join(', ')}`);
    console.log(`🔗 Event Mappings: ${config.eventMappings.length}`);
    
    // Show private key handling
    console.log('\n🔑 Private Key Configuration:');
    Object.entries(config.chains).forEach(([chainName, chainConfig]) => {
      const keyPreview = chainConfig.privateKey.substring(0, 6) + '...' + chainConfig.privateKey.substring(-4);
      console.log(`  ${chainName}: ${keyPreview}`);
    });
    
    // Show RPC configuration
    console.log('\n🌐 RPC Configuration:');
    Object.entries(config.chains).forEach(([chainName, chainConfig]) => {
      console.log(`  ${chainName}: ${chainConfig.rpc}`);
    });
    
    // Validate config
    console.log('\n🔍 Validating configuration...');
    const errors = validateConfig(config);
    
    if (errors.length === 0) {
      console.log('✅ Configuration validation passed!');
    } else {
      console.log('❌ Configuration validation failed:');
      errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n🎉 Configuration test completed!');
    
  } catch (error) {
    console.error('❌ Configuration test failed:', error.message);
    process.exit(1);
  }
}

testConfig(); 