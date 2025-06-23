import type { DestinationResolver, EventMapping } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class DestinationResolverService {
  private resolvers: Map<string, DestinationResolver> = new Map();
  private customResolvers: Map<string, Function> = new Map();

  constructor(resolvers: Record<string, DestinationResolver>) {
    Object.entries(resolvers).forEach(([name, resolver]) => {
      this.resolvers.set(name, resolver);
    });
    
    // Load custom resolvers if they exist
    this.loadCustomResolvers();
  }

  /**
   * Resolve destination chain(s) for a given event and mapping
   */
  async resolveDestinations(
    mapping: EventMapping,
    eventData: any,
    sourceChain: string
  ): Promise<string[]> {
    const resolver = this.resolvers.get(mapping.destinationResolver);
    
    if (!resolver) {
      throw new Error(`Destination resolver '${mapping.destinationResolver}' not found`);
    }

    logger.debug(`Resolving destinations using '${mapping.destinationResolver}'`, {
      mapping: mapping.name,
      sourceChain,
      resolverType: resolver.type
    });

    try {
      switch (resolver.type) {
        case 'eventParameter':
          return this.resolveFromEventParameter(resolver, eventData, sourceChain);
          
        case 'static':
          return this.resolveStatic(resolver, sourceChain);
          
        case 'custom':
          return await this.resolveCustom(resolver, mapping, eventData, sourceChain);
          
        default:
          throw new Error(`Unknown resolver type: ${resolver.type}`);
      }
    } catch (error) {
      logger.error(`Failed to resolve destinations`, {
        resolver: mapping.destinationResolver,
        mapping: mapping.name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Resolve destinations from event parameter
   */
  private resolveFromEventParameter(
    resolver: DestinationResolver,
    eventData: any,
    sourceChain: string
  ): string[] {
    if (!resolver.parameterName) {
      throw new Error('Event parameter resolver missing parameterName');
    }

    const paramValue = eventData.args?.[resolver.parameterName];
    if (paramValue === undefined) {
      throw new Error(`Parameter '${resolver.parameterName}' not found in event data`);
    }

    // Convert parameter value to string for consistent handling
    const paramValueStr = paramValue.toString();

    // If there's a mapping, use it
    if (resolver.mapping) {
      const destination = resolver.mapping[paramValueStr];
      if (!destination) {
        throw new Error(`No mapping found for parameter value '${paramValueStr}'`);
      }
      return [destination];
    }

    // Otherwise, use the parameter value directly as chain name
    return [paramValueStr];
  }

  /**
   * Resolve static destinations
   */
  private resolveStatic(
    resolver: DestinationResolver,
    sourceChain: string
  ): string[] {
    if (!resolver.destinations || resolver.destinations.length === 0) {
      throw new Error('Static resolver missing destinations');
    }

    // Filter out source chain to avoid self-sends
    return resolver.destinations.filter(dest => dest !== sourceChain);
  }

  /**
   * Resolve using custom logic
   */
  private async resolveCustom(
    resolver: DestinationResolver,
    mapping: EventMapping,
    eventData: any,
    sourceChain: string
  ): Promise<string[]> {
    if (!resolver.customFunction) {
      throw new Error('Custom resolver missing customFunction');
    }

    const customResolver = this.customResolvers.get(resolver.customFunction);
    if (!customResolver) {
      throw new Error(`Custom resolver function '${resolver.customFunction}' not found`);
    }

    try {
      const result = await customResolver(mapping, eventData, sourceChain);
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      throw new Error(`Custom resolver '${resolver.customFunction}' failed: ${error}`);
    }
  }

  /**
   * Load custom resolver functions
   */
  private loadCustomResolvers() {
    // TODO: Load external custom resolvers from ./resolvers/ directory
    // This would scan for .ts/.js files and import them dynamically
  }

  /**
   * Register a custom resolver function
   */
  registerCustomResolver(name: string, resolverFunction: Function) {
    this.customResolvers.set(name, resolverFunction);
    logger.debug(`Registered custom resolver: ${name}`);
  }

  /**
   * Validate that all referenced destination resolvers exist
   */
  validateMappings(mappings: EventMapping[]): string[] {
    const errors: string[] = [];
    
    mappings.forEach(mapping => {
      if (!this.resolvers.has(mapping.destinationResolver)) {
        errors.push(`Mapping '${mapping.name}' references unknown resolver '${mapping.destinationResolver}'`);
      }
    });

    return errors;
  }

  /**
   * Get resolver configuration for debugging
   */
  getResolverConfig(name: string): DestinationResolver | undefined {
    return this.resolvers.get(name);
  }

  /**
   * List all available resolvers
   */
  listResolvers(): string[] {
    return Array.from(this.resolvers.keys());
  }
} 