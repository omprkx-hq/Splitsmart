const dns = require('dns').promises;

/**
 * Validates syntax and verifies MX records via DNS.
 * Blocks fake domains (e.g. user@notarealdomain12345.com)
 * Allows valid mail exchanges (e.g. gmail.com, outlook.com, custom business domains)
 * 
 * @param {string} email 
 * @returns {Promise<{ isValid: boolean, error?: string, mxRecords?: any[] }>}
 */
async function validateRealEmail(email) {
    if (!email || typeof email !== 'string') {
        return { isValid: false, error: 'Email is required.' };
    }

    const trimmed = email.trim().toLowerCase();
    
    // Strict RFC 5322 standard regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(trimmed)) {
        return { 
            isValid: false, 
            error: 'Invalid email format. Please enter a valid email address.' 
        };
    }

    const parts = trimmed.split('@');
    if (parts.length !== 2) {
        return { isValid: false, error: 'Malformed email address.' };
    }

    const domain = parts[1];

    try {
        const mxRecords = await dns.resolveMx(domain);
        if (!mxRecords || mxRecords.length === 0) {
            return {
                isValid: false,
                error: 'This email address or domain does not exist. Please enter a real, valid email.'
            };
        }

        // Sort by priority (lowest priority number = preferred server)
        mxRecords.sort((a, b) => a.priority - b.priority);

        return {
            isValid: true,
            domain,
            mxRecords
        };
    } catch (err) {
        // DNS lookup errors: ENOTFOUND, ENODATA, NXDOMAIN, etc.
        return {
            isValid: false,
            error: 'This email address or domain does not exist. Please enter a real, valid email.'
        };
    }
}

module.exports = {
    validateRealEmail
};
