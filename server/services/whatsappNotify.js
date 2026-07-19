/**
 * WhatsApp notification service for new reservations.
 *
 * Supports:
 *  1) Meta WhatsApp Cloud API (official) — preferred
 *  2) Twilio WhatsApp API — alternative
 *
 * Configure via .env (see .env.example). Failures are logged and never
 * block reservation creation.
 */

const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  // Morocco local 06... → 2126...
  if (digits.startsWith('0') && digits.length === 10) return `212${digits.slice(1)}`;
  return digits;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('en-GB', { hour12: false });
};

export const buildReservationWhatsAppMessage = ({
  reservationId,
  customerName,
  customerPhone,
  customerEmail,
  vehicle,
  pickupLocation,
  returnLocation,
  pickupDate,
  returnDate,
  price,
  priceBreakdown,
  currency = 'MAD',
  notes = '',
}) => {
  const lines = [
    '🚗 *New Car Reservation*',
    '',
    `*Reservation ID:* ${reservationId || '—'}`,
    `*Customer:* ${customerName || '—'}`,
    `*Phone:* ${customerPhone || '—'}`,
    `*Email:* ${customerEmail || '—'}`,
    `*Vehicle:* ${vehicle || '—'}`,
    `*Pickup location:* ${pickupLocation || '—'}`,
    `*Drop-off location:* ${returnLocation || '—'}`,
    `*Pickup:* ${formatDateTime(pickupDate)}`,
    `*Return:* ${formatDateTime(returnDate)}`,
  ];

  if (priceBreakdown && typeof priceBreakdown === 'object') {
    lines.push(
      `*Rental:* ${currency}${priceBreakdown.rentalPrice ?? '—'}`,
      `*Pickup delivery fee:* ${currency}${priceBreakdown.pickupDeliveryFee ?? 0}`,
      `*Drop-off delivery fee:* ${currency}${priceBreakdown.dropoffDeliveryFee ?? 0}`,
    );
    if ((priceBreakdown.discountTotal || 0) > 0) {
      lines.push(`*Discounts:* -${currency}${priceBreakdown.discountTotal}`);
    }
    lines.push(`*Total price:* ${currency}${priceBreakdown.total ?? price ?? '—'}`);
  } else {
    lines.push(`*Total price:* ${currency}${price ?? '—'}`);
  }

  lines.push(`*Notes:* ${notes?.trim() ? notes.trim() : 'None'}`);
  return lines.join('\n');
};

const sendViaMetaCloud = async (to, body, reservation = {}) => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  const templateLang = process.env.WHATSAPP_TEMPLATE_LANG || 'en';

  if (!token || !phoneNumberId) {
    throw new Error('Meta WhatsApp credentials missing (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)');
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Prefer approved template for production outbound alerts (Meta policy)
  if (templateName) {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLang },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: String(reservation.reservationId || '—') },
              { type: 'text', text: String(reservation.customerName || '—') },
              { type: 'text', text: String(reservation.customerPhone || '—') },
              { type: 'text', text: String(reservation.customerEmail || '—') },
              { type: 'text', text: String(reservation.vehicle || '—') },
              { type: 'text', text: String(reservation.pickupLocation || '—') },
              { type: 'text', text: String(reservation.returnLocation || '—') },
              { type: 'text', text: formatDateTime(reservation.pickupDate) },
              { type: 'text', text: formatDateTime(reservation.returnDate) },
              { type: 'text', text: String(`${reservation.currency || 'MAD'}${reservation.price ?? '—'}`) },
              { type: 'text', text: String(reservation.notes?.trim() || 'None') },
            ],
          },
        ],
      },
    };

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Fall through to free-form text if template fails (e.g. open session)
      console.warn('WhatsApp template send failed, trying text:', data?.error?.message || res.status);
    } else {
      return { provider: 'meta', mode: 'template', data };
    }
  }

  const textPayload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { preview_url: false, body },
  };

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(textPayload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Meta WhatsApp API error (${res.status})`);
  }
  return { provider: 'meta', mode: 'text', data };
};

const sendViaTwilio = async (to, body) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886

  if (!sid || !token || !from) {
    throw new Error('Twilio WhatsApp credentials missing');
  }

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const params = new URLSearchParams({
    From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    To: `whatsapp:+${to}`,
    Body: body,
  });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Twilio WhatsApp API error (${res.status})`);
  }
  return { provider: 'twilio', mode: 'text', data };
};

/**
 * Notify agency WhatsApp number about a new reservation.
 * Never throws to callers — returns { success, ... }.
 */
export const notifyNewReservationWhatsApp = async (reservation) => {
  const enabled = String(process.env.WHATSAPP_ENABLED || '').toLowerCase() === 'true';
  if (!enabled) {
    return { success: false, skipped: true, reason: 'WHATSAPP_ENABLED is not true' };
  }

  if (!process.env.WHATSAPP_TO) {
    return { success: false, skipped: true, reason: 'WHATSAPP_TO is not configured' };
  }

  const to = normalizePhone(process.env.WHATSAPP_TO);
  if (!to) {
    return { success: false, skipped: true, reason: 'WHATSAPP_TO is invalid' };
  }
  const currency = process.env.WHATSAPP_CURRENCY || process.env.CURRENCY || 'MAD';
  const body = buildReservationWhatsAppMessage({ ...reservation, currency });
  const provider = (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase();

  try {
    let result;
    if (provider === 'twilio') {
      result = await sendViaTwilio(to, body);
    } else {
      result = await sendViaMetaCloud(to, body, { ...reservation, currency });
    }
    console.log(`WhatsApp notification sent via ${result.provider} (${result.mode}) to +${to}`);
    return { success: true, to, ...result };
  } catch (error) {
    console.error('WhatsApp notification failed:', error.message);
    return { success: false, to, error: error.message };
  }
};

export default notifyNewReservationWhatsApp;
