import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/db/prisma";
import type {
  BedSummary,
  FloorSummary,
  PropertySummary,
  RoomSummary,
} from "../domain/inventory";
import type { PropertyRepository } from "../application/repository";
import type {
  CreateBedInput,
  CreateFloorInput,
  CreatePropertyInput,
  CreateRoomInput,
} from "../application/schemas";

const propertySelect = {
  publicId: true,
  name: true,
  code: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  postalCode: true,
  status: true,
  createdAt: true,
  _count: {
    select: {
      floors: { where: { status: { not: "ARCHIVED" } } },
      rooms: { where: { status: { not: "ARCHIVED" } } },
      beds: true,
    },
  },
} satisfies Prisma.PropertySelect;

type PropertyRecord = Prisma.PropertyGetPayload<{ select: typeof propertySelect }>;

function toPropertySummary(row: PropertyRecord): PropertySummary {
  return {
    id: row.publicId,
    name: row.name,
    code: row.code,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    status: row.status as PropertySummary["status"],
    createdAt: row.createdAt,
    floorCount: row._count.floors,
    roomCount: row._count.rooms,
    bedCount: row._count.beds,
  };
}

export const prismaPropertyRepository: PropertyRepository = {
  async listProperties(organizationId, propertyIds) {
    const rows = await prisma.property.findMany({
      where: {
        organization: { publicId: organizationId },
        ...(propertyIds ? { publicId: { in: [...propertyIds] } } : {}),
        status: { not: "ARCHIVED" },
      },
      select: propertySelect,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    return rows.map(toPropertySummary);
  },

  async getProperty(organizationId, propertyId) {
    const row = await prisma.property.findFirst({
      where: { organization: { publicId: organizationId }, publicId: propertyId },
      select: propertySelect,
    });
    return row ? toPropertySummary(row) : null;
  },

  async listFloors(organizationId, propertyId) {
    const rows = await prisma.floor.findMany({
      where: { organization: { publicId: organizationId }, property: { publicId: propertyId }, status: { not: "ARCHIVED" } },
      orderBy: [{ number: "asc" }, { name: "asc" }],
    });
    return rows.map((row): FloorSummary => ({
      id: row.publicId,
      propertyId,
      name: row.name,
      number: row.number,
    }));
  },

  async listRooms(organizationId, propertyId) {
    const rows = await prisma.room.findMany({
      where: { organization: { publicId: organizationId }, property: { publicId: propertyId }, status: { not: "ARCHIVED" } },
      include: { _count: { select: { beds: true } }, floor: { select: { publicId: true } } },
      orderBy: [{ floor: { number: "asc" } }, { number: "asc" }],
    });
    return rows.map((row): RoomSummary => ({
      id: row.publicId,
      propertyId,
      floorId: row.floor.publicId,
      number: row.number,
      status: row.status as RoomSummary["status"],
      bedCount: row._count.beds,
    }));
  },

  async listBeds(organizationId, propertyId) {
    const rows = await prisma.bed.findMany({
      where: { organization: { publicId: organizationId }, property: { publicId: propertyId } },
      include: { room: { select: { publicId: true } } },
      orderBy: [{ room: { number: "asc" } }, { label: "asc" }],
    });
    return rows.map((row): BedSummary => ({
      id: row.publicId,
      propertyId,
      roomId: row.room.publicId,
      label: row.label,
      status: row.status as BedSummary["status"],
    }));
  },

  async createProperty(organizationId, input: CreatePropertyInput) {
    const row = await prisma.property.create({
      data: {
        organization: { connect: { publicId: organizationId } },
        ...input,
      },
      select: propertySelect,
    });
    return toPropertySummary(row);
  },

  async createFloor(organizationId, propertyId, input: CreateFloorInput) {
    const property = await prisma.property.findFirstOrThrow({
      where: { organization: { publicId: organizationId }, publicId: propertyId },
      select: { id: true, organizationId: true },
    });
    const floor = await prisma.floor.create({
      data: {
        organizationId: property.organizationId,
        propertyId: property.id,
        name: input.name,
        number: input.number ?? null,
      },
    });
    return { id: floor.publicId, propertyId, name: floor.name, number: floor.number };
  },

  async createRoom(organizationId, propertyId, input: CreateRoomInput) {
    const property = await prisma.property.findFirstOrThrow({
      where: { organization: { publicId: organizationId }, publicId: propertyId },
      select: { id: true, organizationId: true },
    });
    const floor = await prisma.floor.findFirstOrThrow({
      where: { organizationId: property.organizationId, propertyId: property.id, publicId: input.floorId },
      select: { id: true },
    });
    const room = await prisma.room.create({
      data: {
        organizationId: property.organizationId,
        propertyId: property.id,
        floorId: floor.id,
        number: input.number,
      },
    });
    return { id: room.publicId, propertyId, floorId: input.floorId, number: room.number, status: "ACTIVE", bedCount: 0 };
  },

  async createBed(organizationId, propertyId, input: CreateBedInput) {
    const property = await prisma.property.findFirstOrThrow({
      where: { organization: { publicId: organizationId }, publicId: propertyId },
      select: { id: true, organizationId: true },
    });
    const room = await prisma.room.findFirstOrThrow({
      where: { organizationId: property.organizationId, propertyId: property.id, publicId: input.roomId },
      select: { id: true, floorId: true },
    });
    const bed = await prisma.bed.create({
      data: {
        organizationId: property.organizationId,
        propertyId: property.id,
        floorId: room.floorId,
        roomId: room.id,
        label: input.label,
      },
    });
    return { id: bed.publicId, propertyId, roomId: input.roomId, label: bed.label, status: "ACTIVE" };
  },
};
