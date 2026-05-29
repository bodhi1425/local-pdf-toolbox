import { mountMerge } from './merge';
import { mountSplit } from './split';
import { mountOrganize } from './organize';
import { mountCompress } from './compress';
import { mountWatermark } from './watermark';
import { mountToImages } from './toImages';
import { mountImagesToPdf } from './imagesToPdf';
import { mountExtractText } from './extractText';

/** 工具 id → 挂载函数。id 与 scripts/site.config.mjs 中的 id 一一对应。 */
export const TOOL_MOUNTS: Record<string, (el: HTMLElement) => void> = {
  merge: mountMerge,
  split: mountSplit,
  organize: mountOrganize,
  compress: mountCompress,
  watermark: mountWatermark,
  'pdf-to-image': mountToImages,
  'image-to-pdf': mountImagesToPdf,
  'extract-text': mountExtractText,
};
