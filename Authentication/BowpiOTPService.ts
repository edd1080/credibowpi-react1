// BOWPI OTP Token Generator - Algoritmo específico compatible con Angular implementation

import { OTPTokenGenerator } from '../types/bowpi';

export class BowpiOTPService implements OTPTokenGenerator {
  
  /**
   * Genera OTPToken usando EXACTAMENTE el mismo algoritmo que Angular
   * 
   * ALGORITMO ESPECÍFICO:
   * 1. randomNumber = Math.floor(1000000 + Math.random() * 8999999)
   * 2. time = new Date().getTime()
   * 3. timeLength = time.toString().length
   * 4. product = getProduct(randomNumber) // Multiplicación de dígitos
   * 5. Concatenar: randomNumber + padLeft(timeLength, "0", 4) + time + padLeft("4000", "0", 4) + product
   * 6. Base64 encode del resultado
   */
  generateOTPToken(): string {
    try {
      // Paso 1: Generar número aleatorio de 7 dígitos (1000000 - 9999999)
      const randomNumber = Math.floor(1000000 + Math.random() * 8999999);
      // console.log('Paso 1: Número aleatorio:', randomNumber);
      // Paso 2: Obtener timestamp actual
      const time = new Date().getTime();
      // console.log('Paso 2: Timestamp:', time);
      // Paso 3: Obtener longitud del timestamp
      const timeLength = time.toString().length;
      // console.log('Paso 3: Longitud del timestamp:', timeLength);
      // Paso 4: Calcular producto de los dígitos del número aleatorio
      const product = this.getProduct(randomNumber);
      // console.log('Paso 4: Producto de los dígitos del número aleatorio:', product);
      // Paso 5: Concatenar todos los componentes en el orden específico según decodificación Java
      const concatenated = 
        randomNumber.toString() +                    // 1. Número aleatorio (7 dígitos)
        this.padLeft(timeLength.toString(), "0", 4) + // 2. Longitud del timestamp (4 dígitos)
        time.toString() +                            // 3. Timestamp (N dígitos)
        this.padLeft("4000", "0", 4) +                                     // 4. Milisegundos a agregar (4 dígitos)
        product.toString();                          // 5. Producto de dígitos (sin padding)
      // console.log('Paso 5: Concatenado:', concatenated);
      // Paso 6: Codificar en Base64
      const base64Token = btoa(concatenated);
      // console.log('Paso 6: Base64:', base64Token);
      return base64Token;
      
    } catch (error) {
      console.error('Error generating OTP token:', error);
      // Fallback: generar token simple en caso de error
      return this.encodeBase64(Date.now().toString());
    }
  }

  /**
   * Multiplica todos los dígitos de un número
   * Ejemplo: 123456 → 1*2*3*4*5*6 = 720
   * 
   * @param n Número para multiplicar sus dígitos
   * @returns Producto de todos los dígitos
   */
  public getProduct(n : any) {
    let product = 1;

    while (n != 0) {
      product = product * (n % 10);
      n = Math.floor(n / 10);
    }
    return product;
  }

  /**
   * Rellena una cadena a la izquierda hasta alcanzar el tamaño especificado
   * 
   * @param text Texto a rellenar
   * @param padChar Carácter de relleno
   * @param size Tamaño final deseado
   * @returns Texto rellenado
   */
  private padLeft(text: string, padChar: string, size: number): string {
    try {
      if (text.length >= size) {
        return text;
      }
      
      const padding = padChar.repeat(size - text.length);
      return padding + text;
      
    } catch (error) {
      console.error('Error padding text:', error);
      return text; // Fallback
    }
  }

  /**
   * Codifica una cadena en Base64
   * Compatible con implementación Angular
   * 
   * @param text Texto a codificar
   * @returns Texto codificado en Base64
   */
  private encodeBase64(text: string): string {
    try {
      // En React Native, usar btoa() o alternativa
      if (typeof btoa !== 'undefined') {
        return btoa(text);
      }
      
      // Fallback para React Native si btoa no está disponible
      return this.base64Encode(text);
      
    } catch (error) {
      console.error('Error encoding Base64:', error);
      return text; // Fallback
    }
  }

  /**
   * Implementación manual de Base64 para React Native
   * 
   * @param str Cadena a codificar
   * @returns Cadena codificada en Base64
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
   * 
   * @param randomNumber Número específico para testing
   * @param timestamp Timestamp específico para testing
   * @returns Token generado con parámetros específicos
   */
  public generateTestOTPToken(randomNumber: number, timestamp: number): string {
    try {
      const timeLength = timestamp.toString().length;
      const product = this.getProduct(randomNumber);
      
      const concatenated = 
        randomNumber.toString() +
        this.padLeft(timeLength.toString(), "0", 4) +
        timestamp.toString() +
        "4000" +
        product.toString();
      
      return this.encodeBase64(concatenated);
      
    } catch (error) {
      console.error('Error generating test OTP token:', error);
      return '';
    }
  }

  /**
   * Obtiene información detallada del último token generado (para debugging)
   */
  public getTokenInfo(): {
    randomNumber: number;
    timestamp: number;
    timeLength: number;
    product: number;
    concatenated: string;
    encoded: string;
  } | null {
    // Este método se usaría principalmente para debugging y testing
    const randomNumber = Math.floor(1000000 + Math.random() * 8999999);
    const timestamp = new Date().getTime();
    const timeLength = timestamp.toString().length;
    const product = this.getProduct(randomNumber);
    
    const concatenated = 
      randomNumber.toString() +
      this.padLeft(timeLength.toString(), "0", 4) +
      timestamp.toString() +
      "4000" +
      product.toString();
    
    const encoded = this.encodeBase64(concatenated);
    
    return {
      randomNumber,
      timestamp,
      timeLength,
      product,
      concatenated,
      encoded
    };
  }

  /**
   * Simula la decodificación Java para verificar compatibilidad
   */
  public validateTokenStructure(tokenB64: string): {
    isValid: boolean;
    details?: {
      randomNumber: number;
      timeLength: number;
      timestamp: number;
      millisToAdd: number;
      product: number;
      decodedToken: string;
    };
    error?: string;
  } {
    try {
      // Decodificar Base64
      const decodedToken = atob(tokenB64).trim();
      
      // Validar longitud mínima (7 dígitos del random number)
      if (decodedToken.length < 7) {
        return { isValid: false, error: 'Token too short (< 7)' };
      }

      // Extraer número aleatorio (primeros 7 dígitos)
      const randomNumber = parseInt(decodedToken.substring(0, 7));
      
      // Calcular producto esperado
      let resultMult = 1;
      for (let i = 0; i < 7; i++) {
        const digit = parseInt(decodedToken.charAt(i));
        resultMult = digit * resultMult;
      }

      // Extraer longitud del timestamp (posiciones 7-10)
      if (decodedToken.length < 11) {
        return { isValid: false, error: 'Token too short for timeLength' };
      }
      const timeLength = parseInt(decodedToken.substring(7, 11));

      // Extraer timestamp
      const timestampStart = 11;
      const timestampEnd = timestampStart + timeLength;
      if (decodedToken.length < timestampEnd) {
        return { isValid: false, error: 'Token too short for timestamp' };
      }
      const timestamp = parseInt(decodedToken.substring(timestampStart, timestampEnd));

      // Extraer producto (al final del token)
      const productStr = resultMult.toString();
      if (decodedToken.length < timestampEnd + productStr.length) {
        return { isValid: false, error: 'Token too short for product' };
      }
      
      // Verificar que el final coincida con el producto calculado
      const actualProductStr = decodedToken.substring(decodedToken.length - productStr.length);
      if (actualProductStr !== productStr) {
        return { isValid: false, error: `Product mismatch: expected ${productStr}, got ${actualProductStr}` };
      }

      // Extraer millisToAdd (entre timestamp y producto)
      const millisToAddStr = decodedToken.substring(timestampEnd, decodedToken.length - productStr.length);
      const millisToAdd = parseInt(millisToAddStr);

      return {
        isValid: true,
        details: {
          randomNumber,
          timeLength,
          timestamp,
          millisToAdd,
          product: resultMult,
          decodedToken
        }
      };

    } catch (error) {
      return { isValid: false, error: `Decode error: ${error instanceof Error ? error.message : 'Unknown'}` };
    }
  }
}