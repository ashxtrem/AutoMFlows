export interface PropertyRendererProps {
  renderData: any;
  handlePropertyChange: (key: string, value: any) => void;
  handleOpenPopup: (
    type: any,
    label: string,
    value: any,
    onChange: (value: any) => void,
    placeholder?: string,
    min?: number,
    max?: number,
    field?: string
  ) => void;
  renderPropertyRow: (propertyName: string, propertyElement: React.ReactNode, propertyIndex: number) => React.ReactNode;
  // Optional callbacks for special cases
  setShowCapabilitiesPopup?: (show: boolean) => void;
  setShowMarkdownEditor?: (show: boolean) => void;
  setShowSetConfigModal?: (show: boolean) => void;
  setSetConfigJsonValue?: (value: string) => void;
  setSetConfigOriginalJsonValue?: (value: string) => void;
  setSetConfigJsonError?: (error: string | null) => void;
  // For config file nodes
  id?: string;
  storeNodes?: any[];
  setSelectedNode?: (node: any) => void;
}

export type PropertyRenderer = (props: PropertyRendererProps) => React.ReactNode;
