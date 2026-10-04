/**
 * Utilities for formatting General & Student Ibada Kit descriptions
 */

/**
 * Formats the kit description for WhatsApp messages:
 * e.g., "1 Student Kit, 1 General Kit" or "2 Student Ibada Kits" or "2 General Ibada Kits"
 */
export function formatKitBreakdown(
  kitCount: number,
  generalKitCount?: number,
  studentKitCount?: number,
  kitStyle?: string
): string {
  const g = generalKitCount !== undefined && generalKitCount !== null ? Number(generalKitCount) : 0;
  const s = studentKitCount !== undefined && studentKitCount !== null ? Number(studentKitCount) : 0;

  if (s > 0 && g > 0) {
    return `${s} Student Kit${s > 1 ? 's' : ''}, ${g} General Kit${g > 1 ? 's' : ''}`;
  }
  if (s > 0 && g === 0) {
    return `${s} Student Ibada Kit${s > 1 ? 's' : ''}`;
  }
  if (g > 0 && s === 0) {
    return `${g} General Ibada Kit${g > 1 ? 's' : ''}`;
  }
  if (kitStyle === 'Student') {
    return `${kitCount} Student Ibada Kit${kitCount > 1 ? 's' : ''}`;
  }
  if (kitStyle === 'General') {
    return `${kitCount} General Ibada Kit${kitCount > 1 ? 's' : ''}`;
  }
  return `${kitCount} ${kitCount === 1 ? 'Kit' : 'Kits'}`;
}

/**
 * Formats the kit description with total count for badges and list views:
 * e.g., "2 Kits (1 Student + 1 General)"
 */
export function formatKitBreakdownWithTotal(
  kitCount: number,
  generalKitCount?: number,
  studentKitCount?: number,
  kitStyle?: string
): string {
  const g = generalKitCount !== undefined && generalKitCount !== null ? Number(generalKitCount) : 0;
  const s = studentKitCount !== undefined && studentKitCount !== null ? Number(studentKitCount) : 0;

  if (s > 0 && g > 0) {
    return `${kitCount} Kits (${s} Student + ${g} General)`;
  }
  if (s > 0 && g === 0) {
    return `${s} Student Kit${s > 1 ? 's' : ''}`;
  }
  if (g > 0 && s === 0) {
    return `${g} General Kit${g > 1 ? 's' : ''}`;
  }
  if (kitStyle === 'Student') {
    return `${kitCount} Student Kit${kitCount > 1 ? 's' : ''}`;
  }
  if (kitStyle === 'General') {
    return `${kitCount} General Kit${kitCount > 1 ? 's' : ''}`;
  }
  return `${kitCount} ${kitCount === 1 ? 'Kit' : 'Kits'}`;
}
