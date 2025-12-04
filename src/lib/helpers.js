//Sirve para cifrar y verificar contraseñas de forma segura con bcrypt.

// Importa la librería bcrypt para cifrar y comparar contraseñas
const bcrypt = require('bcrypt');
const CryptoJS = require('crypto-js');

const helpers = {};

// Función para cifrar una contraseña de forma segura
helpers.hashPassword = async (password) => {
    try {
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    } catch (error) {
        throw new Error('Error al cifrar la contraseña');
    }
};
// Función para comparar una contraseña ingresada con su versión cifrada

helpers.comparePassword = async (password, hashedPassword) => {
    try {
        const match = await bcrypt.compare(password, hashedPassword);
        return match;
    } catch (error) {
        throw new Error('Error al comparar contraseñas');
    }
};

// Función para encriptar datos (siguiendo el patrón del proyecto de referencia)
helpers.encryptDates = (datos) => {
    try {
        const claveSecreta = process.env.CLAVE_SECRETA || 'cifrarDatos';
        const cifrado = CryptoJS.AES.encrypt(JSON.stringify(datos), claveSecreta).toString();
        return cifrado;
    } catch (error) {
        console.error('Error al cifrar datos:', error.message);
        throw error;
    }
};

// Función para desencriptar datos
helpers.decryptDates = (cifrado) => {
    try {
        const claveSecreta = process.env.CLAVE_SECRETA || 'cifrarDatos';
        const bytes = CryptoJS.AES.decrypt(cifrado, claveSecreta);
        const datos = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        return datos;
    } catch (error) {
        console.error('Error al descifrar datos:', error.message);
        throw error;
    }
};

// Exporta el objeto helpers para que estas funciones puedan usarse en otros archivos
module.exports = helpers;