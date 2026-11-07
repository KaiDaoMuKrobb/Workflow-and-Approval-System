import Link from 'next/link';
import { Inbox, ChevronRight } from 'lucide-react';

export interface QueueRequest {
  id: string;
  requestNumber: string;
  title: string;
  totalAmount: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  requester?: { id: string; name: string; department?: string } | null;
}

const STATUS_STYLES: Record<QueueRequest['status'], string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-800',
};

/**
 * The reviewer queue, rendered from data it is given.
 *
 * It performs no fetching of its own, which is what lets `AC-28` assert the empty
 * state directly instead of simulating a network response.
 */
export default function ReviewerQueue({ requests }: { requests: QueueRequest[] }) {
  if (requests.length === 0) {
    return (
      <div
        data-testid="reviewer-queue-empty"
        className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center"
      >
        <Inbox className="mb-3 h-10 w-10 text-slate-400" aria-hidden="true" />
        <p className="text-base font-medium text-slate-700">
          No requests are waiting for your review
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Requests assigned to you will appear here once they are submitted.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Request</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Title</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Requester</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-600">Total (THB)</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-600">Submitted</th>
            <th scope="col" className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {requests.map((request) => (
            <tr key={request.id} data-testid="reviewer-queue-row" className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                {request.requestNumber}
              </td>
              <td className="px-4 py-3 font-medium text-slate-900">{request.title}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {request.requester?.name ?? '—'}
              </td>
              {/* Rendered straight from the string the API sends. Converting to a
                  number here would discard the precision DEC-04 exists to protect. */}
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-slate-900">
                {request.totalAmount}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[request.status]}`}>
                  {request.status}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                {new Date(request.createdAt).toLocaleDateString('en-GB')}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <Link
                  href={`/requests/${request.id}`}
                  className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Open
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
