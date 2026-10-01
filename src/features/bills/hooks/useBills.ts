import { useMutation, useQuery } from '@tanstack/react-query';
import { addMonths } from '@/lib/dates';
import { refreshAll } from '@/lib/queryClient';
import { createBill, deleteBill, listBills, listPayments, payBill, unpayBill, updateBill, type BillInput } from '../api';
import { occurrencesForMonth, type BillOccurrence } from '../schedule';

export function useBillList() {
  return useQuery({ queryKey: ['bills'], queryFn: listBills });
}

/**
 * Ocorrências dos meses [month − monthsBack, month].
 * monthsBack > 0 é usado no Início para mostrar contas vencidas de meses anteriores.
 */
export function useBillOccurrences(month: Date, monthsBack = 0) {
  const bills = useBillList();
  const first = addMonths(month, -monthsBack);
  const payments = useQuery({
    queryKey: ['bill-payments', first.getTime(), month.getTime()],
    queryFn: () => listPayments(first, month),
  });

  let data: BillOccurrence[] | undefined;
  if (bills.data && payments.data) {
    data = [];
    for (let i = monthsBack; i >= 0; i--) {
      data.push(...occurrencesForMonth(bills.data, payments.data, addMonths(month, -i)));
    }
  }

  return { data, isPending: bills.isPending || payments.isPending, error: bills.error ?? payments.error };
}

export function useSaveBill() {
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: BillInput }) => {
      if (id) await updateBill(id, input);
      else await createBill(input);
    },
    onSuccess: refreshAll,
  });
}

export function useDeleteBill() {
  return useMutation({ mutationFn: deleteBill, onSuccess: refreshAll });
}

export function usePayBill() {
  return useMutation({
    mutationFn: (v: { billId: string; month: Date; accountId: string; paidOn: string }) => payBill(v.billId, v.month, v.accountId, v.paidOn),
    onSuccess: refreshAll,
  });
}

export function useUnpayBill() {
  return useMutation({
    mutationFn: (v: { billId: string; month: Date }) => unpayBill(v.billId, v.month),
    onSuccess: refreshAll,
  });
}
