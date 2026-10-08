import "server-only";
import { prismaPropertyRepository } from "../infrastructure/prisma-property-repository";
import { createPropertyUseCases } from "./use-cases";

export const propertyUseCases = createPropertyUseCases(prismaPropertyRepository);
