import "server-only";
import { prismaResidentRepository } from "../infrastructure/prisma-resident-repository";
import { createResidentUseCases } from "./use-cases";

export const residentUseCases = createResidentUseCases(prismaResidentRepository);
