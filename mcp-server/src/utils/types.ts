export interface AccessibilityNode {
  role?: string;
  name?: string;
  value?: string;
  level?: number;
  children?: AccessibilityNode[];
}
