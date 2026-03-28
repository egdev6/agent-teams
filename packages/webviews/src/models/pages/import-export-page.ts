export type ImportExportHostMessage =
  | { type: 'catalogExportDone'; success: boolean; error?: string }
  | { type: 'catalogImportDone'; success: boolean; added: number; skipped: number; error?: string }
  | { type: 'catalogResetDone'; success: boolean; error?: string }
  | { type: 'profileExportDone'; success: boolean; error?: string }
  | { type: 'profileImportDone'; success: boolean; filesWritten?: number; error?: string };
