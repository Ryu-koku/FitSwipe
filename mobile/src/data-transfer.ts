import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { localDay } from './logic';

// Large exports exceed Android's ~1MB share-intent limit as message text, so
// they always travel as a file.
const MAX_IMPORT_BYTES = 32 * 1024 * 1024;

export async function shareTextFile(prefix: string, extension: 'json' | 'csv', text: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('この端末ではファイルを共有できません。');
  const file = new File(Paths.cache, `${prefix}-${localDay(new Date())}.${extension}`);
  if (file.exists) file.delete();
  // The BOM lets spreadsheet apps read Japanese CSV as UTF-8; import strips it.
  await file.write(extension === 'csv' ? `\uFEFF${text}` : text);
  await Sharing.shareAsync(file.uri, {
    mimeType: extension === 'json' ? 'application/json' : 'text/csv',
    dialogTitle: prefix,
  });
}

// Returns undefined when the user cancels the picker.
export async function pickTextFile(): Promise<string | undefined> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) return undefined;
  const asset = result.assets[0];
  if (asset.size !== undefined && asset.size > MAX_IMPORT_BYTES) throw new Error('ファイルが大きすぎます。記録は変更していません。');
  const file = new File(asset.uri);
  try {
    return await file.text();
  } finally {
    if (file.exists) file.delete();
  }
}
