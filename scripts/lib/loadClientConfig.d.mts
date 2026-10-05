/**
 * The client config file loader types module
 * This module is responsible for typing the cht-main client config loader.
 */

export const CLIENT_CONFIG_FILENAMES: readonly string[];

export function findClientConfigPath(dir: string): string | null;

export function clearClientConfigLoadCache(): void;

export function loadClientConfigFromDir(dir: string): {
    configPath: string;
    config: Record<string, unknown>;
};
