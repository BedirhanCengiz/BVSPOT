import axios from 'axios';

const SMS_PROVIDER = process.env.SMS_PROVIDER || 'netgsm';

/**
 * SMS gönderme servisi
 * Birden fazla sağlayıcı desteği
 */
export async function sendSMS(phone, message) {
  try {
    switch (SMS_PROVIDER.toLowerCase()) {
      case 'netgsm':
        return await sendViaNetGSM(phone, message);
      case 'twilio':
        return await sendViaTwilio(phone, message);
      case 'turkcell':
        return await sendViaTurkcell(phone, message);
      case 'turktelekom':
        return await sendViaTurkTelekom(phone, message);
      default:
        // Test modu - SMS göndermeden başarılı döner
        console.log(`[TEST SMS] To: ${phone}, Message: ${message}`);
        return { success: true, provider: 'test' };
    }
  } catch (error) {
    console.error('SMS gönderme hatası:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * NetGSM SMS gönderimi
 */
async function sendViaNetGSM(phone, message) {
  const username = process.env.NETGSM_USERNAME;
  const password = process.env.NETGSM_PASSWORD;
  const msgHeader = process.env.NETGSM_MSGHEADER || 'VINTRA';

  if (!username || !password) {
    console.warn('NetGSM credentials not configured, using test mode');
    return { success: true, provider: 'netgsm-test' };
  }

  try {
    // Telefon numarasını temizle (0 ile başlıyorsa 90 ekle)
    let cleanPhone = phone.replace(/\s+/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '90' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('90')) {
      cleanPhone = '90' + cleanPhone;
    }

    const url = 'https://api.netgsm.com.tr/sms/send/get';
    const params = new URLSearchParams({
      usercode: username,
      password: password,
      gsmno: cleanPhone,
      message: message,
      msgheader: msgHeader,
      dil: 'TR'
    });

    const response = await axios.get(`${url}?${params.toString()}`);

    // NetGSM başarılı yanıtı genelde "00" ile başlar
    if (response.data && response.data.startsWith('00')) {
      return { success: true, provider: 'netgsm', messageId: response.data };
    } else {
      return { success: false, error: `NetGSM error: ${response.data}`, provider: 'netgsm' };
    }
  } catch (error) {
    return { success: false, error: error.message, provider: 'netgsm' };
  }
}

/**
 * Twilio SMS gönderimi
 */
async function sendViaTwilio(phone, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('Twilio credentials not configured, using test mode');
    return { success: true, provider: 'twilio-test' };
  }

  try {
    const twilio = await import('twilio');
    const client = twilio.default(accountSid, authToken);

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: phone
    });

    return { success: true, provider: 'twilio', messageId: result.sid };
  } catch (error) {
    return { success: false, error: error.message, provider: 'twilio' };
  }
}

/**
 * Turkcell SMS gönderimi (örnek - gerçek API dokümantasyonuna göre güncellenmeli)
 */
async function sendViaTurkcell(phone, message) {
  // Turkcell API entegrasyonu buraya eklenecek
  console.log(`[Turkcell SMS] To: ${phone}, Message: ${message}`);
  return { success: true, provider: 'turkcell-test' };
}

/**
 * Türk Telekom SMS gönderimi (örnek - gerçek API dokümantasyonuna göre güncellenmeli)
 */
async function sendViaTurkTelekom(phone, message) {
  // Türk Telekom API entegrasyonu buraya eklenecek
  console.log(`[Turk Telekom SMS] To: ${phone}, Message: ${message}`);
  return { success: true, provider: 'turktelekom-test' };
}

