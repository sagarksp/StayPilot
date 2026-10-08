import "server-only";
import { prismaReservationRepository } from "../infrastructure/prisma-reservation-repository";
import { createReservationUseCases } from "./use-cases";

export const reservationUseCases = createReservationUseCases(prismaReservationRepository);
