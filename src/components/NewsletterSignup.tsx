import React, { useState } from 'react';
import { SiteSettings } from '../types/editorial';

interface NewsletterSignupProps {
  siteSettings: SiteSettings;
  source?: string;
  compact?: boolean;
}

export const NewsletterSignup: React.FC<NewsletterSignupProps> = ({
  siteSettings,
  source = 'homepage',
  compact = false,
}) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Subscription failed.');
      }
      setStatus('success');
      setMessage(data.message || 'Subscribed to WORLDPULSE.');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Unable to subscribe right now.');
    }
  };

  return (
    <section
      id="newsletter"
      aria-label="Newsletter Signup"
      className={`bg-white border border-[#E7E5E2] ${compact ? 'p-5' : 'p-6 sm:p-8'}`}
    >
      <div className="max-w-2xl">
        <span className="text-xs font-bold uppercase tracking-widest text-[#6E1723]">
          WORLDPULSE DAILY DISPATCH
        </span>
        <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#171717] mt-1">
          {siteSettings.newsletter?.title || 'Stay informed.'}
        </h2>
        <p className="text-sm sm:text-base text-[#6B6B6B] mt-1.5">
          {siteSettings.newsletter?.description ||
            "Get the world's important stories in your inbox."}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col sm:flex-row gap-2.5">
          <label htmlFor={`nl-email-${source}`} className="sr-only">
            Your email address
          </label>
          <input
            id={`nl-email-${source}`}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            className="flex-1 px-3.5 py-2.5 text-sm bg-[#F7F5F2] border border-[#E7E5E2] text-[#171717] focus:outline-none focus:border-[#6E1723]"
          />
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#6E1723] text-white hover:bg-[#4A0F18] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            {status === 'submitting' ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>

        {message && (
          <p
            className={`mt-2.5 text-xs font-medium ${
              status === 'success' ? 'text-emerald-700' : 'text-[#8C2634]'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </section>
  );
};
