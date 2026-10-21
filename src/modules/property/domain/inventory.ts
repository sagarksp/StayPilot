export type StaffRole = "OWNER" | "MANAGER" | "RESIDENT";

export type OrganizationActor = Readonly<{
  userId: string;
  userName: string;
  userEmail?: string;
  organizationId: string;
  organizationName: string;
  organizationTimezone: string;
  propertyCount: number;
  roles: readonly StaffRole[];
  /** An empty list means no assigned PGs for a manager. */
  allowedPgIds: readonly string[];
  /** Staff access is limited to active PGs (and manager assignments). */
  activePgIds: readonly string[];
}>;

export type PropertySummary = Readonly<{
  id: string;
  name: string;
  code: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  createdAt: Date;
  floorCount: number;
  roomCount: number;
  bedCount: number;
}>;

export type FloorSummary = Readonly<{
  id: string;
  propertyId: string;
  name: string;
  number: number | null;
}>;

export type RoomSummary = Readonly<{
  id: string;
  propertyId: string;
  floorId: string;
  number: string;
  status: "ACTIVE" | "MAINTENANCE" | "INACTIVE" | "ARCHIVED";
  bedCount: number;
}>;

export type BedSummary = Readonly<{
  id: string;
  propertyId: string;
  roomId: string;
  label: string;
  status: "ACTIVE" | "MAINTENANCE" | "INACTIVE";
}>;

export class AccessDeniedError extends Error {
  constructor() {
    super("You do not have permission to manage this property inventory.");
    this.name = "AccessDeniedError";
  }
}

export function canReadProperty(actor: OrganizationActor, propertyId: string) {
  if (actor.roles.includes("OWNER")) return actor.activePgIds.includes(propertyId);
  return actor.roles.includes("MANAGER") && actor.activePgIds.includes(propertyId);
}

export function assertCanReadProperty(actor: OrganizationActor, propertyId: string) {
  if (!canReadProperty(actor, propertyId)) throw new AccessDeniedError();
}

export function assertCanManageInventory(actor: OrganizationActor, propertyId?: string) {
  if (actor.roles.includes("OWNER") && (!propertyId || actor.activePgIds.includes(propertyId))) return;
  if (
    propertyId &&
    actor.roles.includes("MANAGER") &&
    actor.activePgIds.includes(propertyId)
  ) {
    return;
  }
  throw new AccessDeniedError();
}
