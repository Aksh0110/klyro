import {
  InvoiceStatusType,
  InvoiceSourceType,
  PaymentMethodType,
  PaymentStatusType,
} from '@klyro/config';
import { ICustomer } from './customer';
import { ICustomerMembership } from './customer-membership';

export interface IInvoice {
  _id: string;
  organizationId: string;
  branchId: string;
  customerId: string | ICustomer;
  membershipId?: string | ICustomerMembership;
  invoiceNumber: string;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  status: InvoiceStatusType;
  source: InvoiceSourceType;
  issuedAt: Date | string;
  dueAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IPayment {
  _id: string;
  organizationId: string;
  branchId: string;
  customerId: string | ICustomer;
  invoiceId: string | IInvoice;
  membershipId?: string | ICustomerMembership;
  amount: number;
  currency: string;
  method: PaymentMethodType;
  status: PaymentStatusType;
  reference?: string;
  notes?: string;
  paidAt: Date | string;
  recordedBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface FinancialSummary {
  totalCollected: number;
  totalOutstanding: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  partiallyPaidInvoiceCount: number;
}
