import { PropertyDataType } from '@automflows/shared';

/**
 * TypeConverter utility for handling type conversions and validation
 * Supports numeric promotion: int → float → double
 */
export class TypeConverter {
  /**
   * Check if a value can be converted from sourceType to targetType
   * Allows numeric promotion (int → float → double)
   * Requires exact matches for string and boolean
   */
  static canConvert(sourceType: PropertyDataType, targetType: PropertyDataType): boolean {
    // Exact match always allowed
    if (sourceType === targetType) {
      return true;
    }

    // Numeric promotion allowed: int → float → double
    if (sourceType === PropertyDataType.INT && targetType === PropertyDataType.FLOAT) {
      return true;
    }
    if (sourceType === PropertyDataType.INT && targetType === PropertyDataType.DOUBLE) {
      return true;
    }
    if (sourceType === PropertyDataType.FLOAT && targetType === PropertyDataType.DOUBLE) {
      return true;
    }

    // Reverse conversions not allowed (would require explicit conversion)
    // String and boolean require exact matches
    return false;
  }

  /**
   * Convert a value from sourceType to targetType
   * Throws error if conversion is not allowed
   */
  static convert(value: any, sourceType: PropertyDataType, targetType: PropertyDataType): any {
    if (!this.canConvert(sourceType, targetType)) {
      throw new Error(
        `Cannot convert from ${sourceType} to ${targetType}. Only numeric promotion (int→float→double) is allowed.`
      );
    }

    // Exact match - return as is
    if (sourceType === targetType) {
      return value;
    }

    // Numeric promotion
    if (sourceType === PropertyDataType.INT && targetType === PropertyDataType.FLOAT) {
      return parseFloat(String(value));
    }
    if (sourceType === PropertyDataType.INT && targetType === PropertyDataType.DOUBLE) {
      return parseFloat(String(value));
    }
    if (sourceType === PropertyDataType.FLOAT && targetType === PropertyDataType.DOUBLE) {
      return parseFloat(String(value));
    }

    return value;
  }

  /**
   * Infer the PropertyDataType from a JavaScript value
   */
  static inferType(value: any): PropertyDataType {
    if (typeof value === 'string') {
      return PropertyDataType.STRING;
    }
    if (typeof value === 'boolean') {
      return PropertyDataType.BOOLEAN;
    }
    if (typeof value === 'number') {
      // Check if it's an integer or float
      if (Number.isInteger(value)) {
        return PropertyDataType.INT;
      }
      return PropertyDataType.FLOAT;
    }
    // Default to string for unknown types
    return PropertyDataType.STRING;
  }
}

