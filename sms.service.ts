/**
 * SMS Service for Bangladesh Phone Support
 * Handles OTP delivery and validation for local formatting
 */

export function validateBDPhone(phone: string): string | null {
    // Basic BD Phone Regex: 013 to 019 followed by 8 digits
    // Supports +880, 880, or just 01...
    let cleaned = phone.replace(/[^0-9]/g, '');
    
    if (cleaned.startsWith('880')) {
        cleaned = '0' + cleaned.substring(3);
    }
    
    if (cleaned.length === 10 && cleaned.startsWith('1')) {
        cleaned = '0' + cleaned;
    }

    const bdRegex = /^01[3-9]\d{8}$/;
    if (bdRegex.test(cleaned)) {
        return '+88' + cleaned;
    }
    
    return null;
}

export async function sendSMS(phone: string, message: string) {
    const validatedPhone = validateBDPhone(phone);
    if (!validatedPhone) {
        throw new Error("Invalid Bangladesh phone number format");
    }

    console.log(`[SMS-SERVICE] TARGET: ${validatedPhone} | CONTENT: ${message}`);

    // In production, integrate Twilio, Nagad, or other local gateways here
    // Example Twilio integration structure:
    /*
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);
    
    return client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: validatedPhone
    });
    */
    
    return true; // Mock success
}

export async function sendPhoneOTP(phone: string, otp: string) {
    const message = `Your Identity Verification Code for JobSwipe is: ${otp}. Valid for 5 minutes. DO NOT share this with anyone.`;
    return sendSMS(phone, message);
}
