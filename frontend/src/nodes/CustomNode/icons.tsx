import React from 'react';
import { NodeType } from '@automflows/shared';
import { frontendPluginRegistry } from '../../plugins/registry';
import PlayCircleFilledWhiteTwoToneIcon from '@mui/icons-material/PlayCircleFilledWhiteTwoTone';
import LanguageIcon from '@mui/icons-material/Language';
import LinkIcon from '@mui/icons-material/Link';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CodeIcon from '@mui/icons-material/Code';
import LoopIcon from '@mui/icons-material/Loop';
import NumbersIcon from '@mui/icons-material/Numbers';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import InputIcon from '@mui/icons-material/Input';
import VerifiedIcon from '@mui/icons-material/Verified';
import HttpIcon from '@mui/icons-material/Http';
import TerminalIcon from '@mui/icons-material/Terminal';
import InventoryIcon from '@mui/icons-material/Inventory';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import StorageIcon from '@mui/icons-material/Storage';
import VerticalAlignCenterIcon from '@mui/icons-material/VerticalAlignCenter';
import CookieIcon from '@mui/icons-material/Cookie';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import DownloadIcon from '@mui/icons-material/Download';
import PictureInPictureIcon from '@mui/icons-material/PictureInPicture';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import TableChartIcon from '@mui/icons-material/TableChart';

export interface IconConfig {
  icon: React.ComponentType<{ sx?: any }>;
  color: string;
}

export const nodeIcons: Record<NodeType, IconConfig> = {
  [NodeType.START]: { icon: PlayCircleFilledWhiteTwoToneIcon, color: '#4CAF50' },
  [NodeType.OPEN_BROWSER]: { icon: LanguageIcon, color: '#2196F3' },
  [NodeType.CONTEXT_MANIPULATE]: { icon: SettingsIcon, color: '#9C27B0' },
  [NodeType.NAVIGATION]: { icon: LinkIcon, color: '#2196F3' },
  [NodeType.KEYBOARD]: { icon: KeyboardIcon, color: '#FF9800' },
  [NodeType.SCROLL]: { icon: VerticalAlignCenterIcon, color: '#9C27B0' },
  [NodeType.STORAGE]: { icon: CookieIcon, color: '#FF9800' },
  [NodeType.DIALOG]: { icon: ChatBubbleIcon, color: '#2196F3' },
  [NodeType.DOWNLOAD]: { icon: DownloadIcon, color: '#4CAF50' },
  [NodeType.IFRAME]: { icon: PictureInPictureIcon, color: '#9C27B0' },
  [NodeType.ACTION]: { icon: TouchAppIcon, color: '#9C27B0' },
  [NodeType.ELEMENT_QUERY]: { icon: TextFieldsIcon, color: '#4CAF50' },
  [NodeType.FORM_INPUT]: { icon: CheckBoxIcon, color: '#FF9800' },
  [NodeType.TYPE]: { icon: KeyboardIcon, color: '#FF9800' },
  [NodeType.SCREENSHOT]: { icon: CameraAltIcon, color: '#F44336' },
  [NodeType.WAIT]: { icon: ScheduleIcon, color: '#FFC107' },
  [NodeType.JAVASCRIPT_CODE]: { icon: CodeIcon, color: '#2196F3' },
  [NodeType.LOOP]: { icon: LoopIcon, color: '#9C27B0' },
  [NodeType.INT_VALUE]: { icon: NumbersIcon, color: '#2196F3' },
  [NodeType.STRING_VALUE]: { icon: DescriptionIcon, color: '#4CAF50' },
  [NodeType.BOOLEAN_VALUE]: { icon: CheckCircleIcon, color: '#4CAF50' },
  [NodeType.INPUT_VALUE]: { icon: InputIcon, color: '#FF9800' },
  [NodeType.VERIFY]: { icon: VerifiedIcon, color: '#4CAF50' },
  [NodeType.API_REQUEST]: { icon: HttpIcon, color: '#2196F3' },
  [NodeType.API_CURL]: { icon: TerminalIcon, color: '#9C27B0' },
  [NodeType.LOAD_CONFIG_FILE]: { icon: FolderIcon, color: '#FF9800' },
  [NodeType.SELECT_CONFIG_FILE]: { icon: FolderOpenIcon, color: '#FF9800' },
  [NodeType.DB_CONNECT]: { icon: StorageIcon, color: '#4CAF50' },
  [NodeType.DB_DISCONNECT]: { icon: StorageIcon, color: '#F44336' },
  [NodeType.DB_QUERY]: { icon: StorageIcon, color: '#2196F3' },
  [NodeType.CSV_HANDLE]: { icon: TableChartIcon, color: '#00BCD4' },
};

export function getNodeIcon(nodeType: NodeType | string): IconConfig | null {
  if (Object.values(NodeType).includes(nodeType as NodeType)) {
    return nodeIcons[nodeType as NodeType] || { icon: InventoryIcon, color: '#757575' };
  }
  
  // Special handling for setConfig.setConfig to use EditIcon
  if (nodeType === 'setConfig.setConfig') {
    return { icon: EditIcon, color: '#FF9800' };
  }
  
  const pluginNode = frontendPluginRegistry.getPluginNode(nodeType);
  if (pluginNode && pluginNode.icon) {
    // For plugin nodes, return null to use the string icon fallback
    return null;
  }
  
  return { icon: InventoryIcon, color: '#757575' };
}

// Helper function to convert hex color to rgba
export function hexToRgba(hex: string, alpha: number = 0.5): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substr(0, 2), 16);
  const g = parseInt(cleanHex.substr(2, 2), 16);
  const b = parseInt(cleanHex.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getNodeGlowColor(nodeType: NodeType | string, userBackgroundColor?: string): string {
  // Use user-selected backgroundColor if provided, otherwise fall back to node type color
  if (userBackgroundColor && userBackgroundColor !== '#1f2937') {
    return hexToRgba(userBackgroundColor, 0.5);
  }
  
  // Fall back to node type color
  if (Object.values(NodeType).includes(nodeType as NodeType)) {
    const iconConfig = nodeIcons[nodeType as NodeType];
    if (iconConfig) {
      return hexToRgba(iconConfig.color, 0.5);
    }
  }
  return 'rgba(117, 117, 117, 0.5)'; // Default grey glow
}
