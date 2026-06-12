'use client';

import { Turnstile } from '@marsidev/react-turnstile';

interface Props {
  onSuccess: (token: string) => void;
  onExpire?: () => void;
}

export function TurnstileWidget({ onSuccess, onExpire }: Props) {
  return (
    <div className="flex justify-center">
      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        onSuccess={onSuccess}
        onExpire={onExpire}
        options={{ theme: 'dark' }}
      />
    </div>
  );
}
