import { AccessDeniedError, type OrganizationActor } from "@/modules/property/domain/inventory";
import { z } from "zod";
import type { ReservationRepository } from "./repository";
import { createReservationSchema, type CreateReservationData } from "./schemas";
import { rentTermsSchema, type RentTermsInput } from "@/modules/billing/application/schemas";
import { ReservationWorkflowError } from "../domain/reservation";

function assertStaff(actor: OrganizationActor) {
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) throw new AccessDeniedError();
}
function propertyScope(actor: OrganizationActor) { return actor.roles.includes("OWNER") ? undefined : actor.allowedPgIds; }
function today(timezone: string) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function createReservationUseCases(repository: ReservationRepository) {
  return {
    async listReservations(actor: OrganizationActor) { assertStaff(actor); return repository.listReservations(actor.organizationId, propertyScope(actor)); },
    async listCandidates(actor: OrganizationActor) { assertStaff(actor); return repository.listCandidates(actor.organizationId, propertyScope(actor)); },
    async getOverview(actor: OrganizationActor) { assertStaff(actor); return repository.getOverview(actor.organizationId, today(actor.organizationTimezone), propertyScope(actor)); },
    async expireReservations(actor: OrganizationActor) { assertStaff(actor); return repository.expireReservations(actor.organizationId, today(actor.organizationTimezone), propertyScope(actor)); },
    async createReservation(actor: OrganizationActor, input: CreateReservationData) {
      assertStaff(actor);
      const parsed = createReservationSchema.parse(input);
      if (parsed.reservationStartDate < today(actor.organizationTimezone)) throw new ReservationWorkflowError("RESERVATION_START_IN_PAST");
      try { return await repository.createReservation(actor.organizationId, actor.userId, today(actor.organizationTimezone), parsed, propertyScope(actor)); }
      catch (error) { if (dbCode(error) === "P2002") throw new ReservationWorkflowError("ACTIVE_RESERVATION_EXISTS"); throw error; }
    },
    async cancelReservation(actor: OrganizationActor, reservationId: string, reason: string) {
      assertStaff(actor);
      const parsedReason = z.string().trim().max(500).parse(reason);
      await repository.cancelReservation(actor.organizationId, actor.userId, reservationId, parsedReason, propertyScope(actor));
    },
    async moveIn(actor: OrganizationActor, reservationId: string, date: string, rentInput: RentTermsInput) {
      assertStaff(actor);
      const moveInDate = z.iso.date().parse(date || today(actor.organizationTimezone));
      if (moveInDate > today(actor.organizationTimezone)) throw new ReservationWorkflowError("MOVE_IN_IN_FUTURE");
      const rent = rentTermsSchema.parse(rentInput);
      await repository.moveIn(actor.organizationId, reservationId, moveInDate, rent, propertyScope(actor));
    },
  };
}
function dbCode(error: unknown) { return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : null; }
