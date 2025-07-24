import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { DocumentType, DocumentMetadata } from '../types/database';

// File system configuration
const DOCUMENTS_DIR = `${FileSystem.documentDirectory}credibowpi/documents/`;
const TEMP_DIR = `${FileSystem.documentDirectory}credibowpi/temp/`;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png'];
const SUPPORTED_DOCUMENT_FORMATS = ['pdf', 'jpg', 'jpeg', 'png'];

export interface FileInfo {
  uri: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export class FileSystemService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create necessary directories
      await this.ensureDirectoryExists(DOCUMENTS_DIR);
      await this.ensureDirectoryExists(TEMP_DIR);
      
      this.initialized = true;
      console.log('FileSystem service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize FileSystem service:', error);
      throw error;
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
  }

  // Document storage methods
  async saveDocument(
    sourceUri: string,
    applicationId: string,
    documentType: DocumentType,
    fileName?: string
  ): Promise<{ localPath: string; metadata: DocumentMetadata }> {
    await this.initialize();

    try {
      // Generate unique filename if not provided
      const fileExtension = this.getFileExtension(sourceUri);
      const finalFileName = fileName || `${documentType}_${Date.now()}.${fileExtension}`;
      const destinationPath = `${DOCUMENTS_DIR}${applicationId}/${finalFileName}`;

      // Ensure application directory exists
      await this.ensureDirectoryExists(`${DOCUMENTS_DIR}${applicationId}/`);

      // Get file info before copying
      const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
      if (!sourceInfo.exists) {
        throw new Error('Source file does not exist');
      }

      // Validate file size
      if (sourceInfo.size && sourceInfo.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }

      // Copy file to documents directory
      await FileSystem.copyAsync({
        from: sourceUri,
        to: destinationPath,
      });

      // Get image dimensions if it's an image
      let dimensions: ImageDimensions = { width: 0, height: 0 };
      if (this.isImageFile(fileExtension)) {
        dimensions = await this.getImageDimensions(destinationPath);
      }

      // Calculate file checksum for integrity
      const checksum = await this.calculateFileChecksum(destinationPath);

      // Create metadata
      const metadata: DocumentMetadata = {
        timestamp: new Date(),
        quality: this.calculateImageQuality(dimensions, sourceInfo.size || 0),
        size: sourceInfo.size || 0,
        dimensions,
        checksum,
      };

      return {
        localPath: destinationPath,
        metadata,
      };
    } catch (error) {
      console.error('Failed to save document:', error);
      throw new Error(`Failed to save document: ${error.message}`);
    }
  }

  async getDocument(localPath: string): Promise<FileInfo | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (!fileInfo.exists) return null;

      return {
        uri: localPath,
        name: this.getFileName(localPath),
        size: fileInfo.size || 0,
        type: this.getFileExtension(localPath),
        lastModified: fileInfo.modificationTime || 0,
      };
    } catch (error) {
      console.error('Failed to get document info:', error);
      return null;
    }
  }

  async deleteDocument(localPath: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localPath);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  async moveToTemp(sourceUri: string): Promise<string> {
    await this.initialize();

    try {
      const fileName = `temp_${Date.now()}_${this.getFileName(sourceUri)}`;
      const tempPath = `${TEMP_DIR}${fileName}`;

      await FileSystem.moveAsync({
        from: sourceUri,
        to: tempPath,
      });

      return tempPath;
    } catch (error) {
      console.error('Failed to move file to temp:', error);
      throw new Error(`Failed to move file to temp: ${error.message}`);
    }
  }

  async cleanupTempFiles(): Promise<void> {
    try {
      const tempDirInfo = await FileSystem.getInfoAsync(TEMP_DIR);
      if (tempDirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(TEMP_DIR);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        for (const file of files) {
          const filePath = `${TEMP_DIR}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          
          if (fileInfo.exists && fileInfo.modificationTime) {
            const fileAge = now - fileInfo.modificationTime;
            if (fileAge > maxAge) {
              await FileSystem.deleteAsync(filePath);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }

  // Application-specific methods
  async getApplicationDocuments(applicationId: string): Promise<FileInfo[]> {
    try {
      const appDir = `${DOCUMENTS_DIR}${applicationId}/`;
      const dirInfo = await FileSystem.getInfoAsync(appDir);
      
      if (!dirInfo.exists) return [];

      const files = await FileSystem.readDirectoryAsync(appDir);
      const fileInfos: FileInfo[] = [];

      for (const fileName of files) {
        const filePath = `${appDir}${fileName}`;
        const fileInfo = await this.getDocument(filePath);
        if (fileInfo) {
          fileInfos.push(fileInfo);
        }
      }

      return fileInfos;
    } catch (error) {
      console.error('Failed to get application documents:', error);
      return [];
    }
  }

  async deleteApplicationDocuments(applicationId: string): Promise<void> {
    try {
      const appDir = `${DOCUMENTS_DIR}${applicationId}/`;
      const dirInfo = await FileSystem.getInfoAsync(appDir);
      
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(appDir);
      }
    } catch (error) {
      console.error('Failed to delete application documents:', error);
      throw new Error(`Failed to delete application documents: ${error.message}`);
    }
  }

  // Storage management
  async getStorageInfo(): Promise<{
    totalSpace: number;
    freeSpace: number;
    usedSpace: number;
    documentsSize: number;
  }> {
    try {
      const totalSpace = await FileSystem.getTotalDiskCapacityAsync() || 0;
      const freeSpace = await FileSystem.getFreeDiskStorageAsync() || 0;
      const usedSpace = totalSpace - freeSpace;
      const documentsSize = await this.getDirectorySize(DOCUMENTS_DIR);

      return {
        totalSpace,
        freeSpace,
        usedSpace,
        documentsSize,
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        totalSpace: 0,
        freeSpace: 0,
        usedSpace: 0,
        documentsSize: 0,
      };
    }
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      if (!dirInfo.exists) return 0;

      const files = await FileSystem.readDirectoryAsync(dirPath);
      let totalSize = 0;

      for (const file of files) {
        const filePath = `${dirPath}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.isDirectory) {
          totalSize += await this.getDirectorySize(`${filePath}/`);
        } else {
          totalSize += fileInfo.size || 0;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Failed to calculate directory size:', error);
      return 0;
    }
  }

  // Utility methods
  private getFileName(path: string): string {
    return path.split('/').pop() || '';
  }

  private getFileExtension(path: string): string {
    const fileName = this.getFileName(path);
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  }

  private isImageFile(extension: string): boolean {
    return SUPPORTED_IMAGE_FORMATS.includes(extension.toLowerCase());
  }

  private async getImageDimensions(imagePath: string): Promise<ImageDimensions> {
    try {
      // This would require expo-image-manipulator or similar
      // For now, return default dimensions
      return { width: 1920, height: 1080 };
    } catch (error) {
      console.error('Failed to get image dimensions:', error);
      return { width: 0, height: 0 };
    }
  }

  private calculateImageQuality(dimensions: ImageDimensions, fileSize: number): number {
    // Simple quality calculation based on resolution and file size
    const pixelCount = dimensions.width * dimensions.height;
    const bytesPerPixel = fileSize / pixelCount;
    
    // Normalize to 0-100 scale (higher is better)
    const quality = Math.min(100, Math.max(0, (bytesPerPixel * 10) * 100));
    return Math.round(quality);
  }

  private async calculateFileChecksum(filePath: string): Promise<string> {
    try {
      // Read file as base64 and calculate hash
      const fileContent = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        fileContent
      );
    } catch (error) {
      console.error('Failed to calculate file checksum:', error);
      return '';
    }
  }

  // Validation methods
  validateFileType(fileName: string, allowedTypes: string[]): boolean {
    const extension = this.getFileExtension(fileName);
    return allowedTypes.includes(extension);
  }

  validateImageFile(fileName: string): boolean {
    return this.validateFileType(fileName, SUPPORTED_IMAGE_FORMATS);
  }

  validateDocumentFile(fileName: string): boolean {
    return this.validateFileType(fileName, SUPPORTED_DOCUMENT_FORMATS);
  }
}

// Singleton instance
export const fileSystemService = new FileSystemService();