import { PluginManifest, PluginNodeDefinition } from '@automflows/shared';
import { ComponentType } from 'react';

export interface PluginConfigComponentProps {
  node: any;
  onChange: (field: string, value: any) => void;
}

export interface LoadedPluginNode {
  definition: PluginNodeDefinition;
  configComponent?: ComponentType<PluginConfigComponentProps>;
  icon?: string;
}

export interface FrontendPlugin {
  id: string;
  manifest: PluginManifest;
  nodes: Map<string, LoadedPluginNode>;
}

