'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { updateBillingContactAction } from '../_actions';

/** 청구 연락처 편집 폼 — 담당자 · 청구 이메일 · 세금계산서 수신 이메일. */
export function BillingContactForm({
  initial,
}: {
  initial: { billingName: string; billingEmail: string; taxInvoiceEmail: string };
}): JSX.Element {
  const [billingName, setBillingName] = useState(initial.billingName);
  const [billingEmail, setBillingEmail] = useState(initial.billingEmail);
  const [taxInvoiceEmail, setTaxInvoiceEmail] = useState(initial.taxInvoiceEmail);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent): void {
    e.preventDefault();
    start(async () => {
      try {
        await updateBillingContactAction({
          billingName: billingName.trim() || null,
          billingEmail: billingEmail.trim() || null,
          taxInvoiceEmail: taxInvoiceEmail.trim() || null,
        });
        toast.success('청구 정보를 저장했습니다.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '저장 실패');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="bc-name">청구 담당자</Label>
          <Input
            id="bc-name"
            value={billingName}
            onChange={(e) => setBillingName(e.target.value)}
            placeholder="이름"
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-email">청구 이메일</Label>
          <Input
            id="bc-email"
            type="email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            placeholder="billing@company.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bc-tax">세금계산서 수신 이메일</Label>
          <Input
            id="bc-tax"
            type="email"
            value={taxInvoiceEmail}
            onChange={(e) => setTaxInvoiceEmail(e.target.value)}
            placeholder="tax@company.com (선택)"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="brand" size="sm" disabled={pending}>
          {pending ? '저장 중…' : '청구 정보 저장'}
        </Button>
      </div>
    </form>
  );
}
