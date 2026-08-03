import { BASE_URL } from './apiClient';

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id?: string;
  handler: (response: any) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => any;
  }
}

export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if script is already loaded
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    
    script.onload = () => {
      resolve(true);
    };
    
    script.onerror = () => {
      resolve(false);
    };
    
    document.body.appendChild(script);
  });
};

export const openRazorpayPayment = async (options: RazorpayOptions): Promise<void> => {
  const isScriptLoaded = await loadRazorpayScript();
  
  if (!isScriptLoaded) {
    throw new Error('Failed to load Razorpay SDK');
  }
  
  if (!window.Razorpay) {
    throw new Error('Razorpay SDK not loaded');
  }

  if (!options.key) {
    // Must match the key the backend used to create the order, otherwise checkout fails
    throw new Error('Razorpay key is missing. The server did not return a keyId for this order.');
  }

  const razorpay = new window.Razorpay({
    ...options,
    theme: {
      color: options.theme?.color || '#3399cc',
    },
  });

  razorpay.open();
};

export const createRazorpayOrder = async (planData: {
  planName: string;
  amount: number;
  currency?: string;
  userId?: string;
}): Promise<{ orderId: string; amount: number; keyId?: string }> => {
  try {
    const response = await fetch(`${BASE_URL}/razorpay/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: planData.amount * 100, // Razorpay expects amount in paise
        currency: planData.currency || 'INR',
        receipt: `order_${planData.planName}_${Date.now()}`,
        notes: {
          planName: planData.planName,
          userId: planData.userId || 'guest',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      // Surface the backend's real reason (e.g. auth failed / not configured)
      throw new Error(data.message || data.error || 'Failed to create Razorpay order');
    }

    // Backend shape: { success, keyId, order: { id, amount, ... } }
    return {
      orderId: data.order?.id,
      amount: data.order?.amount,
      keyId: data.keyId,
    };
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
};

export const verifyPayment = async (paymentData: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  planName?: string;
}): Promise<{ success: boolean; subscription?: any }> => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/razorpay/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Payment verification failed');
    }

    return result;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};
