// BOWPI Crypto Service - Desencriptación de tokens JWT y servicios de criptografía

import { CryptoService, AuthTokenData, BOWPI_CONSTANTS } from '../types/bowpi';
// @ts-ignore
import CryptoJS from "crypto-js";
import { Buffer } from "buffer";


export class BowpiCryptoService implements CryptoService {
  
  /**
   * Desencripta un token JWT encriptado de BOWPI
   * 
   * ALGORITMO ESPECÍFICO:
   * 1. decodedToken = jwt_decode(encryptedToken)
   * 2. decryptedProfileJson = this.decrypt(decodedToken.data)
   * 3. decryptedProfile = JSON.parse(decryptedProfileJson)
   * 4. Combinar metadatos JWT + perfil desencriptado
   * 
   * @param encryptedToken Token JWT encriptado del servidor
   * @returns Datos del token desencriptados
   */
  decryptToken(encryptedToken: string): AuthTokenData {
    try {
      // Paso 1: Decodificar JWT sin verificar (solo obtener payload)
      const decodedToken = this.jwtDecode(encryptedToken);
      console.log("-------------------------------- TOKEN --------------------------------");
      
      if (!decodedToken || !decodedToken.data) {
        throw new Error('Invalid JWT token structure');
      }
      
      // Paso 2: Desencriptar la data del token
      const decryptedProfileJson = this.decrypt(decodedToken.data);
      console.log('Decrypted profile: ', decryptedProfileJson);
      // Paso 3: Parsear JSON desencriptado
      const decryptedProfile = JSON.parse(decryptedProfileJson);
      console.log('🔍 [BOWPI_CRYPTO] Decrypted profile keys:', Object.keys(decryptedProfile));
      console.log('🔍 [BOWPI_CRYPTO] officerCode:', decryptedProfile.officerCode);
      console.log('🔍 [BOWPI_CRYPTO] requestId:', decryptedProfile.requestId);
      
      // Paso 4: Combinar metadatos JWT + perfil desencriptado
      const authTokenData: AuthTokenData = {
        // Metadatos JWT estándar
        iss: decodedToken.iss || '',
        aud: decodedToken.aud || '',
        exp: decodedToken.exp || 0,
        iat: decodedToken.iat || 0,
        sub: decodedToken.sub || '',
        jti: decodedToken.jti || '',
        
        // Datos del perfil desencriptado - usar requestId como identificador principal
        userId: decryptedProfile.requestId || 'no-request-id',
        username: decryptedProfile.username || '',
        email: decryptedProfile.email || '',
        userProfile: decryptedProfile,
        permissions: decryptedProfile.permissions || [],
        roles: decryptedProfile.Groups || []
      };
      console.log("------------------------------ ENDTOKEN -------------------------------");     
      return authTokenData;
      
    } catch (error) {
      console.error('Error decrypting JWT token:', error);
      throw new Error('Failed to decrypt authentication token');
    }
  }


  /**
   * Decodifica JWT sin verificar firma (solo extrae payload)
   * Compatible con jwt-decode de Angular
   */
  private jwtDecode(token: string): any {
    try {
      // Remover 'Bearer ' si existe
      const cleanToken = token.replace(/^Bearer\s+/, '');
      
      // JWT tiene 3 partes separadas por '.'
      const parts = cleanToken.split('.');
      
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      // Decodificar payload (segunda parte)
      const payload = parts[1];
      
      // Agregar padding si es necesario para Base64
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      
      // Decodificar Base64
      const decodedPayload = Buffer.from(paddedPayload, 'base64').toString('binary');
      
      // Parsear JSON
      const jwtData = JSON.parse(decodedPayload);
      
      return jwtData;
      
    } catch (error) {
      console.error('Error decoding JWT:', error);
      throw new Error('Invalid JWT token');
    }
  }

  /**
   * Desencripta texto usando AES-256-CBC
   * Algoritmo compatible con implementación Angular/CryptoJS
   * 
   * @param encryptedText Texto encriptado en Base64
   * @returns Texto desencriptado
   */

  public decrypt(encryptedText: string): string {
    const key = CryptoJS.enc.Utf8.parse(BOWPI_CONSTANTS.ENCRYPTION_KEY);
    const iv = CryptoJS.enc.Utf8.parse(BOWPI_CONSTANTS.ENCRYPTION_IV);
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedText, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      return '';
    }
  }


}