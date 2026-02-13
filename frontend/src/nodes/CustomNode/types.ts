import { PropertyEditorType } from '../../components/PropertyEditorPopup';

export interface PropertyPopupState {
  type: PropertyEditorType;
  label: string;
  field: string; // Store field name to read latest value
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  min?: number;
  max?: number;
}
