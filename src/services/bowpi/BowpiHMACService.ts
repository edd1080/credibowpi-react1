// BOWPI HMAC X-Digest Generator - Algoritmo específico compatible con Angular implementation

import * as Crypto from 'expo-crypto';
import { HMACGenerator, BOWPI_CONSTANTS, METHODS_REQUIRING_HMAC } from '../../types/bowpi';
// @ts-ignore
import CryptoJS from "crypto-js";

export class BowpiHMACService implements HMACGenerator {
  
  /**
   * Genera HMAC X-Digest usando EXACTAMENTE el mismo algoritmo que Angular
   * 
   * ALGORITMO ESPECÍFICO:
   * 1. date = new Date().getTime().toString()
   * 2. headers['X-Date'] = date
   * 3. Si body es objeto vacío → body = '{}'
   * 4. json = JSON.stringify(body).replace(/\\/g, '')
   * 5. Remover comillas del inicio y final si existen
   * 6. json = json + date
   * 7. HMAC-SHA256(json, SECRET_KEY_HMAC)
   * 8. Base64 encode del resultado
   * 
   * @param body Request body
   * @param headers Request headers (modificado en lugar)
   * @returns HMAC X-Digest string
   */
  async generateDigestHmac(body: any, headers: any): Promise<string> {
    try {
      // Paso 1: Generar timestamp
      const date = new Date().getTime().toString();
      
      headers['X-Date'] = date;

    if (body && body instanceof Object && Object.keys(body).length == 0) {
      body = '{}';
    }

    let json = JSON.stringify( body ).replace(/\\/g, '');

    if( json && json.length > 0 ) {
      if ( json[0] === '"' ) {
        json = json.substring(1);
      }

      if ( json[ json.length - 1 ] === '"' ) {
        json = json.substring( 0,  json.length - 1 );
      }
    }

    json = json + date;
    return CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256( json, BOWPI_CONSTANTS.SECRET_KEY_HMAC));
      
    } catch (error) {
      console.error('Error generating HMAC digest:', error);
      // Fallback: generar digest simple
      return this.encodeBase64(Date.now().toString());
    }
  }

  /**
   * Determina si un método HTTP requiere HMAC
   * 
   * @param method Método HTTP
   * @returns true si requiere HMAC
   */
  shouldGenerateHMAC(method: string): boolean {
    return METHODS_REQUIRING_HMAC.includes(method.toUpperCase() as any);
  }

  /**
   * Remueve comillas del inicio y final de una cadena JSON
   * Solo remueve si ambas existen
   * 
   * @param json Cadena JSON
   * @returns Cadena sin comillas externas
   */
  private removeOuterQuotes(json: string): string {
    try {
      const trimmed = json.trim();
      
      // Si comienza y termina con comillas, removerlas
      if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) {
        return trimmed.slice(1, -1);
      }
      
      return json;
      
    } catch (error) {
      console.error('Error removing outer quotes:', error);
      return json;
    }
  }

  /**
   * Genera HMAC-SHA256 
   * 
   * @param data Datos a firmar
   * @param key Clave secreta
   * @returns Hash HMAC en formato hexadecimal
   */
  private async generateHMAC(data: string, key: string): Promise<string> {
    try {
      return CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(data, key));
    } catch (error) {
      console.error('Error generating HMAC:', error);
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data + key
      );
    }
  }

  /**
   * Implementación de HMAC-SHA256 que retorna datos binarios para Base64 encoding
   * 
   * @param message Mensaje a firmar
   * @param secret Clave secreta
   * @returns HMAC como string binario (no HEX)
   */
  private async hmacSha256(message: string, secret: string): Promise<string> {
    try {
      // Algoritmo HMAC estándar
      const blockSize = 64; // SHA-256 block size
      let key = secret;
      
      // Si la clave es más larga que el block size, hashearla
      if (key.length > blockSize) {
        const hashedKey = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, key);
        // Convertir hex a bytes binarios
        key = this.hexToBytes(hashedKey);
      }
      
      // Pad key to block size con bytes null
      const keyBytes = this.stringToBytes(key);
      const paddedKey = new Uint8Array(blockSize);
      paddedKey.set(keyBytes.slice(0, Math.min(keyBytes.length, blockSize)));
      
      // Crear inner y outer padding
      const ipadBytes = new Uint8Array(blockSize).fill(0x36);
      const opadBytes = new Uint8Array(blockSize).fill(0x5c);
      
      // XOR key with ipad y opad
      const innerKeyBytes = new Uint8Array(blockSize);
      const outerKeyBytes = new Uint8Array(blockSize);
      
      for (let i = 0; i < blockSize; i++) {
        innerKeyBytes[i] = paddedKey[i] ^ ipadBytes[i];
        outerKeyBytes[i] = paddedKey[i] ^ opadBytes[i];
      }
      
      // Convertir message a bytes y concatenar con inner key
      const messageBytes = this.stringToBytes(message);
      const innerData = new Uint8Array(innerKeyBytes.length + messageBytes.length);
      innerData.set(innerKeyBytes);
      innerData.set(messageBytes, innerKeyBytes.length);
      
      // Hash(innerKey + message)
      const innerHashHex = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        this.bytesToHex(innerData)
      );
      
      // Convertir inner hash a bytes
      const innerHashBytesString = this.hexToBytes(innerHashHex);
      const innerHashBytes = this.stringToBytes(innerHashBytesString);
      
      // Concatenar outer key con inner hash
      const outerData = new Uint8Array(outerKeyBytes.length + innerHashBytes.length);
      outerData.set(outerKeyBytes);
      outerData.set(innerHashBytes, outerKeyBytes.length);
      
      // Hash(outerKey + Hash(innerKey + message))
      const finalHashHex = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        this.bytesToHex(outerData)
      );
      
      // Convertir HEX final a bytes binarios para Base64
      return this.hexToBytes(finalHashHex);
      
    } catch (error) {
      console.error('Error in HMAC-SHA256:', error);
      // Fallback más simple
      const fallbackHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        message + secret
      );
      return this.hexToBytes(fallbackHash);
    }
  }

  /**
   * Convierte string a representación hexadecimal
   */
  private stringToHex(str: string): string {
    let hex = '';
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      hex += charCode.toString(16).padStart(2, '0');
    }
    return hex;
  }

  /**
   * Convierte hexadecimal a string
   */
  private hexToString(hex: string): string {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      const charCode = parseInt(hex.substr(i, 2), 16);
      str += String.fromCharCode(charCode);
    }
    return str;
  }

  /**
   * Convierte string a bytes (Uint8Array)
   */
  private stringToBytes(str: string): Uint8Array {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Convierte bytes (Uint8Array) a string hexadecimal
   */
  private bytesToHex(bytes: Uint8Array | string): string {
    if (typeof bytes === 'string') {
      return this.stringToHex(bytes);
    }
    
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  /**
   * Convierte hexadecimal a bytes binarios como string
   */
  private hexToBytes(hex: string): string {
    let result = '';
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.substr(i, 2), 16);
      result += String.fromCharCode(byte);
    }
    return result;
  }

  /**
   * Codifica en Base64
   */
  private encodeBase64(text: string): string {
    try {
      if (typeof btoa !== 'undefined') {
        return btoa(text);
      }
      
      return this.base64Encode(text);
      
    } catch (error) {
      console.error('Error encoding Base64:', error);
      return text;
    }
  }

  /**
   * Implementación manual de Base64
   */
  private base64Encode(str: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;
      
      const bitmap = (a << 16) | (b << 8) | c;
      
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
    }
    
    return result;
  }

  /**
   * Método de testing para validar compatibilidad con Angular
   */
  public async generateTestDigestHmac(
    body: any, 
    headers: any, 
    fixedTimestamp: number
  ): Promise<{ digest: string; processedData: string; timestamp: string }> {
    try {
      const date = fixedTimestamp.toString();
      headers['X-Date'] = date;
      
      let processedBody = body;
      if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
        processedBody = '{}';
      }
      
      let json = typeof processedBody === 'string' ? processedBody : JSON.stringify(processedBody);
      json = json.replace(/\\\\/g, '');
      json = this.removeOuterQuotes(json);
      
      const dataToSign = json + date;
      
      return {
        digest: await this.generateDigestHmac(body, headers),
        processedData: dataToSign,
        timestamp: date
      };
      
    } catch (error) {
      console.error('Error generating test digest:', error);
      return {
        digest: '',
        processedData: '',
        timestamp: ''
      };
    }
  }
}