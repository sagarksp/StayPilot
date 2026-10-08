export type WorkspaceDestination = Readonly<{
  organizationId: string;
  area: "staff" | "resident";
}>;

export interface WorkspaceAccessRepository {
  findWorkspaceDestination(email: string): Promise<WorkspaceDestination | null>;
  hasActiveOrganization(email: string): Promise<boolean>;
}

export function createWorkspaceAccessUseCases(repository: WorkspaceAccessRepository) {
  function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  return {
    getDestination(email: string) {
      return repository.findWorkspaceDestination(normalizeEmail(email));
    },

    hasActiveOrganization(email: string) {
      return repository.hasActiveOrganization(normalizeEmail(email));
    },
  };
}
