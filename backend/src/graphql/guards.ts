import { UnauthenticatedError } from "../auth/errors";
import { Context } from "./context";

export function requireUser(context: Pick<Context, 'userId'>): number {
  if (context.userId === null) {
    throw new UnauthenticatedError();
  }
  return context.userId;
}