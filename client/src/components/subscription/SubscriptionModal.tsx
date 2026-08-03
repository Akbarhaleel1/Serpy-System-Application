import React, { useState } from 'react';
import { Check, Shield, Headphones, Users, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { loadRazorpayScript, openRazorpayPayment, createRazorpayOrder, verifyPayment } from '@/lib/razorpay';

const plans = [
  {
    name: 'STARTER',
    price: '₹2,499',
    period: '/mo',
    subtitle: 'Up to 1,000 invoices per month',
    features: [
      'Full job management',
      'Inventory with SKU & HS Codes',
      'Quotation & invoicing',
      'Email & WhatsApp delivery',
      'Invoice-to-task conversion',
      'Admin + 2 staff logins',
      'Analytics dashboard',
      'Standard reports',
    ],
    popular: false,
    cta: 'Subscribe Now',
    ctaStyle: 'outline',
  },
  {
    name: 'GROWTH',
    price: '₹4,999',
    period: '/mo',
    subtitle: 'Up to 5,000 invoices per month',
    features: [
      'Everything in Starter',
      'Manager login tier',
      'Advanced task allocation',
      'Priority WhatsApp support',
      'Custom report builder',
      'Unlimited staff logins',
      'Bulk invoice export',
      'Performance analytics',
    ],
    popular: true,
    cta: 'Subscribe Now',
    ctaStyle: 'solid',
  },
  {
    name: 'ENTERPRISE',
    price: '₹9,999',
    period: '/mo',
    subtitle: 'Unlimited invoices per month',
    features: [
      'Everything in Growth',
      'Unlimited invoices',
      'Dedicated account manager',
      'White-label option',
      'API access',
      'Custom onboarding',
      'SLA guarantee',
      'Multi-location support',
    ],
    popular: false,
    cta: 'Contact Sales',
    ctaStyle: 'outline',
  },
];

export function SubscriptionModal({ open, onClose, userPlan = 'free', onPaymentSuccess }) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubscribe = async (planName: string) => {
    if (planName === 'ENTERPRISE') {
      // For Enterprise plan, open contact form or show contact info
      toast({
        title: "Contact Sales",
        description: "Please contact our sales team for Enterprise plan pricing",
      });
      return;
    }

    setLoadingPlan(planName);
    
    try {
      // Get plan pricing
      const planPrices: Record<string, number> = {
        'STARTER': 2499,
        'GROWTH': 4999,
        'ENTERPRISE': 9999,
      };

      const amount = planPrices[planName];
      
      // Create Razorpay order
      const order = await createRazorpayOrder({
        planName,
        amount,
        currency: 'INR',
        userId: 'current-user', // Replace with actual user ID
      });

      // Close this Radix dialog before opening Razorpay. While a modal Radix Dialog
      // is open it traps focus and sets `pointer-events: none` on the page body, which
      // blocks typing/clicking inside Razorpay's checkout iframe (appended to <body>).
      setLoadingPlan(null);
      onClose();

      // Open Razorpay payment modal — use the SAME key the backend created the order with
      await openRazorpayPayment({
        key: order.keyId || '',
        amount: order.amount,
        currency: 'INR',
        name: 'ERP Subscription',
        description: `${planName} Plan Subscription`,
        order_id: order.orderId,
        handler: async (response) => {
          try {
            // Verify payment — this also activates the subscription on the backend
            const verification = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planName,
            });

            if (verification.success) {
              toast({
                title: "Payment Successful!",
                description: `Your ${planName} subscription is now active.`,
              });

              // Refresh the user so the subscription gate updates and the
              // modal does not reappear (now or after a page refresh).
              if (onPaymentSuccess) {
                await onPaymentSuccess();
              }

              onClose();
            } else {
              toast({
                title: "Payment Verification Failed",
                description: "There was an issue verifying your payment. Please contact support.",
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast({
              title: "Payment Error",
              description: "There was an error processing your payment. Please try again.",
              variant: "destructive",
            });
          } finally {
            setLoadingPlan(null);
          }
        },
        prefill: {
          name: 'John Doe', // Replace with actual user name
          email: 'john@example.com', // Replace with actual user email
          contact: '9999999999', // Replace with actual user phone
        },
        notes: {
          planName,
          userId: 'current-user', // Replace with actual user ID
        },
        theme: {
          color: '#e8735a',
        },
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "There was an error initiating the payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="p-0 border-0 overflow-hidden"
        style={{
          maxWidth: '900px',
          width: '95vw',
          maxHeight: '95vh',
          background: '#111111',
          borderRadius: '16px',
          boxShadow: '0 25px 80px rgba(0,0,0,0.7)',
          fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');

          .pricing-modal * {
            font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
            box-sizing: border-box;
          }

          .pricing-modal {
            pointer-events: auto !important;
            position: relative;
            z-index: 100;
          }

          [data-radix-dialog-content] {
            pointer-events: auto !important;
          }

          [data-radix-dialog-overlay] {
            pointer-events: none !important;
          }

          /* Hide the shadcn close button */
          .pricing-modal ~ button[data-radix-dialog-close],
          .pricing-modal [data-radix-dialog-close] {
            display: none !important;
          }

          .plan-card {
            background: #1e1e1e;
            border-radius: 12px;
            padding: 28px 24px 24px;
            border: 1px solid #2a2a2a;
            flex: 1;
            display: flex;
            flex-direction: column;
            position: relative;
            transition: transform 0.2s ease;
          }

          .plan-card:hover {
            transform: translateY(-2px);
          }

          .plan-card.popular {
            background: #e8735a;
            border: none;
          }

          .popular-badge {
            position: absolute;
            top: -14px;
            left: 50%;
            transform: translateX(-50%);
            background: #f5f0ea;
            color: #1a1a1a;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            padding: 5px 14px;
            border-radius: 20px;
            white-space: nowrap;
          }

          .plan-name {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.1em;
            color: #888;
            margin-bottom: 12px;
          }

          .plan-card.popular .plan-name {
            color: rgba(255,255,255,0.75);
          }

          .plan-price-row {
            display: flex;
            align-items: baseline;
            gap: 2px;
            margin-bottom: 4px;
          }

          .plan-currency {
            font-size: 28px;
            font-weight: 800;
            color: #fff;
            line-height: 1;
            margin-top: 4px;
          }

          .plan-amount {
            font-size: 52px;
            font-weight: 900;
            color: #fff;
            line-height: 1;
            letter-spacing: -2px;
          }

          .plan-period {
            font-size: 18px;
            font-weight: 500;
            color: #aaa;
            align-self: flex-end;
            margin-bottom: 4px;
          }

          .plan-card.popular .plan-currency,
          .plan-card.popular .plan-amount {
            color: #fff;
          }

          .plan-card.popular .plan-period {
            color: rgba(255,255,255,0.65);
          }

          .plan-subtitle {
            font-size: 12.5px;
            color: #666;
            margin-bottom: 20px;
            font-weight: 400;
          }

          .plan-card.popular .plan-subtitle {
            color: rgba(255,255,255,0.65);
          }

          .divider {
            height: 1px;
            background: #2e2e2e;
            margin-bottom: 20px;
          }

          .plan-card.popular .divider {
            background: rgba(255,255,255,0.2);
          }

          .feature-list {
            list-style: none;
            padding: 0;
            margin: 0 0 24px 0;
            display: flex;
            flex-direction: column;
            gap: 10px;
            flex: 1;
          }

          .feature-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            font-size: 13.5px;
            color: #ccc;
            font-weight: 400;
            line-height: 1.4;
          }

          .plan-card.popular .feature-item {
            color: rgba(255,255,255,0.9);
          }

          .check-icon {
            color: #888;
            flex-shrink: 0;
            margin-top: 1px;
          }

          .plan-card.popular .check-icon {
            color: rgba(255,255,255,0.8);
          }

          .cta-btn {
            width: 100%;
            padding: 13px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s ease;
            letter-spacing: 0.01em;
          }

          .cta-btn.outline {
            background: transparent;
            border: 1.5px solid #3a3a3a;
            color: #fff;
          }

          .cta-btn.outline:hover {
            background: #2a2a2a;
            border-color: #555;
          }

          .cta-btn.solid {
            background: #111;
            border: none;
            color: #fff;
          }

          .cta-btn.solid:hover {
            background: #000;
          }

          .modal-scroll {
            overflow-y: auto;
            max-height: 95vh;
          }

          .modal-scroll::-webkit-scrollbar {
            width: 4px;
          }
          .modal-scroll::-webkit-scrollbar-track {
            background: #1a1a1a;
          }
          .modal-scroll::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 4px;
          }
        `}</style>

        <div className="pricing-modal modal-scroll" style={{ padding: '40px 32px 32px' }}>
          {/* Header */}
          <DialogTitle asChild>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h1 style={{
                fontSize: '36px',
                fontWeight: '900',
                color: '#fff',
                letterSpacing: '-1px',
                lineHeight: 1.15,
                margin: 0,
              }}>
                Simple pricing. No surprises.
              </h1>
            </div>
          </DialogTitle>
          <DialogDescription asChild>
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <p style={{
                fontSize: '14px',
                color: '#777',
                margin: 0,
              }}>
                Cancel anytime. All plans include full feature access.
              </p>
            </div>
          </DialogDescription>

          {/* Plans */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>
            {plans.map((plan) => {
              const isCurrentPlan = plan.name.toLowerCase() === userPlan.toLowerCase();
              return (
                <div key={plan.name} className={`plan-card${plan.popular ? ' popular' : ''}`}>
                  {plan.popular && (
                    <div className="popular-badge">MOST POPULAR</div>
                  )}

                  <div className="plan-name">{plan.name}</div>

                  <div className="plan-price-row">
                    <span className="plan-currency">₹</span>
                    <span className="plan-amount">{plan.price.replace('₹', '')}</span>
                    <span className="plan-period">{plan.period}</span>
                  </div>

                  <div className="plan-subtitle">{plan.subtitle}</div>

                  <div className="divider" />

                  <ul className="feature-list">
                    {plan.features.map((f, i) => (
                      <li key={i} className="feature-item">
                        <Check className="check-icon" size={14} strokeWidth={2.5} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`cta-btn ${plan.ctaStyle}`}
                    onClick={() => handleSubscribe(plan.name)}
                    disabled={isCurrentPlan || loadingPlan === plan.name}
                  >
                    {loadingPlan === plan.name ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Processing...
                      </>
                    ) : isCurrentPlan ? 'Current Plan' : plan.cta}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            marginTop: '28px',
            display: 'flex',
            justifyContent: 'center',
            gap: '32px',
            flexWrap: 'wrap',
          }}>
            {[
              { icon: Shield, label: '30-day free trial' },
              { icon: Headphones, label: 'Support 24/7' },
              { icon: Users, label: 'No setup fee' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#555', fontSize: '12.5px' }}>
                <Icon size={14} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Preview wrapper
export default function App() {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button
        onClick={() => setOpen(true)}
        style={{ background: '#e8735a', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
      >
        Open Pricing Modal
      </button>
      <SubscriptionModal open={open} onClose={() => setOpen(false)} userPlan="free" canClose={false} />
    </div>
  );
}