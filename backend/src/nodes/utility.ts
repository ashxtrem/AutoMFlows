// Re-export handlers from handlers/ directory for backward compatibility
// This file is kept for backward compatibility. New code should import from './handlers' directly.
export {
  ElementQueryHandler,
  ScreenshotHandler,
  WaitHandler,
  IntValueHandler,
  StringValueHandler,
  BooleanValueHandler,
  InputValueHandler,
  VerifyHandler,
  StorageHandler,
  DialogHandler,
  DownloadHandler,
  IframeHandler,
} from './handlers';
