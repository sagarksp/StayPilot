import "server-only";
import { prismaComplaintRepository } from "../infrastructure/prisma-complaint-repository";
import { createComplaintUseCases } from "./use-cases";

export const complaintUseCases = createComplaintUseCases(prismaComplaintRepository);
