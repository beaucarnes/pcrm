export type CloudinaryWidgetOptions = {
  cloudName: string | undefined;
  uploadPreset: string | undefined;
  maxFiles: number;
  sources: string[];
  cropping: boolean;
  croppingAspectRatio: number;
  croppingShowDimensions: boolean;
  croppingValidateDimensions: boolean;
  croppingShowBackButton: boolean;
  croppingDefaultSelectionRatio: number;
  croppingCoordinatesMode: string;
  showSkipCropButton: boolean;
  multiple: boolean;
  clientAllowedFormats: string[];
  maxImageFileSize: number;
  showAdvancedOptions: boolean;
  defaultSource: string;
  singleUploadAutoClose: boolean;
  theme: string;
  resourceType: string;
  folder: string;
  eager?: Array<{ crop: string; gravity: string; width: number; height: number }>;
  eagerAsync?: boolean;
  styles: {
    palette: {
      window: string;
      windowBorder: string;
      tabIcon: string;
      menuIcons: string;
      textDark: string;
      textLight: string;
      link: string;
      action: string;
      inactiveTabIcon: string;
      error: string;
      inProgress: string;
      complete: string;
      sourceBg: string;
    };
    fonts: {
      default: null;
      [key: string]: { url: string; active: boolean } | null;
    };
  };
}

declare global {
  interface Window {
    cloudinary: {
      createUploadWidget: (
        options: CloudinaryWidgetOptions,
        callback: (error: Error | null, result: { event: string; info?: { secure_url: string } }) => void
      ) => { open: () => void };
    };
  }
} 