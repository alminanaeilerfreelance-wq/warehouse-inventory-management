import React from 'react';
import { renderSafeValue } from '../utils/renderSafe';

/**
 * SafeText Component
 * 
 * Renders any value safely without throwing React errors
 * Automatically converts objects to strings
 * 
 * Usage:
 * <SafeText value={product} /> 
 * <SafeText value={row.category} fallback="N/A" />
 */
export default function SafeText({ value, fallback = '—' }) {
  return <>{renderSafeValue(value, fallback)}</>;
}
