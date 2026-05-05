/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MaterialType = 'raw' | 'med' | 'add';

export interface Material {
  id: string;
  type: MaterialType;
  code?: string;
  name: string;
  minStock?: number;
}

export interface FormulaItem {
  mi: string; // materialId
  mn: string; // materialName
  mc: string; // materialCode
  mt: MaterialType;
  w: number; // weight in kg
}

export interface Formula {
  id: string;
  code?: string;
  name: string;
  notes?: string;
  items: FormulaItem[];
}

export type OrderStatus = 'run' | 'done' | 'canceled';

export interface QCResult {
  protein?: number;
  fat?: number;
  fiber?: number;
  ash?: number;
  moisture?: number;
  notes?: string;
}

export interface Batch {
  id: string;
  orderId: string;
  batchNumber: number;
  startTime: string;
  endTime?: string;
  status: 'pending' | 'running' | 'completed';
  weight: number;
  actualWeight?: number;
  actualWeights?: Record<string, number>; // materialId -> actual weight
  notes?: string;
  operator?: string;
}

export interface Order {
  id: string;
  rn: string; // run number
  date: string;
  client: string;
  fmId: string;
  fmName: string;
  qty: number; // quantity in tons
  bw: number; // batch weight in kg
  status: OrderStatus;
  st: MaterialType[]; // printed columns in the report
  subtype?: string; // diagnostic, special additions, etc.
  breed?: string; // Bird breed (Cobb, Ross, etc.)
  ageWeek?: number; // Age of birds in weeks
  qc?: QCResult;
  batches?: Batch[];
}

export type UserRole = 'admin' | 'operator' | 'quality';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  name: string;
  lastLogin?: string;
}

export interface InventoryItem {
  id: string;
  stock: string; // stock value as string (could be empty or number)
}

export interface AppConfig {
  co: string; // company
  fa: string; // factory
  de: string; // department
  fc: string; // form code
  fv: string; // form version
  gsId?: string;
  gsKey?: string;
  gsUrl?: string;
  autoSave: boolean;
  emailAlerts?: boolean;
  adminEmail?: string;
}
