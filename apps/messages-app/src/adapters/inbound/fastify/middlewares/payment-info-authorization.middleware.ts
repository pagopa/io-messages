import { makeApimAuthorizationMiddleware } from "./apim-authorization.middleware.js";

const paymentInfoPermission = "ApiPaymentInfoRead";

export interface PaymentInfoAuthorizationContext {
  subscriptionId: string;
  userId: string;
}

export const makePaymentInfoAuthorizationMiddleware = () =>
  makeApimAuthorizationMiddleware<PaymentInfoAuthorizationContext>(
    ({ subscriptionId, userGroups, userId }) =>
      userGroups.includes(paymentInfoPermission)
        ? { subscriptionId, userId }
        : undefined,
  );
